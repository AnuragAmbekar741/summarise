import { z } from 'zod';

export const NoteSourceSchema = z.enum(['recording', 'text']);

// recording → processing (stopped, last chunks still arriving) → ready.
export const NoteStatusSchema = z.enum(['recording', 'processing', 'ready']);

export const NoteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  source: NoteSourceSchema,
  status: NoteStatusSchema,
  keepAudio: z.boolean(),
  totalChunks: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const CreateNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title')
    .max(200, 'Use at most 200 characters')
    .optional(),
  // Also save the recording's audio, not just its transcript.
  keepAudio: z.boolean().optional(),
});

export const StopNoteSchema = z.object({
  durationMs: z.number().int().min(0),
  // How many chunks the browser recorded; the note is ready once all arrive.
  totalChunks: z.number().int().min(0).max(10_000),
});

export const NoteParamsSchema = z.object({
  noteId: z.uuid(),
});

export const NoteResponseSchema = z.object({
  note: NoteSchema,
});

export type NoteSource = z.infer<typeof NoteSourceSchema>;
export type NoteStatus = z.infer<typeof NoteStatusSchema>;
export type PublicNote = z.infer<typeof NoteSchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type StopNoteInput = z.infer<typeof StopNoteSchema>;
export type NoteParams = z.infer<typeof NoteParamsSchema>;
export type NoteResponse = z.infer<typeof NoteResponseSchema>;
