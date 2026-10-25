export type TranscribeInput = {
  audio: Buffer;
  mimeType: string;
  // The end of the previous chunk's text, so wording carries across cuts.
  prompt?: string;
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

  constructor(
    message: string,
    options: {
      retryable: boolean;
      retryAfterSeconds?: number;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = 'SpeechToTextError';
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
