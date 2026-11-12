import { uploadKey, type BlobStore } from '@summarise/blob';
import { logger } from '@summarise/logger';
import type { UploadQueue } from '@summarise/queue';
import type { NoteRepository } from '@summarise/storage';

// An upload not finished a day after its note was made is given up on. Its
// URL expired long before, so it can't still arrive.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

type UploadSweeperDeps = {
  notes: NoteRepository;
  blob: BlobStore;
  queue: Pick<UploadQueue, 'hasJob' | 'push'>;
};

// Removes notes stuck in `uploading`, and any file they left in the bucket.
// Queues again any upload that is processing with no job to finish it.
export function createUploadSweeper({ notes, blob, queue }: UploadSweeperDeps) {
  return {
    async requeueStuck(): Promise<string[]> {
      const requeued: string[] = [];
      for (const id of await notes.listProcessingUploads()) {
        if (await queue.hasJob(id)) continue;
        await queue.push(id);
        requeued.push(id);
      }
      if (requeued.length > 0) {
        logger.info({ ids: requeued }, 'requeued stuck uploads');
      }
      return requeued;
    },

    async sweep(now = new Date()): Promise<string[]> {
      const before = new Date(now.getTime() - STALE_AFTER_MS);
      // Notes first: an "upload complete" that comes in late then finds no
      // note, rather than a note whose file is gone.
      const ids = await notes.deleteStaleUploads(before);
      for (const id of ids) await blob.delete(uploadKey(id));
      if (ids.length > 0) logger.info({ ids }, 'swept stale uploads');
      return ids;
    },
  };
}

export type UploadSweeper = ReturnType<typeof createUploadSweeper>;
