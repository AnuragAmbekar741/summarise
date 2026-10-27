import { z } from 'zod';

// Shared with the web app, which stops typing at these lengths.
export const NOTE_TITLE_MAX = 200;
export const NOTE_DESCRIPTION_MAX = 2000;

export const NoteSourceSchema = z.enum(['recording', 'text']);

// recording → processing (stopped, last chunks still arriving) → ready.
export const NoteStatusSchema = z.enum(['recording', 'processing', 'ready']);

export const NoteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
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
    .max(NOTE_TITLE_MAX, `Use at most ${NOTE_TITLE_MAX} characters`)
    .optional(),
  // Also save the recording's audio, not just its transcript.
  keepAudio: z.boolean().optional(),
});

export const StopNoteSchema = z.object({
  durationMs: z.number().int().min(0),
  // How many chunks the browser recorded; the note is ready once all arrive.
  totalChunks: z.number().int().min(0).max(10_000),
});

// Send only the fields to change; a null description clears it.
export const UpdateNoteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Enter a title')
      .max(NOTE_TITLE_MAX, `Use at most ${NOTE_TITLE_MAX} characters`)
      .optional(),
    description: z
      .string()
      .trim()
      .max(
        NOTE_DESCRIPTION_MAX,
        `Use at most ${NOTE_DESCRIPTION_MAX} characters`,
      )
      .nullable()
      .optional(),
  })
  .refine(
    (input) => input.title !== undefined || input.description !== undefined,
    'Change the title or the description',
  );

export const NoteParamsSchema = z.object({
  noteId: z.uuid(),
});

export const NoteResponseSchema = z.object({
  note: NoteSchema,
});

// The signed-in user's notes, newest first.
export const NotesResponseSchema = z.object({
  notes: z.array(NoteSchema),
});

export type NoteSource = z.infer<typeof NoteSourceSchema>;
export type NoteStatus = z.infer<typeof NoteStatusSchema>;
export type PublicNote = z.infer<typeof NoteSchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type StopNoteInput = z.infer<typeof StopNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type NoteParams = z.infer<typeof NoteParamsSchema>;
export type NoteResponse = z.infer<typeof NoteResponseSchema>;
export type NotesResponse = z.infer<typeof NotesResponseSchema>;
