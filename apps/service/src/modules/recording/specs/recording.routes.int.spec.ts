import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { config } from '@summarise/config';
import { createRedisClient } from '@summarise/queue';
import { SpeechToTextError } from '@summarise/speech-to-text';
import { createDatabase } from '@summarise/storage';
import type request from 'supertest';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import {
  createFakeSpeechToText,
  createTempBlobStore,
  signUpAgent,
} from '../../../specs/test.utils';
import { MAX_CHUNK_BYTES } from '../utils/upload.middleware';

// Runs against the real Postgres and Redis from docker compose, with a fake
// speech-to-text that echoes the uploaded bytes back as the transcript.
describe('recording routes', async () => {
  const db = createDatabase(config.DATABASE_URL);
  const redis = await createRedisClient(config.REDIS_URL);
  const { dir, blob } = createTempBlobStore();
  const stt = createFakeSpeechToText(
    (input) => `heard: ${input.audio.toString()}`,
  );
  const app = createApp({
    db,
    redis,
    config,
    blob,
    speechToText: stt.speechToText,
  });
  const emails: string[] = [];

  afterEach(() => stt.failWith(undefined));

  afterAll(async () => {
    await db.$client.query('delete from users where email = any($1)', [emails]);
    await db.$client.end();
    await redis.close();
    await rm(dir, { recursive: true, force: true });
  });

  async function newNote(body: object = {}) {
    const agent = await signUpAgent(app, emails);
    const response = await agent.post('/notes').send(body);
    return { agent, noteId: response.body.note.id as string };
  }

  function upload(
    agent: request.Agent,
    noteId: string,
    seq: number,
    audio: Buffer = Buffer.from(`chunk ${seq}`),
    contentType = 'audio/webm',
  ) {
    return agent
      .post(`/notes/${noteId}/chunks`)
      .field('seq', String(seq))
      .field('startMs', String(seq * 30_000))
      .field('durationMs', '30000')
      .attach('audio', audio, { filename: 'chunk.webm', contentType });
  }

  async function segmentRows(noteId: string) {
    const { rows } = await db.$client.query(
      'select seq, raw_text, audio_key from transcript_segments where note_id = $1 order by seq',
      [noteId],
    );
    return rows as {
      seq: number;
      raw_text: string;
      audio_key: string | null;
    }[];
  }

  it('transcribes a chunk into a segment', async () => {
    const { agent, noteId } = await newNote();

    const response = await upload(agent, noteId, 2);

    expect(response.status).toBe(200);
    expect(response.body.segment).toEqual({
      seq: 2,
      startMs: 60_000,
      endMs: 90_000,
      text: 'heard: chunk 2',
      transcriptionFailed: false,
    });
    expect(stt.calls.at(-1)?.mimeType).toBe('audio/webm');
  });

  it('sends the end of the previous segment as the prompt', async () => {
    const { agent, noteId } = await newNote();
    await upload(agent, noteId, 0).expect(200);

    await upload(agent, noteId, 1).expect(200);

    expect(stt.calls.at(-1)?.prompt).toBe('heard: chunk 0');
  });

  it('replaces the same seq instead of adding a row', async () => {
    const { agent, noteId } = await newNote();
    await upload(agent, noteId, 0, Buffer.from('first try')).expect(200);

    await upload(agent, noteId, 0, Buffer.from('second try')).expect(200);

    expect(await segmentRows(noteId)).toEqual([
      { seq: 0, raw_text: 'heard: second try', audio_key: null },
    ]);
  });

  it('saves the audio when the note keeps audio', async () => {
    const { agent, noteId } = await newNote({ keepAudio: true });

    await upload(agent, noteId, 3, Buffer.from('real audio')).expect(200);

    const key = `notes/${noteId}/chunks/00003.webm`;
    expect((await readFile(join(dir, key))).toString()).toBe('real audio');
    expect((await segmentRows(noteId))[0]?.audio_key).toBe(key);
  });

  it('saves no audio when the note does not keep audio', async () => {
    const { agent, noteId } = await newNote();

    await upload(agent, noteId, 0).expect(200);

    expect(existsSync(join(dir, 'notes', noteId))).toBe(false);
  });

  it('rejects unsupported audio, oversized audio and a missing file', async () => {
    const { agent, noteId } = await newNote();

    const wrongType = await upload(
      agent,
      noteId,
      0,
      Buffer.from('x'),
      'video/quicktime',
    );
    const tooBig = await upload(
      agent,
      noteId,
      0,
      Buffer.alloc(MAX_CHUNK_BYTES + 1),
    );
    const noFile = await agent
      .post(`/notes/${noteId}/chunks`)
      .field('seq', '0')
      .field('startMs', '0')
      .field('durationMs', '30000');

    expect(wrongType.status).toBe(415);
    expect(wrongType.body.error.code).toBe('UNSUPPORTED_AUDIO');
    expect(tooBig.status).toBe(413);
    expect(tooBig.body.error.code).toBe('FILE_TOO_LARGE');
    expect(noFile.status).toBe(400);
    expect(noFile.body.error.details).toEqual({
      audio: ['Attach the audio file'],
    });
  });

  it('rejects invalid fields', async () => {
    const { agent, noteId } = await newNote();

    const response = await agent
      .post(`/notes/${noteId}/chunks`)
      .field('seq', '-1')
      .field('startMs', 'soon')
      .attach('audio', Buffer.from('x'), {
        filename: 'chunk.webm',
        contentType: 'audio/webm',
      });

    expect(response.status).toBe(400);
    expect(Object.keys(response.body.error.details)).toEqual([
      'seq',
      'startMs',
      'durationMs',
    ]);
  });

  it('rejects a malformed upload with 400, not 500', async () => {
    const { agent, noteId } = await newNote();
    const audio = { filename: 'chunk.webm', contentType: 'audio/webm' };

    const twoFiles = await agent
      .post(`/notes/${noteId}/chunks`)
      .field('seq', '0')
      .field('startMs', '0')
      .field('durationMs', '30000')
      .attach('audio', Buffer.from('a'), audio)
      .attach('audio', Buffer.from('b'), audio);

    let manyFields = agent.post(`/notes/${noteId}/chunks`);
    for (let i = 0; i < 11; i++) manyFields = manyFields.field(`f${i}`, 'x');
    const tooManyFields = await manyFields.attach(
      'audio',
      Buffer.from('a'),
      audio,
    );

    const broken = await agent
      .post(`/notes/${noteId}/chunks`)
      .set('Content-Type', 'multipart/form-data; boundary=xyz')
      .send('--xyz\r\nContent-Disposition: form-data; name="seq"\r\n\r\n0');

    for (const response of [twoFiles, tooManyFields, broken]) {
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it("returns 404 for another user's note", async () => {
    const { noteId } = await newNote();
    const other = await signUpAgent(app, emails);

    const response = await upload(other, noteId, 0);

    expect(response.status).toBe(404);
    expect(await segmentRows(noteId)).toEqual([]);
  });

  it('accepts in-flight chunks after stop and becomes ready with the last one', async () => {
    const { agent, noteId } = await newNote();
    await upload(agent, noteId, 0).expect(200);
    await agent
      .post(`/notes/${noteId}/stop`)
      .send({ durationMs: 60_000, totalChunks: 2 })
      .expect(200);

    await upload(agent, noteId, 1).expect(200);

    const note = await agent.get(`/notes/${noteId}`);
    expect(note.body.note.status).toBe('ready');
  });

  it('rejects new chunks after stop, but returns saved ones once ready', async () => {
    const { agent, noteId } = await newNote();
    await agent
      .post(`/notes/${noteId}/stop`)
      .send({ durationMs: 30_000, totalChunks: 1 })
      .expect(200);

    const beyond = await upload(agent, noteId, 1);
    await upload(agent, noteId, 0).expect(200);
    const callsBeforeRetry = stt.calls.length;
    const retry = await upload(agent, noteId, 0);

    expect(beyond.status).toBe(409);
    expect(beyond.body.error.code).toBe('NOTE_NOT_ACCEPTING_CHUNKS');
    expect(retry.status).toBe(200);
    expect(retry.body.segment.text).toBe('heard: chunk 0');
    // Answered from the database: no second transcription.
    expect(stt.calls.length).toBe(callsBeforeRetry);
  });

  it('returns 503 with Retry-After when transcription can be retried', async () => {
    const { agent, noteId } = await newNote({ keepAudio: true });
    stt.failWith(
      () =>
        new SpeechToTextError('rate limited', {
          retryable: true,
          retryAfterSeconds: 12,
        }),
    );

    const response = await upload(agent, noteId, 0);

    expect(response.status).toBe(503);
    expect(response.headers['retry-after']).toBe('12');
    expect(response.body.error.code).toBe('TRANSCRIPTION_FAILED');
    expect(await segmentRows(noteId)).toEqual([]);
    // The audio was saved before transcribing, so it isn't lost.
    expect(existsSync(join(dir, `notes/${noteId}/chunks/00000.webm`))).toBe(
      true,
    );
  });

  it('becomes ready when stop lands while the last chunk is transcribing', async () => {
    // The browser sends the last chunk and stop together. Hold that chunk
    // inside transcription (after it has read the note) until stop is done.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let holdNext = false;
    const racingApp = createApp({
      db,
      redis,
      config,
      blob,
      speechToText: {
        async transcribe(input) {
          if (holdNext) await held;
          return { text: `heard: ${input.audio.toString()}` };
        },
      },
    });
    const agent = await signUpAgent(racingApp, emails);
    const { body } = await agent.post('/notes').send({});
    const noteId = body.note.id as string;
    await upload(agent, noteId, 0).expect(200);

    holdNext = true;
    const lastChunk = upload(agent, noteId, 1).then((response) => response);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const stop = await agent
      .post(`/notes/${noteId}/stop`)
      .send({ durationMs: 60_000, totalChunks: 2 });
    release();

    expect(stop.body.note.status).toBe('processing');
    expect((await lastChunk).status).toBe(200);
    const note = await agent.get(`/notes/${noteId}`);
    expect(note.body.note.status).toBe('ready');
  });

  it('saves a flagged segment, keeping its audio, when the audio is rejected', async () => {
    const { agent, noteId } = await newNote({ keepAudio: true });
    stt.failWith(
      () => new SpeechToTextError('bad audio', { retryable: false }),
    );

    const response = await upload(agent, noteId, 0);

    expect(response.status).toBe(200);
    expect(response.body.segment).toMatchObject({
      seq: 0,
      text: '',
      transcriptionFailed: true,
    });
    // The kept audio is linked from the segment, not orphaned.
    const key = `notes/${noteId}/chunks/00000.webm`;
    expect(existsSync(join(dir, key))).toBe(true);
    expect(await segmentRows(noteId)).toEqual([
      { seq: 0, raw_text: '', audio_key: key },
    ]);
  });

  it('becomes ready even when a chunk could not be transcribed', async () => {
    const { agent, noteId } = await newNote();
    await upload(agent, noteId, 0).expect(200);
    stt.failWith(
      () => new SpeechToTextError('bad audio', { retryable: false }),
    );
    await upload(agent, noteId, 1).expect(200);

    const stop = await agent
      .post(`/notes/${noteId}/stop`)
      .send({ durationMs: 60_000, totalChunks: 2 });

    expect(stop.body.note.status).toBe('ready');
  });
});
