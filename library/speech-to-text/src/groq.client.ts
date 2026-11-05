import { audioFileExtension } from './audio.utils';
import {
  SpeechToTextError,
  type SpeechToText,
  type TranscribeInput,
} from './speech-to-text.types';

const GROQ_TRANSCRIPTIONS_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';
const MODEL = 'whisper-large-v3-turbo';
// Errors about our setup, not the audio: a bad or revoked key (401, 403) or
// a model that doesn't exist (404). Every request fails the same way until
// that is fixed; treating them as bad audio would throw away every chunk
// sent meanwhile.
const SETUP_STATUSES = new Set([401, 403, 404]);
// The same, named by Groq's error code, whatever the status: a retired
// model comes back as a 400.
const SETUP_CODES = new Set([
  'invalid_api_key',
  'model_not_found',
  'model_decommissioned',
]);
// Worth trying again: our setup once fixed, or a rate limit.
const RETRYABLE_STATUSES = new Set([...SETUP_STATUSES, 429]);
// The setup check gives up after this, as "can't tell".
const CHECK_TIMEOUT_MS = 10_000;

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
    async transcribe({ audio, mimeType, prompt, signal }: TranscribeInput) {
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
          signal,
        });
      } catch (error) {
        // Cancelled by the caller: not a Groq problem.
        signal?.throwIfAborted();
        throw new SpeechToTextError('could not reach Groq', {
          retryable: true,
          cause: error,
        });
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        const setupError =
          SETUP_STATUSES.has(response.status) ||
          SETUP_CODES.has(errorCode(detail) ?? '');
        throw new SpeechToTextError(
          `Groq returned ${response.status}: ${detail.slice(0, 300)}`,
          {
            retryable:
              setupError ||
              RETRYABLE_STATUSES.has(response.status) ||
              response.status >= 500,
            retryAfterSeconds: parseRetryAfter(
              response.headers.get('retry-after'),
            ),
            setupError,
          },
        );
      }

      // A 2xx that isn't the expected JSON (a proxy error page, a cut-off
      // body) is a provider hiccup, not bad audio: worth retrying.
      let body: { text?: unknown };
      try {
        body = (await response.json()) as { text?: unknown };
      } catch (error) {
        throw new SpeechToTextError('Groq returned an unreadable response', {
          retryable: true,
          cause: error,
        });
      }
      if (typeof body.text !== 'string') {
        throw new SpeechToTextError('Groq response had no text', {
          retryable: true,
        });
      }
      return { text: body.text.trim() };
    },
  };
}

// Whether Groq accepts our setup: the key works and our model is listed.
// Lists the models, which sends no audio and costs nothing. Throws when
// Groq can't be reached or errors, since that says nothing either way.
export async function checkGroqSetup({
  apiKey,
  fetch: fetchFn = fetch,
  timeoutMs = CHECK_TIMEOUT_MS,
}: GroqOptions & { timeoutMs?: number }): Promise<'ok' | 'rejected'> {
  let response: Response;
  let body: { data?: { id?: unknown }[] } | undefined;
  try {
    response = await fetchFn(GROQ_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok) body = (await response.json()) as typeof body;
  } catch (error) {
    // No answer, or not a list of models (a proxy's page, say).
    throw new SpeechToTextError('could not check the Groq setup', {
      retryable: true,
      cause: error,
    });
  }
  if (SETUP_STATUSES.has(response.status)) return 'rejected';
  if (!response.ok) {
    throw new SpeechToTextError(`Groq returned ${response.status}`, {
      retryable: true,
    });
  }
  if (!Array.isArray(body?.data)) {
    throw new SpeechToTextError('Groq returned no list of models', {
      retryable: true,
    });
  }
  return body.data.some((model) => model.id === MODEL) ? 'ok' : 'rejected';
}

// Groq's error code from an error response's body, e.g. "invalid_api_key".
function errorCode(detail: string): string | undefined {
  try {
    const code = (JSON.parse(detail) as { error?: { code?: unknown } }).error
      ?.code;
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0
    ? Math.ceil(seconds)
    : undefined;
}
