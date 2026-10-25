import { z } from 'zod';

import { NoteStatusSchema } from '../note/note.schema';

export const TranscriptSegmentSchema = z.object({
  seq: z.number().int(),
  startMs: z.number().int().nullable(),
  endMs: z.number().int().nullable(),
  // The user's edit if there is one, otherwise the raw transcription.
  text: z.string(),
});

export const TranscriptResponseSchema = z.object({
  status: NoteStatusSchema,
  segments: z.array(TranscriptSegmentSchema),
});

export type PublicTranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type TranscriptResponse = z.infer<typeof TranscriptResponseSchema>;
