import { logger } from '@summarise/logger';

import type { RedisClient } from './redis.client';

// The Redis list uploaded notes wait on until the worker takes them.
export const UPLOAD_QUEUE_KEY = 'uploads:pending';
// Jobs a worker has taken and not finished yet.
export const UPLOAD_ACTIVE_KEY = 'uploads:active';
// `upload:lock:<noteId>` holds the id of the worker running that note.
export const UPLOAD_LOCK_PREFIX = 'upload:lock:';
// `upload:failures:<noteId>` counts the note's failed runs in a row.
export const UPLOAD_FAILURES_PREFIX = 'upload:failures:';
// A failure count is forgotten this long after the last failure.
const FAILURES_KEEP_MS = 24 * 60 * 60 * 1000;

export type UploadJob = { noteId: string };

// A job as taken: `raw` is the exact list entry, which `finish` needs to
// remove it.
export type TakenJob = UploadJob & { raw: string };

type UploadQueueOptions = {
  key?: string;
  activeKey?: string;
  lockPrefix?: string;
  failuresPrefix?: string;
  // How long a lock lasts without being renewed.
  lockMs?: number;
};

// Renews or releases a lock only while it still holds this worker's id, so a
// worker never touches a lock that expired and was taken by another.
const RENEW_IF_OWNED = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('pexpire', KEYS[1], ARGV[2])
end
return 0`;
const RELEASE_IF_OWNED = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0`;
// Moves an active job back to the front of the line, unless its note is
// locked (it is still running).
const REQUEUE_IF_UNLOCKED = `
if redis.call('exists', KEYS[3]) == 1 then return 0 end
if redis.call('lrem', KEYS[2], 1, ARGV[1]) == 0 then return 0 end
redis.call('rpush', KEYS[1], ARGV[1])
return 1`;
// Moves a running job back to the front of the line and releases its lock,
// as long as the lock is still this worker's (else another one runs it now).
const PUT_BACK_IF_OWNED = `
if redis.call('get', KEYS[3]) ~= ARGV[2] then return 0 end
if redis.call('lrem', KEYS[2], 1, ARGV[1]) == 1 then
  redis.call('rpush', KEYS[1], ARGV[1])
end
redis.call('del', KEYS[3])
return 1`;

// A plain Redis list used as a queue: jobs go in at the head (LPUSH) and the
// worker takes them from the tail, so the oldest job goes first. Tests pass
// their own keys so their jobs never reach the real worker.
export function createUploadQueue(
  redis: RedisClient,
  {
    key = UPLOAD_QUEUE_KEY,
    activeKey = UPLOAD_ACTIVE_KEY,
    lockPrefix = UPLOAD_LOCK_PREFIX,
    failuresPrefix = UPLOAD_FAILURES_PREFIX,
    lockMs = 60_000,
  }: UploadQueueOptions = {},
) {
  const lockKey = (noteId: string) => `${lockPrefix}${noteId}`;
  const failuresKey = (noteId: string) => `${failuresPrefix}${noteId}`;

  return {
    // Exposed so the worker renews well within it.
    lockMs,

    async push(noteId: string): Promise<void> {
      const job: UploadJob = { noteId };
      await redis.lPush(key, JSON.stringify(job));
    },

    // Waits up to `timeoutSeconds` for a job and moves it to the active list
    // in the same step, so a crash can't lose it. Blocks the connection while
    // waiting: give each caller a connection of its own.
    async take(timeoutSeconds: number): Promise<TakenJob | undefined> {
      const raw = await redis.blMove(
        key,
        activeKey,
        'RIGHT',
        'LEFT',
        timeoutSeconds,
      );
      if (raw === null) return undefined;
      const noteId = parseNoteId(raw);
      if (noteId) return { noteId, raw };
      // It would fail the same way every time; drop it.
      logger.error({ job: raw }, 'dropped malformed upload job');
      await redis.lRem(activeKey, 1, raw);
      return undefined;
    },

    // True when this worker now runs the note; false when another one does.
    async lock(noteId: string, workerId: string): Promise<boolean> {
      const result = await redis.set(lockKey(noteId), workerId, {
        condition: 'NX',
        expiration: { type: 'PX', value: lockMs },
      });
      return result === 'OK';
    },

    // False when the lock was lost (it expired).
    async renew(noteId: string, workerId: string): Promise<boolean> {
      const result = await redis.eval(RENEW_IF_OWNED, {
        keys: [lockKey(noteId)],
        arguments: [workerId, String(lockMs)],
      });
      return result === 1;
    },

    // Removes a duplicate job from the active list. Leaves the lock alone:
    // it belongs to the copy that is running.
    async drop(job: TakenJob): Promise<void> {
      await redis.lRem(activeKey, 1, job.raw);
    },

    // Hands an unfinished job back, to be taken again (by any worker) and
    // carry on: false when the lock is no longer this worker's, and the job
    // was left alone.
    async putBack(job: TakenJob, workerId: string): Promise<boolean> {
      const result = await redis.eval(PUT_BACK_IF_OWNED, {
        keys: [key, activeKey, lockKey(job.noteId)],
        arguments: [job.raw, workerId],
      });
      return result === 1;
    },

    // Removes the job from the active list and releases its lock.
    async finish(job: TakenJob, workerId: string): Promise<void> {
      await redis.lRem(activeKey, 1, job.raw);
      await redis.eval(RELEASE_IF_OWNED, {
        keys: [lockKey(job.noteId)],
        arguments: [workerId],
      });
      await redis.del(failuresKey(job.noteId));
    },

    // Counts one more failed run of the note's job; returns the count.
    async countFailure(noteId: string): Promise<number> {
      const count = await redis.incr(failuresKey(noteId));
      await redis.pExpire(failuresKey(noteId), FAILURES_KEEP_MS);
      return count;
    },

    // Forgets the note's failed runs: called once a run makes progress, so
    // only failures in a row count.
    async clearFailures(noteId: string): Promise<void> {
      await redis.del(failuresKey(noteId));
    },

    // Whether the note has a job: waiting, taken, or running.
    async hasJob(noteId: string): Promise<boolean> {
      if (await redis.exists(lockKey(noteId))) return true;
      for (const list of [key, activeKey]) {
        for (const raw of await redis.lRange(list, 0, -1)) {
          if (parseNoteId(raw) === noteId) return true;
        }
      }
      return false;
    },

    // Puts active jobs whose note is not locked back on the queue: their
    // worker stopped (a crash) without finishing them. Returns their note ids.
    async requeueOrphans(): Promise<string[]> {
      const requeued: string[] = [];
      for (const raw of await redis.lRange(activeKey, 0, -1)) {
        const noteId = parseNoteId(raw);
        // A malformed entry has no lock; `take` drops it next time round.
        const result = await redis.eval(REQUEUE_IF_UNLOCKED, {
          keys: [key, activeKey, lockKey(noteId ?? '')],
          arguments: [raw],
        });
        if (result === 1 && noteId) requeued.push(noteId);
      }
      return requeued;
    },
  };
}

export type UploadQueue = ReturnType<typeof createUploadQueue>;

function parseNoteId(raw: string): string | undefined {
  try {
    const job: unknown = JSON.parse(raw);
    if (
      typeof job === 'object' &&
      job !== null &&
      'noteId' in job &&
      typeof job.noteId === 'string'
    ) {
      return job.noteId;
    }
  } catch {
    // Not JSON.
  }
  return undefined;
}
