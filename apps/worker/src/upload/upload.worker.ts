import { logger } from '@summarise/logger';
import type { TakenJob, UploadQueue } from '@summarise/queue';
import type { Note, NoteRepository } from '@summarise/storage';

// A queue on a Redis connection of its own, and a way to close it.
export type OpenedQueue = { queue: UploadQueue; close: () => Promise<void> };

type UploadWorkerDeps = {
  // Called once per loop, plus once for recovery: `take` blocks its
  // connection, so loops can't share one.
  openQueue: () => Promise<OpenedQueue>;
  notes: NoteRepository;
  // The work for one uploaded note. `signal` fires when the lock is lost:
  // another worker may now run the note, so stop.
  handle: (note: Note, signal: AbortSignal) => Promise<void>;
  concurrency: number;
  workerId?: string;
  // How long `take` waits before checking whether to stop.
  takeTimeoutSeconds?: number;
  recoverEveryMs?: number;
};

// Runs `concurrency` loops that each take a job, run it, and take the next.
// A note is locked while it runs, so two copies of its job never run at once,
// and a job whose worker crashed is put back once its lock expires.
export function createUploadWorker({
  openQueue,
  notes,
  handle,
  concurrency,
  workerId = crypto.randomUUID(),
  takeTimeoutSeconds = 5,
  recoverEveryMs = 60_000,
}: UploadWorkerDeps) {
  let stopping = false;
  let opened: OpenedQueue[] = [];
  let loops: Promise<void>[] = [];
  let recoverTimer: NodeJS.Timeout | undefined;

  async function recover(queue: UploadQueue) {
    try {
      const noteIds = await queue.requeueOrphans();
      if (noteIds.length > 0) logger.info({ noteIds }, 'requeued upload jobs');
    } catch (error) {
      logger.error({ err: error }, 'upload job recovery failed');
    }
  }

  // `owner` is what this loop writes into a lock: unique per loop, so two
  // loops in this process can't renew or release each other's lock.
  async function loop(queue: UploadQueue, owner: string) {
    while (!stopping) {
      try {
        const job = await queue.take(takeTimeoutSeconds);
        if (job) await run(queue, job, owner);
      } catch (error) {
        // Redis is down. Wait a little rather than spin.
        logger.error({ err: error }, 'upload worker loop failed');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async function run(queue: UploadQueue, job: TakenJob, owner: string) {
    const { noteId } = job;
    if (!(await queue.lock(noteId, owner))) {
      // Another loop is running this note: this copy is a duplicate.
      await queue.drop(job);
      return;
    }
    const controller = new AbortController();
    function lose(message: string) {
      if (controller.signal.aborted) return;
      logger.warn({ noteId }, message);
      controller.abort();
    }
    let renewedAt = Date.now();
    // Three renews per lock time, so one slow renew doesn't lose the lock.
    const renewal = setInterval(() => {
      queue
        .renew(noteId, owner)
        .then((owned) => {
          if (owned) renewedAt = Date.now();
          else lose('lost upload job lock');
        })
        .catch((error: unknown) => {
          logger.error({ err: error, noteId }, 'upload job lock renew failed');
          // Redis is unreachable. Once a whole lock time has gone by without
          // a renew, the lock has expired anyway.
          if (Date.now() - renewedAt >= queue.lockMs) {
            lose('upload job lock expired');
          }
        });
    }, queue.lockMs / 3);
    try {
      const note = await notes.findById(noteId);
      // Deleted, or already done by an earlier copy of this job.
      if (note?.source !== 'upload' || note.status !== 'processing') {
        logger.info({ noteId }, 'skipped upload job');
        return;
      }
      await handle(note, controller.signal);
    } catch (error) {
      // Dropped for now; retries come later.
      logger.error({ err: error, noteId }, 'upload job failed');
    } finally {
      clearInterval(renewal);
      await queue.finish(job, owner);
    }
  }

  return {
    async start(): Promise<void> {
      stopping = false;
      const results = await Promise.allSettled(
        Array.from({ length: concurrency + 1 }, () => openQueue()),
      );
      const ready = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      for (const result of results) {
        if (result.status === 'rejected') {
          // Close the ones that did open, so they don't leak.
          await Promise.all(ready.map(({ close }) => close()));
          throw result.reason;
        }
      }
      opened = ready;
      const [recovery, ...loopQueues] = opened.map(({ queue }) => queue);
      await recover(recovery!);
      recoverTimer = setInterval(() => void recover(recovery!), recoverEveryMs);
      loops = loopQueues.map((queue, index) =>
        loop(queue, `${workerId}:${index}`),
      );
      logger.info({ workerId, concurrency }, 'upload worker started');
    },

    // Takes no new jobs, waits for the running ones, then closes the
    // connections.
    async stop(): Promise<void> {
      stopping = true;
      clearInterval(recoverTimer);
      await Promise.all(loops);
      await Promise.all(opened.map(({ close }) => close()));
      opened = [];
      loops = [];
      logger.info({ workerId }, 'upload worker stopped');
    },
  };
}

export type UploadWorker = ReturnType<typeof createUploadWorker>;
