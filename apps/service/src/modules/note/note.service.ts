import type {
  CreateNoteInput,
  PublicNote,
  StopNoteInput,
  UpdateNoteInput,
} from '@summarise/contract';
import type { Note, NoteRepository } from '@summarise/storage';

import { HttpError } from '../../common/error.utils';
import type { TranscriptService } from '../transcript/transcript.service';

type NoteServiceDeps = {
  notes: NoteRepository;
  transcriptService: TranscriptService;
};

export function createNoteService({
  notes,
  transcriptService,
}: NoteServiceDeps) {
  // Another user's note reads as missing, so ids can't be probed.
  async function getOwnedNote(userId: string, noteId: string): Promise<Note> {
    const note = await notes.findByIdForUser(noteId, userId);
    if (!note) throw new HttpError(404, 'NOT_FOUND', 'Note not found');
    return note;
  }

  return {
    getOwnedNote,

    async create(userId: string, input: CreateNoteInput): Promise<PublicNote> {
      const note = await notes.create({
        userId,
        source: 'recording',
        ...(input.title && { title: input.title }),
        keepAudio: input.keepAudio ?? false,
      });
      return toPublicNote(note);
    },

    async get(userId: string, noteId: string): Promise<PublicNote> {
      return toPublicNote(await getOwnedNote(userId, noteId));
    },

    async list(userId: string): Promise<PublicNote[]> {
      return (await notes.listByUser(userId)).map(toPublicNote);
    },

    async update(
      userId: string,
      noteId: string,
      input: UpdateNoteInput,
    ): Promise<PublicNote> {
      const note = await getOwnedNote(userId, noteId);
      return toPublicNote(await notes.update(note.id, input));
    },

    // Recording ends. Chunks still in flight (seq < totalChunks) are accepted
    // until all have arrived; then the note is ready.
    async stop(
      userId: string,
      noteId: string,
      input: StopNoteInput,
    ): Promise<PublicNote> {
      const note = await getOwnedNote(userId, noteId);

      if (note.status !== 'recording') {
        // A retried stop with the same count is fine.
        if (note.totalChunks === input.totalChunks) return toPublicNote(note);
        throw new HttpError(
          409,
          'NOTE_NOT_RECORDING',
          'This note has already been stopped',
        );
      }

      const stopped = await notes.update(note.id, {
        status: 'processing',
        totalChunks: input.totalChunks,
        durationMs: input.durationMs,
        endedAt: new Date(),
      });
      return toPublicNote(await transcriptService.markReadyIfComplete(stopped));
    },
  };
}

export type NoteService = ReturnType<typeof createNoteService>;

function toPublicNote(note: Note): PublicNote {
  return {
    id: note.id,
    title: note.title,
    description: note.description,
    source: note.source,
    status: note.status,
    keepAudio: note.keepAudio,
    totalChunks: note.totalChunks,
    durationMs: note.durationMs,
    startedAt: note.startedAt.toISOString(),
    endedAt: note.endedAt?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
  };
}
