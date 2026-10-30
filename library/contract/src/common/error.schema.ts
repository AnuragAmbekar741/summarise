import { z } from 'zod';

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'UNAUTHENTICATED',
  'NOT_FOUND',
  'NOTE_NOT_RECORDING',
  'NOTE_NOT_ACCEPTING_CHUNKS',
  'NOTE_NOT_UPLOAD',
  'UPLOAD_NOT_FOUND',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_AUDIO',
  'TRANSCRIPTION_FAILED',
  'INTERNAL',
]);

// Every non-2xx response from the service has this shape.
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
