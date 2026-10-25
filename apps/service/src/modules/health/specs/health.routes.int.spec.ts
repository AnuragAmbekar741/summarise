import { config } from '@summarise/config';
import { createRedisClient } from '@summarise/queue';
import { createDatabase } from '@summarise/storage';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import {
  createFakeSpeechToText,
  createTempBlobStore,
} from '../../../specs/test.utils';

// Runs against the real Postgres and Redis from docker compose.
describe('GET /health', async () => {
  const db = createDatabase(config.DATABASE_URL);
  const redis = await createRedisClient(config.REDIS_URL);
  const app = createApp({
    db,
    redis,
    config,
    blob: createTempBlobStore().blob,
    speechToText: createFakeSpeechToText().speechToText,
  });

  afterAll(() => db.$client.end());

  it('returns 200 when Postgres and Redis are up', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      postgres: 'up',
      redis: 'up',
    });
  });

  it('returns 503 when Redis is down', async () => {
    await redis.close();

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'error',
      postgres: 'up',
      redis: 'down',
    });
  });
});
