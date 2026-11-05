export type TranscribeInput = {
  audio: Buffer;
  mimeType: string;
  // The end of the previous chunk's text, so wording carries across cuts.
  prompt?: string;
  // Cancels the request; transcribe then throws `signal.reason`.
  signal?: AbortSignal;
};

// Audio in, text out. Groq today; another provider can implement this later.
export interface SpeechToText {
  transcribe(input: TranscribeInput): Promise<{ text: string }>;
}

export class SpeechToTextError extends Error {
  // True for rate limits, provider outages and network errors: worth trying
  // again later. False for bad input.
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
  // The provider rejected our setup (the API key, or the model), not this
  // audio: every request will fail the same way until that is fixed.
  readonly setupError: boolean;

  constructor(
    message: string,
    options: {
      retryable: boolean;
      retryAfterSeconds?: number;
      setupError?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = 'SpeechToTextError';
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.setupError = options.setupError ?? false;
  }
}
