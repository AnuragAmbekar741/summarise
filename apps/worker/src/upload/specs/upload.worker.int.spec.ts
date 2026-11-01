import { config } from '@summarise/config';
import { createRedisClient, createUploadQueue } from '@summarise/queue';
import {
  createDatabase,
  createNoteRepository,
  createUserRepository,
  type Note,
} from '@summarise/storage';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { createUploadWorker, type UploadWorker } from '../upload.worker';

// Runs against the real Postgres and Redis from .env. Every test uses Redis
// keys of its own, so the real worker never sees these jobs.
describe('upload worker', async () => {
  const db = createDatabase(config.DATABASE_URL);
  const notes = createNoteRepository(db);
  const redis = await createRedisClient(config.REDIS_URL);
  const user = await createUserRepository(db).create({
    name: 'Worker Test',
    email: `test+${crypto.randomUUID()}@example.com`,
  });
  const workers: UploadWorker[] = [];
  const prefixes: string[] = [];

  afterEach(async () => {
    await Promise.all(workers.splice(0).map((worker) => worker.stop()));
  });

  afterAll(async () => {
    for (const prefix of prefixes) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) await redis.del(keys);
    }
    await db.$client.query('delete from users where id = $1', [user.id]);
    await db.$client.end();
    await redis.close();
  });

  // Keys for one test, and a queue on the shared connection to look at them.
  function testKeys(lockMs = 60_000) {
    const prefix = `test:${crypto.randomUUID()}:`;
    prefixes.push(prefix);
    const options = {
      key: `${prefix}pending`,
      activeKey: `${prefix}active`,
      lockPrefix: `${prefix}lock:`,
      lockMs,
    };
    return { ...options, queue: createUploadQueue(redis, options) };
  }

  function startWorker(
    keys: ReturnType<typeof testKeys>,
    handle: (note: Note, signal: AbortSignal) => Promise<void>,
    // `renewFails`: every renew throws, as when Redis is unreachable.
    options: {
      concurrency?: number;
      workerId?: string;
      renewFails?: boolean;
    } = {},
  ) {
    const worker = createUploadWorker({
      async openQueue() {
        const connection = await createRedisClient(config.REDIS_URL);
        const queue = createUploadQueue(connection, keys);
        return {
          queue: options.renewFails
            ? {
                ...queue,
                async renew() {
                  throw new Error('redis unreachable');
                },
              }
            : queue,
          close: async () => void (await connection.close()),
        };
      },
      notes,
      handle,
      concurrency: options.concurrency ?? 2,
      workerId: options.workerId,
      takeTimeoutSeconds: 0.1,
      lockMs: keys.lockMs,
      renewEveryMs: 50,
      recoverEveryMs: 100,
    });
    workers.push(worker);
    return worker;
  }

  function uploadedNote() {
    return notes.create({
      userId: user.id,
      source: 'upload',
      status: 'processing',
    });
  }

  // A handler that keeps each job running until `release()`. `overlaps` gets
  // a note id whenever that note starts while it is already running.
  function heldHandler() {
    const running: string[] = [];
    const calls: string[] = [];
    const overlaps: string[] = [];
    const signals: AbortSignal[] = [];
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const handle = vi.fn(async (note: Note, signal: AbortSignal) => {
      calls.push(note.id);
      signals.push(signal);
      if (running.includes(note.id)) overlaps.push(note.id);
      running.push(note.id);
      await held;
      running.splice(running.indexOf(note.id), 1);
    });
    return { handle, running, calls, overlaps, signals, release };
  }

  async function listLengths(keys: ReturnType<typeof testKeys>) {
    return {
      pending: await redis.lLen(keys.key),
      active: await redis.lLen(keys.activeKey),
    };
  }

  it('runs a queued job once and clears it', async () => {
    const keys = testKeys();
    const note = await uploadedNote();
    const handle = vi.fn(async () => {});
    await keys.queue.push(note.id);

    await startWorker(keys, handle).start();

    await vi.waitFor(async () =>
      expect(await listLengths(keys)).toEqual({ pending: 0, active: 0 }),
    );
    expect(handle).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({ id: note.id }),
      expect.any(AbortSignal),
    );
    expect(await redis.exists(`${keys.lockPrefix}${note.id}`)).toBe(0);
  });

  it('runs at most `concurrency` jobs at once', async () => {
    const keys = testKeys();
    const held = heldHandler();
    for (const note of await Promise.all([1, 2, 3].map(uploadedNote))) {
      await keys.queue.push(note.id);
    }

    await startWorker(keys, held.handle, { concurrency: 2 }).start();

    await vi.waitFor(() => expect(held.running).toHaveLength(2));
    expect(await listLengths(keys)).toEqual({ pending: 1, active: 2 });
    held.release();
    await vi.waitFor(() => expect(held.calls).toHaveLength(3));
  });

  it('runs a note queued twice only once at a time', async () => {
    const keys = testKeys();
    const held = heldHandler();
    const note = await uploadedNote();
    await keys.queue.push(note.id);
    await keys.queue.push(note.id);

    await startWorker(keys, held.handle, { concurrency: 2 }).start();

    // The second copy is dropped while the first one holds the lock.
    await vi.waitFor(async () => {
      expect(held.calls).toEqual([note.id]);
      expect(await listLengths(keys)).toEqual({ pending: 0, active: 1 });
    });
    // Let several recovery passes (every 100ms) run before checking it
    // stayed that way: the lock is still held and nothing ran again.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(held.overlaps).toEqual([]);
    expect(held.calls).toEqual([note.id]);
    expect(await redis.exists(`${keys.lockPrefix}${note.id}`)).toBe(1);
    held.release();
    await vi.waitFor(async () =>
      expect(await listLengths(keys)).toEqual({ pending: 0, active: 0 }),
    );
  });

  it('skips a deleted note and a note no longer processing', async () => {
    const keys = testKeys();
    const handle = vi.fn(async () => {});
    const deleted = await uploadedNote();
    await notes.delete(deleted.id);
    const done = await notes.create({
      userId: user.id,
      source: 'upload',
      status: 'ready',
    });
    await keys.queue.push(deleted.id);
    await keys.queue.push(done.id);

    await startWorker(keys, handle).start();

    await vi.waitFor(async () =>
      expect(await listLengths(keys)).toEqual({ pending: 0, active: 0 }),
    );
    expect(handle).not.toHaveBeenCalled();
  });

  it('keeps going after a job fails', async () => {
    const keys = testKeys();
    const [failing, next] = await Promise.all([uploadedNote(), uploadedNote()]);
    const handled: string[] = [];
    await keys.queue.push(failing.id);
    await keys.queue.push(next.id);

    await startWorker(
      keys,
      async (note) => {
        if (note.id === failing.id) throw new Error('bad file');
        handled.push(note.id);
      },
      { concurrency: 1 },
    ).start();

    await vi.waitFor(() => expect(handled).toEqual([next.id]));
    await vi.waitFor(async () =>
      expect(await listLengths(keys)).toEqual({ pending: 0, active: 0 }),
    );
  });

  it('drops a malformed job', async () => {
    const keys = testKeys();
    const handle = vi.fn(async () => {});
    await redis.lPush(keys.key, 'not json');

    await startWorker(keys, handle).start();

    await vi.waitFor(async () =>
      expect(await listLengths(keys)).toEqual({ pending: 0, active: 0 }),
    );
    expect(handle).not.toHaveBeenCalled();
  });

  it('runs a job left active by a crashed worker', async () => {
    const keys = testKeys();
    const note = await uploadedNote();
    const handle = vi.fn(async () => {});
    // Taken, but its worker died before locking or finishing it.
    await redis.lPush(keys.activeKey, JSON.stringify({ noteId: note.id }));

    await startWorker(keys, handle).start();

    await vi.waitFor(() => expect(handle).toHaveBeenCalledOnce());
    await vi.waitFor(async () =>
      expect(await listLengths(keys)).toEqual({ pending: 0, active: 0 }),
    );
  });

  it('leaves a locked active job alone until its lock expires', async () => {
    const keys = testKeys(300);
    const note = await uploadedNote();
    await keys.queue.push(note.id);
    // Another worker takes and locks the job, then stops renewing (a crash).
    const job = await keys.queue.take(1);
    expect(await keys.queue.lock(note.id, 'crashed-worker')).toBe(true);

    expect(await keys.queue.requeueOrphans()).toEqual([]);
    expect(await listLengths(keys)).toEqual({ pending: 0, active: 1 });

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(await keys.queue.requeueOrphans()).toEqual([note.id]);
    expect(await listLengths(keys)).toEqual({ pending: 1, active: 0 });
    expect(job?.noteId).toBe(note.id);
  });

  it('keeps the lock while a job runs past the lock time', async () => {
    const keys = testKeys(150);
    const held = heldHandler();
    const note = await uploadedNote();
    await keys.queue.push(note.id);

    await startWorker(keys, held.handle).start();
    await vi.waitFor(() => expect(held.running).toEqual([note.id]));
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Renewed, so recovery has not put it back and the job was not stopped.
    expect(await listLengths(keys)).toEqual({ pending: 0, active: 1 });
    expect(held.calls).toEqual([note.id]);
    expect(held.signals[0]?.aborted).toBe(false);
    held.release();
  });

  it('tells the job to stop when its lock is taken over', async () => {
    const keys = testKeys();
    const held = heldHandler();
    const note = await uploadedNote();
    await keys.queue.push(note.id);
    await startWorker(keys, held.handle).start();
    await vi.waitFor(() => expect(held.running).toEqual([note.id]));

    // As if the lock expired and another worker locked the note.
    const lockKey = `${keys.lockPrefix}${note.id}`;
    await redis.set(lockKey, 'other-worker');

    await vi.waitFor(() => expect(held.signals[0]?.aborted).toBe(true));
    held.release();
    // Finishing leaves the other worker's lock alone.
    await vi.waitFor(async () =>
      expect(await listLengths(keys)).toEqual({ pending: 0, active: 0 }),
    );
    expect(await redis.get(lockKey)).toBe('other-worker');
  });

  it('tells the job to stop when Redis is unreachable for a lock time', async () => {
    const keys = testKeys(300);
    const held = heldHandler();
    const note = await uploadedNote();
    await keys.queue.push(note.id);
    await startWorker(keys, held.handle, { renewFails: true }).start();
    await vi.waitFor(() => expect(held.running).toEqual([note.id]));

    // Renews are failing, but the lock time has not gone by yet.
    expect(held.signals[0]?.aborted).toBe(false);

    await vi.waitFor(() => expect(held.signals[0]?.aborted).toBe(true));
    held.release();
  });

  it('finishes running jobs before stopping', async () => {
    const keys = testKeys();
    const held = heldHandler();
    const note = await uploadedNote();
    await keys.queue.push(note.id);
    const worker = startWorker(keys, held.handle);
    await worker.start();
    await vi.waitFor(() => expect(held.running).toEqual([note.id]));

    let stopped = false;
    const stopping = worker.stop().then(() => (stopped = true));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(stopped).toBe(false);

    held.release();
    await stopping;
    expect(held.running).toEqual([]);
    expect(await listLengths(keys)).toEqual({ pending: 0, active: 0 });
  });
});
