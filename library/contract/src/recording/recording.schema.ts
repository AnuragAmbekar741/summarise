import { z } from 'zod';

import { TranscriptSegmentSchema } from '../transcript/transcript.schema';

// The text fields sent alongside the `audio` file in a multipart upload.
// Multipart values arrive as strings, hence the coercion.
export const UploadChunkSchema = z.object({
  seq: z.coerce.number().int().min(0).max(9_999),
  startMs: z.coerce.number().int().min(0),
  // Chunks are cut around 30s; allow some slack.
  durationMs: z.coerce.number().int().min(1).max(120_000),
});

export const UploadChunkResponseSchema = z.object({
  segment: TranscriptSegmentSchema,
});

export type UploadChunkInput = z.infer<typeof UploadChunkSchema>;
export type UploadChunkResponse = z.infer<typeof UploadChunkResponseSchema>;
