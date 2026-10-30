import { z } from 'zod';

import { NoteSchema } from '../note/note.schema';

// The largest file the browser may upload straight to the bucket.
export const UPLOAD_MAX_BYTES = 500 * 1024 * 1024;

// What the browser knows about the file before uploading it. The type and
// size are signed into the upload URL, so the bucket refuses any other file.
export const CreateUploadSchema = z.object({
  fileName: z.string().trim().min(1, 'Enter a file name').max(255),
  contentType: z
    .string()
    .regex(/^(audio|video)\/[\w.+-]+$/, 'Choose an audio or video file'),
  size: z
    .number()
    .int()
    .min(1, 'The file is empty')
    .max(UPLOAD_MAX_BYTES, 'Use a file of at most 500 MB'),
});

export const CreateUploadResponseSchema = z.object({
  note: NoteSchema,
  // PUT the file here, with the same Content-Type, before it expires.
  uploadUrl: z.url(),
});

export type CreateUploadInput = z.infer<typeof CreateUploadSchema>;
export type CreateUploadResponse = z.infer<typeof CreateUploadResponseSchema>;
