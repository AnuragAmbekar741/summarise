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

    async getSegment(
      noteId: string,
      seq: number,
    ): Promise<PublicTranscriptSegment | undefined> {
      const segment = await segments.findBySeq(noteId, seq);
      return segment ? toPublicSegment(segment) : undefined;
    },

    // A stopped note is ready once every expected segment has arrived. The
    // check runs in the database against current state, not against `note`,
    // which the caller may have read before a concurrent stop or upload.
    async markReadyIfComplete(note: Note): Promise<Note> {
      return (await notes.markReadyIfComplete(note.id)) ?? note;
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
    transcriptionFailed: segment.transcriptionFailed,
  };
}
