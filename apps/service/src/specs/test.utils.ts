import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLocalBlobStore } from '@summarise/blob';
import type { SpeechToText, TranscribeInput } from '@summarise/speech-to-text';

// Shared helpers for the service's integration tests.

// A blob store in a fresh temp folder, so tests never touch DATA_DIR.
export function createTempBlobStore() {
  const dir = mkdtempSync(join(tmpdir(), 'summarise-blob-'));
  return { dir, blob: createLocalBlobStore(dir) };
}

// Stands in for Groq: returns `transcript(input)`, records every call, and
// throws whatever `fail` returns instead, when set.
export function createFakeSpeechToText(
  transcript: (input: TranscribeInput) => string = () => 'fake transcript',
) {
  const calls: TranscribeInput[] = [];
  let fail: (() => Error) | undefined;

  const speechToText: SpeechToText = {
    async transcribe(input) {
      calls.push(input);
      if (fail) throw fail();
      return { text: transcript(input) };
    },
  };

  return {
    speechToText,
    calls,
    failWith(error: (() => Error) | undefined) {
      fail = error;
    },
  };
}
