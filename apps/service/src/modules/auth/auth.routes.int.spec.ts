import { config } from '@summarise/config';
import { createRedisClient } from '@summarise/queue';
import { createDatabase } from '@summarise/storage';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';

// Runs against the real Postgres and Redis from docker compose. Each test
// signs up its own random email and deletes it afterwards, so local data is
// never touched.
describe('auth routes', async () => {
  const db = createDatabase(config.DATABASE_URL);
  const redis = await createRedisClient(config.REDIS_URL);
  const app = createApp({ db, redis, config });
  const createdEmails: string[] = [];

  afterAll(async () => {
    await db.$client.query('delete from users where email = any($1)', [
      createdEmails,
    ]);
    await db.$client.end();
    await redis.close();
  });

  function newUser() {
    const email = `test+${crypto.randomUUID()}@example.com`;
    createdEmails.push(email);
    return { name: 'Test User', email, password: 'correct horse' };
  }

  function signup(body: object) {
    return request(app).post('/auth/signup').send(body);
  }

  function cookieFrom(response: request.Response, name: string) {
    const cookies = [response.headers['set-cookie'] ?? []].flat();
    return cookies.find((cookie) => cookie.startsWith(`${name}=`));
  }

  describe('POST /auth/signup', () => {
    it('creates the user and sets the access cookie', async () => {
      const user = newUser();

      const response = await signup(user);

      expect(response.status).toBe(201);
      expect(response.body.user).toEqual({
        id: expect.any(String),
        name: user.name,
        email: user.email,
        createdAt: expect.any(String),
      });
      const cookie = cookieFrom(response, ACCESS_TOKEN_COOKIE);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    });

    it('normalises the email', async () => {
      const user = newUser();

      const response = await signup({
        ...user,
        email: `  ${user.email.toUpperCase()} `,
      });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe(user.email);
    });

    it('rejects a taken email with 409', async () => {
      const user = newUser();
      await signup(user);

      const response = await signup(user);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('rejects an invalid body with 400', async () => {
      const response = await signup({
        name: '',
        email: 'nope',
        password: 'short',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(response.body.error.details)).toEqual([
        'name',
        'email',
        'password',
      ]);
    });

    it('rejects malformed JSON with 400', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .set('Content-Type', 'application/json')
        .send('{"name":');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('signs in with the right password', async () => {
      const user = newUser();
      await signup(user);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: user.email, password: user.password });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(user.email);
      expect(cookieFrom(response, ACCESS_TOKEN_COOKIE)).toBeDefined();
    });

    it('rejects a wrong password with 401', async () => {
      const user = newUser();
      await signup(user);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: user.email, password: 'wrong horse' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(cookieFrom(response, ACCESS_TOKEN_COOKIE)).toBeUndefined();
    });

    it('rejects an unknown email with the same 401', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'correct horse' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /auth/me', () => {
    it('returns the signed-in user', async () => {
      const agent = request.agent(app);
      const user = newUser();
      await agent.post('/auth/signup').send(user);

      const response = await agent.get('/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(user.email);
    });

    it('returns 401 without a cookie', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 401 with a broken cookie', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE}=not.a.jwt`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the cookie so /auth/me fails', async () => {
      const agent = request.agent(app);
      await agent.post('/auth/signup').send(newUser());

      const response = await agent.post('/auth/logout');

      expect(response.status).toBe(204);
      expect(cookieFrom(response, ACCESS_TOKEN_COOKIE)).toContain('Expires=');
      expect((await agent.get('/auth/me')).status).toBe(401);
    });
  });
});
