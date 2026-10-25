import type { RequestHandler } from 'express';
import { z } from 'zod';

import { HttpError } from './error.utils';

// Parses req.body with a contract schema and replaces it with the clean
// (trimmed, lowercased, …) values. Invalid bodies get a 400.
export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        z.flattenError(result.error).fieldErrors,
      );
    }
    req.body = result.data;
    next();
  };
}

// Checks req.params (e.g. that :noteId is a uuid). Express owns req.params,
// so the values are checked but not replaced.
export function validateParams(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Invalid request parameters',
        z.flattenError(result.error).fieldErrors,
      );
    }
    next();
  };
}
