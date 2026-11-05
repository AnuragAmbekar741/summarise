import { execFile } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { uploadKey } from '@summarise/blob';
import { config } from '@summarise/config';
import {
  SpeechToTextError,
  type SpeechToText,
  type TranscribeInput,
} from '@summarise/speech-to-text';
import {
  createDatabase,
  createNoteRepository,
  createTranscriptSegmentRepository,
  createUserRepository,
} from '@summarise/storage';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createUploadTranscriber } from '../upload.transcriber';

const run = promisify(execFile);

// A 70s lecture with 1s pauses at 28s and 58s: three pieces.
const TONE = `0.5*sin(2*PI*440*t)*not(between(t,28,29))*not(between(t,58,59))`;

// Runs against the real Postgres from .env and real ffmpeg, with a stand-in
// for Groq and a bucket whose "presigned URL" is a local file.
describe('upload transcriber', async () => {
  const db = createDatabase(config.DATABASE_URL);
  const notes = createNoteRepository(db);
  const segments = createTranscriptSegmentRepository(db);
  const user = await createUserRepository(db).create({
    name: 'Transcriber Test',
    email: `test+${crypto.randomUUID()}@example.com`,
  });
  const dir = mkdtempSync(join(tmpdir(), 'summarise-transcriber-'));
  const lecture = join(dir, 'lecture.mp3');

  beforeAll(async () => {
    await run('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      `aevalsrc='${TONE}':s=44100:d=70`,
      lecture,
    ]);
  }, 30_000);

  afterAll(async () => {
    await db.$client.query('delete from users where id = $1', [user.id]);
    await db.$client.end();
    await rm(dir, { recursive: true, force: true });
  });

  // `answer(input, call)` stands in for Groq: return the text, or throw.
  function setUp(
    answer: (
      input: TranscribeInput,
      call: number,
    ) => string | Promise<string> = (_, call) => `text ${call}`,
    options: { maxAudioMs?: number } = {},
  ) {
    const calls: TranscribeInput[] = [];
    const waits: number[] = [];
    const deleted: string[] = [];
    const speechToText: SpeechToText = {
      async transcribe(input) {
        calls.push(input);
        return { text: await answer(input, calls.length - 1) };
      },
    };
    const transcriber = createUploadTranscriber({
      blob: {
        presignGet: async () => lecture,
        delete: async (key) => void deleted.push(key),
      },
      notes,
      segments,
      speechToText,
      maxAudioMs: options.maxAudioMs,
      wait: async (ms) => void waits.push(ms),
    });
    return { transcriber, calls, waits, deleted };
  }

  function uploadedNote() {
    return notes.create({
      userId: user.id,
      source: 'upload',
      status: 'processing',
    });
  }

  async function savedSegments(noteId: string) {
    return (await segments.listByNote(noteId)).map((s) => ({
      seq: s.seq,
      startMs: s.startMs,
      endMs: s.endMs,
      text: s.rawText,
      failed: s.transcriptionFailed,
    }));
  }

  const signal = () => new AbortController().signal;

  it('saves every piece in order, then marks the note ready and deletes the file', async () => {
    const note = await uploadedNote();
    const { transcriber, calls, deleted } = setUp();

    await transcriber.transcribe(note, signal());

    const saved = await savedSegments(note.id);
    expect(saved.map((s) => [s.seq, s.text, s.failed])).toEqual([
      [0, 'text 0', false],
      [1, 'text 1', false],
      [2, 'text 2', false],
    ]);
    // Back to back, from 0 to the end of the lecture.
    expect(saved[0]!.startMs).toBe(0);
    expect(saved[1]!.startMs).toBe(saved[0]!.endMs);
    expect(saved[2]!.startMs).toBe(saved[1]!.endMs);
    // Each piece gets the text before it as context.
    expect(calls.map((c) => c.prompt)).toEqual([undefined, 'text 0', 'text 1']);
    expect(calls.every((c) => c.mimeType === 'audio/wav')).toBe(true);

    const ready = await notes.findById(note.id);
    expect(ready).toMatchObject({ status: 'ready', totalChunks: 3 });
    expect(Math.abs(ready!.durationMs! - 70_000)).toBeLessThan(100);
    expect(deleted).toEqual([uploadKey(note.id)]);
  });

  it('skips pieces saved by an earlier run and carries on', async () => {
    const note = await uploadedNote();
    await segments.upsert({
      noteId: note.id,
      seq: 0,
      startMs: 0,
      endMs: 28_160,
      rawText: 'saved before',
    });
    const { transcriber, calls } = setUp();

    await transcriber.transcribe(note, signal());

    expect(calls).toHaveLength(2);
    expect(calls[0]!.prompt).toBe('saved before');
    expect((await savedSegments(note.id)).map((s) => s.text)).toEqual([
      'saved before',
      'text 0',
      'text 1',
    ]);
    expect((await notes.findById(note.id))?.status).toBe('ready');
  });

  it('waits and tries again while the provider is busy', async () => {
    const note = await uploadedNote();
    const { transcriber, waits } = setUp((_, call) => {
      if (call === 0) {
        throw new SpeechToTextError('rate limited', {
          retryable: true,
          retryAfterSeconds: 7,
        });
      }
      if (call === 1) {
        throw new SpeechToTextError('down', { retryable: true });
      }
      return `text ${call}`;
    });

    await transcriber.transcribe(note, signal());

    // As asked by the provider, then its own backoff.
    expect(waits).toEqual([7_000, 10_000]);
    expect((await savedSegments(note.id)).map((s) => s.text)).toEqual([
      'text 2',
      'text 3',
      'text 4',
    ]);
    expect((await notes.findById(note.id))?.status).toBe('ready');
  });

  it('tries a rejected setup again after 5s, 10s and 15s, then gives up', async () => {
    const note = await uploadedNote();
    const { transcriber, calls, waits, deleted } = setUp(() => {
      throw new SpeechToTextError('invalid key', {
        retryable: true,
        setupError: true,
      });
    });

    const error = await transcriber
      .transcribe(note, signal())
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ setupError: true });
    expect(calls).toHaveLength(4);
    expect(waits).toEqual([5_000, 10_000, 15_000]);
    // Nothing saved as a gap, and the file kept.
    expect(await savedSegments(note.id)).toEqual([]);
    expect(deleted).toEqual([]);
  });

  it('carries on when a rejected setup works again', async () => {
    const note = await uploadedNote();
    const { transcriber, waits } = setUp((_, call) => {
      if (call < 2) {
        throw new SpeechToTextError('invalid key', {
          retryable: true,
          setupError: true,
        });
      }
      return `text ${call}`;
    });

    await transcriber.transcribe(note, signal());

    expect(waits).toEqual([5_000, 10_000]);
    expect((await notes.findById(note.id))?.status).toBe('ready');
  });

  it('gives up at once when asked to wait more than 2 minutes', async () => {
    const note = await uploadedNote();
    const { transcriber, calls, waits } = setUp(() => {
      throw new SpeechToTextError('daily limit', {
        retryable: true,
        retryAfterSeconds: 3_600,
      });
    });

    const error = await transcriber
      .transcribe(note, signal())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SpeechToTextError);
    expect(calls).toHaveLength(1);
    expect(waits).toEqual([]);
  });

  it('waits at least 1s, even when told not to wait', async () => {
    const note = await uploadedNote();
    const { transcriber, waits } = setUp((_, call) => {
      if (call === 0) {
        throw new SpeechToTextError('busy', {
          retryable: true,
          retryAfterSeconds: 0,
        });
      }
      return `text ${call}`;
    });

    await transcriber.transcribe(note, signal());

    expect(waits).toEqual([1_000]);
  });

  it('saves a piece the provider rejects as a gap and carries on', async () => {
    const note = await uploadedNote();
    const { transcriber, calls } = setUp((_, call) => {
      if (call === 1) {
        throw new SpeechToTextError('bad audio', { retryable: false });
      }
      return `text ${call}`;
    });

    await transcriber.transcribe(note, signal());

    expect(
      (await savedSegments(note.id)).map((s) => [s.text, s.failed]),
    ).toEqual([
      ['text 0', false],
      ['', true],
      ['text 2', false],
    ]);
    // No text to carry over from the gap.
    expect(calls[2]!.prompt).toBeUndefined();
    expect((await notes.findById(note.id))?.status).toBe('ready');
  });

  it('gives up after 5 tries, leaving the note processing and the file', async () => {
    const note = await uploadedNote();
    const { transcriber, calls, deleted } = setUp(() => {
      throw new SpeechToTextError('down', { retryable: true });
    });

    const error = await transcriber
      .transcribe(note, signal())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SpeechToTextError);
    expect(calls).toHaveLength(5);
    expect(await savedSegments(note.id)).toEqual([]);
    expect((await notes.findById(note.id))?.status).toBe('processing');
    expect(deleted).toEqual([]);
  });

  it('stops when the signal fires, saving nothing more', async () => {
    const note = await uploadedNote();
    const controller = new AbortController();
    const { transcriber } = setUp((_, call) => {
      // The lock is lost while the second piece is being transcribed.
      if (call === 1) controller.abort();
      return `text ${call}`;
    });

    const error = await transcriber
      .transcribe(note, controller.signal)
      .catch((e: unknown) => e);

    expect((error as Error).name).toBe('AbortError');
    expect((await savedSegments(note.id)).map((s) => s.seq)).toEqual([0]);
    expect((await notes.findById(note.id))?.status).toBe('processing');
  });

  it('transcribes only the start of an upload over the length limit', async () => {
    const note = await uploadedNote();
    // Pieces start at 0s, ~28s and ~58s: the third is past the limit.
    const { transcriber, calls } = setUp(undefined, { maxAudioMs: 40_000 });

    await transcriber.transcribe(note, signal());

    expect(calls).toHaveLength(2);
    const ready = await notes.findById(note.id);
    expect(ready).toMatchObject({ status: 'ready', totalChunks: 2 });
    expect(ready!.durationMs).toBeLessThan(60_000);
  });

  it('fails when the note is deleted part way', async () => {
    const note = await uploadedNote();
    // Deleted (and gone) before the second piece is saved.
    const { transcriber } = setUp(async (_, call) => {
      if (call === 1) await notes.delete(note.id);
      return `text ${call}`;
    });

    const error = await transcriber
      .transcribe(note, signal())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(await notes.findById(note.id)).toBeUndefined();
  });
});
