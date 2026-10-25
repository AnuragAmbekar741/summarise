import type {
  PublicTranscriptSegment,
  TranscriptResponse,
} from '@summarise/contract';
import type {
  NewTranscriptSegment,
  Note,
  NoteRepository,
  TranscriptSegment,
  TranscriptSegmentRepository,
} from '@summarise/storage';

type TranscriptServiceDeps = {
  notes: NoteRepository;
  segments: TranscriptSegmentRepository;
};

// Part 2: owns the transcript of a note, wherever its text came from.
export function createTranscriptService({
  notes,
  segments,
}: TranscriptServiceDeps) {
  return {
    async getTranscript(note: Note): Promise<TranscriptResponse> {
      const rows = await segments.listByNote(note.id);
      return { status: note.status, segments: rows.map(toPublicSegment) };
    },

    async saveSegment(input: NewTranscriptSegment) {
      return toPublicSegment(await segments.upsert(input));
    },

    // The text just before `seq`, used as context for the next chunk.
    async previousText(noteId: string, seq: number) {
      const previous = await segments.findPrevious(noteId, seq);
      return previous ? textOf(previous) : undefined;
    },

    // A stopped note is ready once every expected segment has arrived.
    async markReadyIfComplete(note: Note): Promise<Note> {
      if (note.status !== 'processing' || note.totalChunks === null) {
        return note;
      }
      const count = await segments.countByNote(note.id);
      if (count < note.totalChunks) return note;
      return notes.update(note.id, { status: 'ready' });
    },
  };
}

export type TranscriptService = ReturnType<typeof createTranscriptService>;

function textOf(segment: TranscriptSegment) {
  return segment.editedText ?? segment.rawText;
}

function toPublicSegment(segment: TranscriptSegment): PublicTranscriptSegment {
  return {
    seq: segment.seq,
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: textOf(segment),
  };
}
