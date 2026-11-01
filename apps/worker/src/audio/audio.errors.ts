// Reading audio out of an uploaded file failed.
export class AudioError extends Error {
  // False when the file itself is the problem (no audio, not a media file):
  // trying again gives the same result. True for network and server trouble.
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { retryable: boolean; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = 'AudioError';
    this.retryable = options.retryable;
  }
}
