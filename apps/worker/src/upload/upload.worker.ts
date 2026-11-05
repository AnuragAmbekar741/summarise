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
  // The work for one uploaded note. `signal` fires when the job must stop:
  // its lock was lost (another worker may now run the note), or the worker
  // paused.
  handle: (note: Note, signal: AbortSignal) => Promise<void>;
  concurrency: number;
  workerId?: string;
  // How long `take` waits before checking whether to stop.
  takeTimeoutSeconds?: number;
  recoverEveryMs?: number;
  // An error from `handle` meaning the provider rejects our setup (the API
  // key, say): every job would fail the same way, so the worker pauses.
  isSetupError?: (error: unknown) => boolean;
  // Whether the provider accepts our setup now. Throws when it can't tell.
  checkSetup?: () => Promise<'ok' | 'rejected'>;
  // How often to check the setup while paused.
  checkEveryMs?: number;
};

// Fired on running jobs when the worker pauses.
const PAUSED = new Error('upload worker paused');

// Runs `concurrency` loops that each take a job, run it, and take the next.
// A note is locked while it runs, so two copies of its job never run at once,
// and a job whose worker crashed is put back once its lock expires.
//
// When the provider rejects our setup, the worker pauses instead of failing
// every job: it stops the running jobs, hands them back to the queue (their
// saved pieces are kept), takes no new ones, and checks the setup every
// `checkEveryMs` until it works. It never exits, so a platform restarting it
// can't turn a bad key into a restart loop.
export function createUploadWorker({
  openQueue,
  notes,
  handle,
  concurrency,
  workerId = crypto.randomUUID(),
  takeTimeoutSeconds = 5,
  recoverEveryMs = 60_000,
  isSetupError = () => false,
  checkSetup,
  checkEveryMs = 5 * 60 * 1000,
}: UploadWorkerDeps) {
  let stopping = false;
  let opened: OpenedQueue[] = [];
  let loops: Promise<void>[] = [];
  let recoverTimer: NodeJS.Timeout | undefined;
  // Each running job's controller, to stop them all when pausing.
  const running = new Set<AbortController>();
  // While paused: resolves when the worker resumes (or stops).
  let paused: { until: Promise<void>; resume: () => void } | undefined;
  let checkTimer: NodeJS.Timeout | undefined;

  function pause() {
    if (paused) return;
    let resume!: () => void;
    const until = new Promise<void>((resolve) => (resume = resolve));
    paused = { until, resume };
    logger.error(
      'speech-to-text rejected our setup; uploads paused until it works',
    );
    for (const controller of running) controller.abort(PAUSED);
    checkTimer = setInterval(() => void check(), checkEveryMs);
  }

  function resume() {
    clearInterval(checkTimer);
    paused?.resume();
    paused = undefined;
  }

  async function check() {
    try {
      if ((await checkSetup?.()) === 'ok') {
        logger.info('speech-to-text setup works again; uploads resumed');
        resume();
        return;
      }
      logger.error('speech-to-text still rejects our setup; uploads paused');
    } catch (error) {
      // Can't tell: stay paused and check again later.
      logger.warn({ err: error }, 'speech-to-text setup check failed');
    }
  }

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
      if (paused) {
        await paused.until;
        continue;
      }
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
    // Paused while this job was being taken: hand it straight back.
    if (paused) {
      await queue.putBack(job, owner);
      return;
    }
    const controller = new AbortController();
    running.add(controller);
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
    // Unfinished, to be carried on later: hand back instead of finishing.
    let handBack = false;
    try {
      const note = await notes.findById(noteId);
      // Deleted, or already done by an earlier copy of this job.
      if (note?.source !== 'upload' || note.status !== 'processing') {
        logger.info({ noteId }, 'skipped upload job');
        return;
      }
      await handle(note, controller.signal);
    } catch (error) {
      if (isSetupError(error)) {
        pause();
        handBack = true;
      } else if (controller.signal.reason === PAUSED) {
        handBack = true;
      } else {
        // Dropped for now; retries come later.
        logger.error({ err: error, noteId }, 'upload job failed');
      }
    } finally {
      clearInterval(renewal);
      running.delete(controller);
      if (handBack) await queue.putBack(job, owner);
      else await queue.finish(job, owner);
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
      // A setup known to be bad pauses before any job is taken. When the
      // check can't tell (no network), start anyway: jobs retry as usual.
      try {
        if ((await checkSetup?.()) === 'rejected') pause();
      } catch (error) {
        logger.warn({ err: error }, 'speech-to-text setup check failed');
      }
      const [recovery, ...loopQueues] = opened.map(({ queue }) => queue);
      await recover(recovery!);
      recoverTimer = setInterval(() => void recover(recovery!), recoverEveryMs);
      loops = loopQueues.map((queue, index) =>
        loop(queue, `${workerId}:${index}`),
      );
      logger.info(
        { workerId, concurrency, paused: Boolean(paused) },
        'upload worker started',
      );
    },

    // Takes no new jobs, waits for the running ones, then closes the
    // connections.
    async stop(): Promise<void> {
      stopping = true;
      clearInterval(recoverTimer);
      // Lets paused loops see `stopping` and end.
      resume();
      await Promise.all(loops);
      await Promise.all(opened.map(({ close }) => close()));
      opened = [];
      loops = [];
      logger.info({ workerId }, 'upload worker stopped');
    },
  };
}

export type UploadWorker = ReturnType<typeof createUploadWorker>;
