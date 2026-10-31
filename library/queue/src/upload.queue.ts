import type { RedisClient } from './redis.client';

// The Redis list uploaded notes wait on until the worker takes them.
export const UPLOAD_QUEUE_KEY = 'uploads:pending';

export type UploadJob = { noteId: string };

// A plain Redis list used as a queue: jobs go in at the head (LPUSH) and the
// worker takes them from the tail, so the oldest job goes first. Tests pass
// their own `key` so their jobs never reach the real worker.
export function createUploadQueue(
  redis: RedisClient,
  { key = UPLOAD_QUEUE_KEY }: { key?: string } = {},
) {
  return {
    async push(noteId: string): Promise<void> {
      const job: UploadJob = { noteId };
      await redis.lPush(key, JSON.stringify(job));
    },
  };
}

export type UploadQueue = ReturnType<typeof createUploadQueue>;
