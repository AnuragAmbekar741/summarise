import { uploadKey, type ObjectStore } from '@summarise/blob';
import type {
  CreateUploadInput,
  CreateUploadResponse,
  PublicNote,
} from '@summarise/contract';
import { logger } from '@summarise/logger';
import type { UploadQueue } from '@summarise/queue';
import type { NoteRepository } from '@summarise/storage';

import { HttpError } from '../../common/error.utils';
import { toPublicNote, type NoteService } from '../note/note.service';
import { titleFromFileName } from './utils/upload.utils';

// How long the browser has to start the upload.
const UPLOAD_URL_SECONDS = 15 * 60;
// How long to tell the browser to wait before retrying when Redis is down.
const QUEUE_RETRY_AFTER_SECONDS = 5;

type UploadServiceDeps = {
  notes: NoteRepository;
  noteService: NoteService;
  blob: ObjectStore;
  queue: UploadQueue;
};

// A file the browser uploads straight to the bucket; the service only hands
// out the URL and checks the file arrived.
export function createUploadService({
  notes,
  noteService,
  blob,
  queue,
}: UploadServiceDeps) {
  return {
    async create(
      userId: string,
      input: CreateUploadInput,
    ): Promise<CreateUploadResponse> {
      const note = await notes.create({
        userId,
        source: 'upload',
        status: 'uploading',
        title: titleFromFileName(input.fileName),
      });
      const uploadUrl = await blob.presignPut(uploadKey(note.id), {
        contentType: input.contentType,
        contentLength: input.size,
        expiresIn: UPLOAD_URL_SECONDS,
      });
      return { note: toPublicNote(note), uploadUrl };
    },

    // The browser says the upload finished. The URL only accepts the signed
    // type and size, so a file being there means it's the right one.
    async complete(userId: string, noteId: string): Promise<PublicNote> {
      const note = await noteService.getOwnedNote(userId, noteId);

      if (note.source !== 'upload') {
        throw new HttpError(
          409,
          'NOTE_NOT_UPLOAD',
          'This note is not an upload',
        );
      }
      // A retried call after the first one went through.
      if (note.status !== 'uploading') return toPublicNote(note);

      if (!(await blob.head(uploadKey(note.id)))) {
        throw new HttpError(
          409,
          'UPLOAD_NOT_FOUND',
          'The file has not finished uploading',
        );
      }
      // Undefined when a concurrent call got there first; that one owns the
      // upload from here (and queues it), so this one just returns the note
      // as it is now.
      const uploaded = await notes.markUploaded(note.id);
      if (!uploaded) {
        return toPublicNote(await noteService.getOwnedNote(userId, noteId));
      }

      // Only the call that won queues the note, so it's transcribed once.
      try {
        await queue.push(uploaded.id);
      } catch (error) {
        // Back to uploading, so a retry of this call can queue it. Otherwise
        // the note would sit in processing with no job to finish it.
        logger.error({ err: error, noteId: uploaded.id }, 'upload not queued');
        await notes.unmarkUploaded(uploaded.id);
        throw new HttpError(
          503,
          'UPLOAD_QUEUE_UNAVAILABLE',
          "Transcription can't start right now; try again shortly",
          undefined,
          { 'Retry-After': String(QUEUE_RETRY_AFTER_SECONDS) },
        );
      }
      return toPublicNote(uploaded);
    },
  };
}

export type UploadService = ReturnType<typeof createUploadService>;
