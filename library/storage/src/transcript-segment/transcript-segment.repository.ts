import { and, asc, count, desc, eq, lt } from 'drizzle-orm';

import type { Database } from '../database';
import {
  transcriptSegments,
  type NewTranscriptSegment,
  type TranscriptSegment,
} from './transcript-segment.table';

export function createTranscriptSegmentRepository(db: Database) {
  return {
    // A re-uploaded chunk overwrites its own row, so retries never duplicate.
    // The user's edited_text is left alone.
    async upsert(input: NewTranscriptSegment): Promise<TranscriptSegment> {
      const [segment] = await db
        .insert(transcriptSegments)
        .values(input)
        .onConflictDoUpdate({
          target: [transcriptSegments.noteId, transcriptSegments.seq],
          set: {
            startMs: input.startMs,
            endMs: input.endMs,
            rawText: input.rawText,
            transcriptionFailed: input.transcriptionFailed ?? false,
            audioKey: input.audioKey,
            updatedAt: new Date(),
          },
        })
        .returning();
      // `returning()` always yields the written row.
      return segment!;
    },

    listByNote(noteId: string): Promise<TranscriptSegment[]> {
      return db
        .select()
        .from(transcriptSegments)
        .where(eq(transcriptSegments.noteId, noteId))
        .orderBy(asc(transcriptSegments.seq));
    },

    // The closest segment before `seq`, for context across chunk cuts.
    async findPrevious(
      noteId: string,
      seq: number,
    ): Promise<TranscriptSegment | undefined> {
      const [segment] = await db
        .select()
        .from(transcriptSegments)
        .where(
          and(
            eq(transcriptSegments.noteId, noteId),
            lt(transcriptSegments.seq, seq),
          ),
        )
        .orderBy(desc(transcriptSegments.seq))
        .limit(1);
      return segment;
    },

    async findBySeq(
      noteId: string,
      seq: number,
    ): Promise<TranscriptSegment | undefined> {
      const [segment] = await db
        .select()
        .from(transcriptSegments)
        .where(
          and(
            eq(transcriptSegments.noteId, noteId),
            eq(transcriptSegments.seq, seq),
          ),
        );
      return segment;
    },

    async countByNote(noteId: string): Promise<number> {
      const [row] = await db
        .select({ value: count() })
        .from(transcriptSegments)
        .where(eq(transcriptSegments.noteId, noteId));
      return row?.value ?? 0;
    },
  };
}

export type TranscriptSegmentRepository = ReturnType<
  typeof createTranscriptSegmentRepository
>;
