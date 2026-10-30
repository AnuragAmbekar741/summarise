import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLocalBlobStore } from '@summarise/blob';
import type { SpeechToText, TranscribeInput } from '@summarise/speech-to-text';
import type { Express } from 'express';
import request from 'supertest';

// Shared helpers for the service's integration tests.

// A blob store in a fresh temp folder, so tests never touch the bucket.
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

// Signs up a fresh user on a cookie-keeping agent. The email is pushed onto
// `emails` so the test can delete the user (and, by cascade, their notes).
export async function signUpAgent(app: Express, emails: string[]) {
  const agent = request.agent(app);
  const email = `test+${crypto.randomUUID()}@example.com`;
  emails.push(email);
  await agent
    .post('/auth/signup')
    .send({ name: 'Test User', email, password: 'correct horse' })
    .expect(201);
  return agent;
}
