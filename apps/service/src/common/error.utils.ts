import type { ErrorCode } from '@summarise/contract';

// Throw this anywhere in a request; errorMiddleware turns it into the
// shared error response.
export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  // Extra response headers, e.g. Retry-After on a 503.
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}
