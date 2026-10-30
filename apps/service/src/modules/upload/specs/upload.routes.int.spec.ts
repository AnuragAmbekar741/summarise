import { rm } from 'node:fs/promises';

import { uploadKey } from '@summarise/blob';
import { config } from '@summarise/config';
import { UPLOAD_MAX_BYTES } from '@summarise/contract';
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
describe('upload routes', async () => {
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

  const lecture = {
    fileName: 'Lecture 4 - Graphs.mp3',
    contentType: 'audio/mpeg',
    size: 1024,
  };

  describe('POST /notes/uploads', () => {
    it('creates an uploading note and returns its upload URL', async () => {
      const agent = await signUpAgent(app, emails);

      const response = await agent.post('/notes/uploads').send(lecture);

      expect(response.status).toBe(201);
      expect(response.body.note).toMatchObject({
        title: 'Lecture 4 - Graphs',
        source: 'upload',
        status: 'uploading',
      });
      expect(response.body.uploadUrl).toContain(
        uploadKey(response.body.note.id),
      );
    });

    it('refuses a file that is not audio or video', async () => {
      const agent = await signUpAgent(app, emails);

      const response = await agent
        .post('/notes/uploads')
        .send({ ...lecture, contentType: 'application/pdf' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('refuses a file over 500 MB', async () => {
      const agent = await signUpAgent(app, emails);

      const response = await agent
        .post('/notes/uploads')
        .send({ ...lecture, size: UPLOAD_MAX_BYTES + 1 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('needs a signed-in user', async () => {
      const response = await request(app).post('/notes/uploads').send(lecture);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /notes/:noteId/upload/complete', () => {
    it('moves the note to processing once the file is in the bucket', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes/uploads').send(lecture);
      await blob.put(uploadKey(body.note.id), Buffer.alloc(lecture.size));

      const response = await agent.post(
        `/notes/${body.note.id}/upload/complete`,
      );

      expect(response.status).toBe(200);
      expect(response.body.note).toMatchObject({
        id: body.note.id,
        status: 'processing',
      });
    });

    it('refuses while the file has not arrived', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes/uploads').send(lecture);

      const response = await agent.post(
        `/notes/${body.note.id}/upload/complete`,
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('UPLOAD_NOT_FOUND');
      expect((await agent.get(`/notes/${body.note.id}`)).body.note.status).toBe(
        'uploading',
      );
    });

    it('returns the note again when retried', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes/uploads').send(lecture);
      await blob.put(uploadKey(body.note.id), Buffer.alloc(lecture.size));
      await agent.post(`/notes/${body.note.id}/upload/complete`).expect(200);

      const response = await agent.post(
        `/notes/${body.note.id}/upload/complete`,
      );

      expect(response.status).toBe(200);
      expect(response.body.note.status).toBe('processing');
    });

    it('handles two calls at once', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes/uploads').send(lecture);
      await blob.put(uploadKey(body.note.id), Buffer.alloc(lecture.size));
      const complete = () =>
        agent.post(`/notes/${body.note.id}/upload/complete`);

      const responses = await Promise.all([complete(), complete()]);

      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body.note.status).toBe('processing');
      }
    });

    it('refuses a recorded note', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes').send({});

      const response = await agent.post(
        `/notes/${body.note.id}/upload/complete`,
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('NOTE_NOT_UPLOAD');
    });

    it("returns 404 for another user's note", async () => {
      const agent = await signUpAgent(app, emails);
      const other = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes/uploads').send(lecture);

      const response = await other.post(
        `/notes/${body.note.id}/upload/complete`,
      );

      expect(response.status).toBe(404);
    });

    it('needs a signed-in user', async () => {
      const response = await request(app).post(
        `/notes/${crypto.randomUUID()}/upload/complete`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /notes/:noteId', () => {
    it('deletes the uploaded file with the note', async () => {
      const agent = await signUpAgent(app, emails);
      const { body } = await agent.post('/notes/uploads').send(lecture);
      await blob.put(uploadKey(body.note.id), Buffer.alloc(lecture.size));

      await agent.delete(`/notes/${body.note.id}`).expect(204);

      expect(await blob.head(uploadKey(body.note.id))).toBeUndefined();
    });
  });
});
