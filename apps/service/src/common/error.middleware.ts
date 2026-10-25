import type { ErrorResponse } from '@summarise/contract';
import { logger } from '@summarise/logger';
import type { ErrorRequestHandler } from 'express';

import { HttpError } from './error.utils';

// Mounted last in app.ts. Express needs all four arguments to treat it as an
// error handler.
export const errorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next,
) => {
  if (error instanceof HttpError) {
    const body: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined && { details: error.details }),
      },
    };
    if (error.headers) res.set(error.headers);
    res.status(error.status).json(body);
    return;
  }

  // express.json() rejects malformed JSON with a 400 of its own.
  if (isBodyParseError(error)) {
    const body: ErrorResponse = {
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' },
    };
    res.status(400).json(body);
    return;
  }

  logger.error({ err: error }, 'unhandled error');
  const body: ErrorResponse = {
    error: { code: 'INTERNAL', message: 'Something went wrong' },
  };
  res.status(500).json(body);
};

function isBodyParseError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}
