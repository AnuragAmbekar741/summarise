import { rm } from 'node:fs/promises';

import { config } from '@summarise/config';
import { createRedisClient } from '@summarise/queue';
import { createDatabase } from '@summarise/storage';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import {
  createFakeSpeechToText,
  createTempBlobStore,
  signUpAgent,
} from '../../../specs/test.utils';

// Runs against the real Postgres and Redis from docker compose. Every test
// signs up its own user; all of them are deleted at the end.
describe('note routes', async () => {
  const db = createDatabase(config.DATABASE_URL);
  const redis = await createRedisClient(config.REDIS_URL);
  const { dir, blob } = createTempBlobStore();
  const app = createApp({
    db,
    redis,
    config,
    blob,
    speechToText: createFakeSpeechToText().speechToText,
  });
  const emails: string[] = [];

  afterAll(async () => {
    await db.$client.query('delete from users where email = any($1)', [emails]);
    await db.$client.end();
    await redis.close();
    await rm(dir, { recursive: true, force: true });
  });

  function uploadChunk(
    agent: request.Agent,
    noteId: string,
    seq: number,
  ): request.Test {
    return agent
      .post(`/notes/${noteId}/chunks`)
      .field('seq', String(seq))
      .field('startMs', String(seq * 30_000))
      .field('durationMs', '30000')
      .attach('audio', Buffer.from(`chunk ${seq}`), {
        filename: 'chunk.webm',
        contentType: 'audio/webm',
      });
  }

  describe('POST /notes', () => {
    it('creates a recording note with defaults', async () => {
      const agent = await signUpAgent(app, emails);

      const response = await agent.post('/notes').send({});

      expect(response.status).toBe(201);
      expect(response.body.note).toMatchObject({
        id: expect.any(String),
        title: 'Untitled note',
        description: null,
        source: 'recording',
        status: 'recording',
        keepAudio: false,
        totalChunks: null,
        endedAt: null,
      });
    });

    it('takes a title and keepAudio', async () => {
      const agent = await signUpAgent(app, emails);

      const response = await agent
        .post('/notes')
        .send({ title: '  Operating Systems ', keepAudio: true });

      expect(response.body.note).toMatchObject({
        title: 'Operating Systems',
        keepAudio: true,
      });
    });

    it('needs a signed-in user', async () => {
      const response = await request(app).post('/notes').send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /notes', () => {
    it("lists only the user's own notes, newest first", async () => {
      const agent = await signUpAgent(app, emails);
      const other = await signUpAgent(app, emails);
      await agent.post('/notes').send({ title: 'First' });
      await other.post('/notes').send({ title: 'Not mine' });
      await agent.post('/notes').send({ title: 'Second' });

      const response = await agent.get('/notes');

      expect(response.status).toBe(200);
      expect(
        response.body.notes.map((note: { title: string }) => note.title),
      ).toEqual(['Second', 'First']);
    });

    it('returns the same note shape as GET /notes/:noteId', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});

      const response = await agent.get('/notes');

      expect(response.body.notes).toEqual([body.note]);
    });

    it('returns an empty list for a new user', async () => {
      const agent = await signUpAgent(app, emails);

      const response = await agent.get('/notes');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ notes: [] });
    });

    it('needs a signed-in user', async () => {
      const response = await request(app).get('/notes');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /notes/:noteId', () => {
    it('returns the note to its owner', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});

      const response = await agent.get(`/notes/${body.note.id}`);

      expect(response.status).toBe(200);
      expect(response.body.note.id).toBe(body.note.id);
    });

    it("returns 404 for another user's note", async () => {
      const owner = await signUpAgent(app, emails);
      const other = await signUpAgent(app, emails);
      const { body } = await owner.post('/notes').send({});

      const response = await other.get(`/notes/${body.note.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      const agent = await signUpAgent(app, emails);

      expect((await agent.get(`/notes/${crypto.randomUUID()}`)).status).toBe(
        404,
      );
      expect((await agent.get('/notes/not-a-uuid')).status).toBe(400);
    });
  });

  describe('PATCH /notes/:noteId', () => {
    it('changes the title and leaves the rest alone', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});

      const response = await agent
        .patch(`/notes/${body.note.id}`)
        .send({ title: '  Compilers ' });

      expect(response.status).toBe(200);
      expect(response.body.note).toEqual({ ...body.note, title: 'Compilers' });
    });

    it('sets the description and clears it with null', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});
      const update = (description: string | null) =>
        agent.patch(`/notes/${body.note.id}`).send({ description });

      expect((await update('Week 3: parsing')).body.note.description).toBe(
        'Week 3: parsing',
      );
      expect((await update(null)).body.note.description).toBeNull();
    });

    it('rejects an empty body and a too-long title', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});

      const empty = await agent.patch(`/notes/${body.note.id}`).send({});
      const tooLong = await agent
        .patch(`/notes/${body.note.id}`)
        .send({ title: 'a'.repeat(201) });

      expect(empty.status).toBe(400);
      expect(tooLong.status).toBe(400);
      expect(Object.keys(tooLong.body.error.details)).toEqual(['title']);
    });

    it("returns 404 for another user's note", async () => {
      const owner = await signUpAgent(app, emails);
      const other = await signUpAgent(app, emails);
      const { body } = await owner.post('/notes').send({});

      const response = await other
        .patch(`/notes/${body.note.id}`)
        .send({ title: 'Mine now' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('needs a signed-in user', async () => {
      const response = await request(app)
        .patch(`/notes/${crypto.randomUUID()}`)
        .send({ title: 'Nope' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /notes/:noteId/stop', () => {
    it('moves to processing while chunks are still missing', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});
      await uploadChunk(agent, body.note.id, 0).expect(200);

      const response = await agent
        .post(`/notes/${body.note.id}/stop`)
        .send({ durationMs: 65_000, totalChunks: 3 });

      expect(response.status).toBe(200);
      expect(response.body.note).toMatchObject({
        status: 'processing',
        totalChunks: 3,
        durationMs: 65_000,
        endedAt: expect.any(String),
      });
    });

    it('is ready straight away when every chunk is already in', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});
      await uploadChunk(agent, body.note.id, 0).expect(200);
      await uploadChunk(agent, body.note.id, 1).expect(200);

      const response = await agent
        .post(`/notes/${body.note.id}/stop`)
        .send({ durationMs: 60_000, totalChunks: 2 });

      expect(response.body.note.status).toBe('ready');
    });

    it('is ready straight away with no chunks at all', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});

      const response = await agent
        .post(`/notes/${body.note.id}/stop`)
        .send({ durationMs: 0, totalChunks: 0 });

      expect(response.body.note.status).toBe('ready');
    });

    it('accepts a retried stop but rejects a different count', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});
      const stop = (totalChunks: number) =>
        agent
          .post(`/notes/${body.note.id}/stop`)
          .send({ durationMs: 90_000, totalChunks });
      await stop(3).expect(200);

      expect((await stop(3)).status).toBe(200);
      const different = await stop(4);
      expect(different.status).toBe(409);
      expect(different.body.error.code).toBe('NOTE_NOT_RECORDING');
    });

    it('rejects an invalid body', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});

      const response = await agent
        .post(`/notes/${body.note.id}/stop`)
        .send({ durationMs: -1 });

      expect(response.status).toBe(400);
      expect(Object.keys(response.body.error.details)).toEqual([
        'durationMs',
        'totalChunks',
      ]);
    });
  });
});
