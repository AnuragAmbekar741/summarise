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
      const note = await getOwnedUpload(userId, noteId);
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
      // If it can't be queued: back to uploading, so a retry of this call
      // can queue it. Otherwise the note would sit in processing with no job
      // to finish it.
      await queueOrUndo(uploaded.id, () => notes.unmarkUploaded(uploaded.id));
      return toPublicNote(uploaded);
    },

    // Stops transcribing after the piece in progress; Resume carries on.
    async pause(userId: string, noteId: string): Promise<PublicNote> {
      const note = await getOwnedUpload(userId, noteId);
      // A retried call after the first one went through.
      if (note.status === 'paused') return toPublicNote(note);
      const paused = await notes.pauseUpload(note.id);
      if (!paused) throw notTranscribing();
      return toPublicNote(paused);
    },

    // Carries on transcribing a paused upload, or tries a failed one again,
    // from the pieces already saved.
    async resume(userId: string, noteId: string): Promise<PublicNote> {
      const note = await getOwnedUpload(userId, noteId);
      if (note.status === 'processing') return toPublicNote(note);
      const resumed = await notes.resumeUpload(note.id);
      if (!resumed) {
        throw new HttpError(
          409,
          'UPLOAD_NOT_PAUSED',
          'This upload is not paused',
        );
      }
      // Paused again, so Resume can be tried again.
      await queueOrUndo(resumed.id, () => notes.pauseUpload(resumed.id));
      return toPublicNote(resumed);
    },

    // Ends transcription early: the note is ready with the transcript so
    // far, and the file is deleted.
    async stop(userId: string, noteId: string): Promise<PublicNote> {
      const note = await getOwnedUpload(userId, noteId);
      if (note.status === 'ready') return toPublicNote(note);
      const stopped = await notes.stopUpload(note.id);
      if (!stopped) throw notTranscribing();
      // The transcript is saved; a file left behind only costs storage.
      await blob
        .delete(uploadKey(note.id))
        .catch((error: unknown) =>
          logger.error({ err: error, noteId }, 'upload not deleted'),
        );
      return toPublicNote(stopped);
    },
  };

  async function getOwnedUpload(userId: string, noteId: string) {
    const note = await noteService.getOwnedNote(userId, noteId);
    if (note.source !== 'upload') {
      throw new HttpError(409, 'NOTE_NOT_UPLOAD', 'This note is not an upload');
    }
    return note;
  }

  async function queueOrUndo(noteId: string, undo: () => Promise<unknown>) {
    try {
      await queue.push(noteId);
    } catch (error) {
      logger.error({ err: error, noteId }, 'upload not queued');
      await undo();
      throw new HttpError(
        503,
        'UPLOAD_QUEUE_UNAVAILABLE',
        "Transcription can't start right now; try again shortly",
        undefined,
        { 'Retry-After': String(QUEUE_RETRY_AFTER_SECONDS) },
      );
    }
  }
}

function notTranscribing() {
  return new HttpError(
    409,
    'UPLOAD_NOT_TRANSCRIBING',
    'This upload is not being transcribed',
  );
}

export type UploadService = ReturnType<typeof createUploadService>;
