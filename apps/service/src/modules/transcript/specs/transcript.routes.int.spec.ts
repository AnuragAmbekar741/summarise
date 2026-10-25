import { rm } from 'node:fs/promises';

import { config } from '@summarise/config';
import { createRedisClient } from '@summarise/queue';
import { createDatabase } from '@summarise/storage';
import type request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import {
  createFakeSpeechToText,
  createTempBlobStore,
  signUpAgent,
} from '../../../specs/test.utils';

// Runs against the real Postgres and Redis from docker compose.
describe('transcript routes', async () => {
  const db = createDatabase(config.DATABASE_URL);
  const redis = await createRedisClient(config.REDIS_URL);
  const { dir, blob } = createTempBlobStore();
  const app = createApp({
    db,
    redis,
    config,
    blob,
    speechToText: createFakeSpeechToText(
      (input) => `text of ${input.audio.toString()}`,
    ).speechToText,
  });
  const emails: string[] = [];

  afterAll(async () => {
    await db.$client.query('delete from users where email = any($1)', [emails]);
    await db.$client.end();
    await redis.close();
    await rm(dir, { recursive: true, force: true });
  });

  async function newNote() {
    const agent = await signUpAgent(app, emails);
    const response = await agent.post('/notes').send({});
    return { agent, noteId: response.body.note.id as string };
  }

  function upload(agent: request.Agent, noteId: string, seq: number) {
    return agent
      .post(`/notes/${noteId}/chunks`)
      .field('seq', String(seq))
      .field('startMs', String(seq * 30_000))
      .field('durationMs', '30000')
      .attach('audio', Buffer.from(`chunk ${seq}`), {
        filename: 'chunk.webm',
        contentType: 'audio/webm',
      })
      .expect(200);
  }

  it('is empty for a new note', async () => {
    const { agent, noteId } = await newNote();

    const response = await agent.get(`/notes/${noteId}/transcript`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'recording', segments: [] });
  });

  it('returns segments in seq order whatever order they arrived in', async () => {
    const { agent, noteId } = await newNote();
    await upload(agent, noteId, 2);
    await upload(agent, noteId, 0);
    await upload(agent, noteId, 1);

    const response = await agent.get(`/notes/${noteId}/transcript`);

    expect(response.body.segments).toEqual([
      { seq: 0, startMs: 0, endMs: 30_000, text: 'text of chunk 0' },
      { seq: 1, startMs: 30_000, endMs: 60_000, text: 'text of chunk 1' },
      { seq: 2, startMs: 60_000, endMs: 90_000, text: 'text of chunk 2' },
    ]);
  });

  it("shows the user's edit instead of the raw text", async () => {
    const { agent, noteId } = await newNote();
    await upload(agent, noteId, 0);
    await db.$client.query(
      'update transcript_segments set edited_text = $1 where note_id = $2',
      ['fixed by hand', noteId],
    );

    const response = await agent.get(`/notes/${noteId}/transcript`);

    expect(response.body.segments[0].text).toBe('fixed by hand');
  });

  it('reports the note status', async () => {
    const { agent, noteId } = await newNote();
    await upload(agent, noteId, 0);
    await agent
      .post(`/notes/${noteId}/stop`)
      .send({ durationMs: 30_000, totalChunks: 1 })
      .expect(200);

    const response = await agent.get(`/notes/${noteId}/transcript`);

    expect(response.body.status).toBe('ready');
  });

  it("returns 404 for another user's note", async () => {
    const { noteId } = await newNote();
    const other = await signUpAgent(app, emails);

    const response = await other.get(`/notes/${noteId}/transcript`);

    expect(response.status).toBe(404);
  });
});
