import type { ObjectStore } from '@summarise/blob';
import type {
  CreateUploadInput,
  CreateUploadResponse,
  PublicNote,
} from '@summarise/contract';
import type { NoteRepository } from '@summarise/storage';

import { HttpError } from '../../common/error.utils';
import { toPublicNote, type NoteService } from '../note/note.service';
import { titleFromFileName, uploadKey } from './utils/upload.utils';

// How long the browser has to start the upload.
const UPLOAD_URL_SECONDS = 15 * 60;

type UploadServiceDeps = {
  notes: NoteRepository;
  noteService: NoteService;
  blob: ObjectStore;
};

// A file the browser uploads straight to the bucket; the service only hands
// out the URL and checks the file arrived.
export function createUploadService({
  notes,
  noteService,
  blob,
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
      // upload from here, so this one just returns the note as it is now.
      const uploaded = await notes.markUploaded(note.id);
      return toPublicNote(
        uploaded ?? (await noteService.getOwnedNote(userId, noteId)),
      );
    },
  };
}

export type UploadService = ReturnType<typeof createUploadService>;
