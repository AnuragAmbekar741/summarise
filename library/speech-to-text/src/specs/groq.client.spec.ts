import { describe, expect, it, vi } from 'vitest';

import { audioFileExtension } from '../audio.utils';
import { createGroqSpeechToText } from '../groq.client';
import { SpeechToTextError } from '../speech-to-text.types';

const audio = Buffer.from('fake audio');

function groqWith(response: Response | Error) {
  const fetch = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  return { fetch, stt: createGroqSpeechToText({ apiKey: 'key', fetch }) };
}

describe('groq speech-to-text', () => {
  it('sends the audio with model, format and prompt, and returns the text', async () => {
    const { fetch, stt } = groqWith(
      Response.json({ text: '  so today we start with memory  ' }),
    );

    const result = await stt.transcribe({
      audio,
      mimeType: 'audio/webm;codecs=opus',
      prompt: 'previous words',
    });

    expect(result).toEqual({ text: 'so today we start with memory' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(init.headers).toEqual({ Authorization: 'Bearer key' });
    const form = init.body as FormData;
    expect(form.get('model')).toBe('whisper-large-v3-turbo');
    expect(form.get('response_format')).toBe('json');
    expect(form.get('prompt')).toBe('previous words');
    expect((form.get('file') as File).name).toBe('chunk.webm');
  });

  it('leaves out the prompt when there is none', async () => {
    const { fetch, stt } = groqWith(Response.json({ text: 'hi' }));

    await stt.transcribe({ audio, mimeType: 'audio/mp4' });

    const form = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
      .body as FormData;
    expect(form.has('prompt')).toBe(false);
    expect((form.get('file') as File).name).toBe('chunk.mp4');
  });

  it('marks a 429 as retryable with its retry-after', async () => {
    const { stt } = groqWith(
      new Response('slow down', {
        status: 429,
        headers: { 'retry-after': '7' },
      }),
    );

    const error = await stt
      .transcribe({ audio, mimeType: 'audio/webm' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SpeechToTextError);
    expect(error).toMatchObject({ retryable: true, retryAfterSeconds: 7 });
  });

  it('marks a 5xx and a network failure as retryable', async () => {
    for (const failure of [
      new Response('oops', { status: 503 }),
      new TypeError('fetch failed'),
    ]) {
      const { stt } = groqWith(failure);
      await expect(
        stt.transcribe({ audio, mimeType: 'audio/webm' }),
      ).rejects.toMatchObject({ retryable: true });
    }
  });

  it('marks a 400 as not retryable', async () => {
    const { stt } = groqWith(new Response('bad file', { status: 400 }));

    await expect(
      stt.transcribe({ audio, mimeType: 'audio/webm' }),
    ).rejects.toMatchObject({ retryable: false });
  });

  it('rejects an unsupported audio type without calling Groq', async () => {
    const { fetch, stt } = groqWith(Response.json({ text: 'x' }));

    await expect(
      stt.transcribe({ audio, mimeType: 'video/quicktime' }),
    ).rejects.toMatchObject({ retryable: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('audioFileExtension', () => {
  it('ignores codec parameters and case', () => {
    expect(audioFileExtension('Audio/WebM; codecs=opus')).toBe('webm');
    expect(audioFileExtension('audio/mpeg')).toBe('mp3');
    expect(audioFileExtension('video/mp4')).toBeUndefined();
  });
});
