import { audioFileExtension } from './audio.utils';
import {
  SpeechToTextError,
  type SpeechToText,
  type TranscribeInput,
} from './speech-to-text.types';

const GROQ_TRANSCRIPTIONS_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = 'whisper-large-v3-turbo';

type GroqOptions = {
  apiKey: string;
  // Injected in tests.
  fetch?: typeof fetch;
};

export function createGroqSpeechToText({
  apiKey,
  fetch: fetchFn = fetch,
}: GroqOptions): SpeechToText {
  return {
    async transcribe({ audio, mimeType, prompt }: TranscribeInput) {
      const extension = audioFileExtension(mimeType);
      if (!extension) {
        throw new SpeechToTextError(`unsupported audio type: ${mimeType}`, {
          retryable: false,
        });
      }

      const form = new FormData();
      form.append(
        'file',
        new Blob([new Uint8Array(audio)], { type: mimeType }),
        `chunk.${extension}`,
      );
      form.append('model', MODEL);
      form.append('response_format', 'json');
      form.append('temperature', '0');
      if (prompt) form.append('prompt', prompt);

      let response: Response;
      try {
        response = await fetchFn(GROQ_TRANSCRIPTIONS_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
      } catch (error) {
        throw new SpeechToTextError('could not reach Groq', {
          retryable: true,
          cause: error,
        });
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new SpeechToTextError(
          `Groq returned ${response.status}: ${detail.slice(0, 300)}`,
          {
            retryable: response.status === 429 || response.status >= 500,
            retryAfterSeconds: parseRetryAfter(
              response.headers.get('retry-after'),
            ),
          },
        );
      }

      const body = (await response.json()) as { text?: unknown };
      return { text: typeof body.text === 'string' ? body.text.trim() : '' };
    },
  };
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0
    ? Math.ceil(seconds)
    : undefined;
}
