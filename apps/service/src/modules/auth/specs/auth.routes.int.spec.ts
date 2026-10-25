import { config } from '@summarise/config';
import { createRedisClient } from '@summarise/queue';
import { createDatabase } from '@summarise/storage';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../auth.constants';

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

  // "name=value" from a Set-Cookie header, ready to send back.
  function cookiePair(response: request.Response, name: string) {
    const cookie = cookieFrom(response, name);
    if (!cookie) throw new Error(`no ${name} cookie`);
    return cookie.split(';')[0]!;
  }

  describe('POST /auth/signup', () => {
    it('creates the user and sets both cookies', async () => {
      const user = newUser();

      const response = await signup(user);

      expect(response.status).toBe(201);
      expect(response.body.user).toEqual({
        id: expect.any(String),
        name: user.name,
        email: user.email,
        createdAt: expect.any(String),
      });
      const access = cookieFrom(response, ACCESS_TOKEN_COOKIE);
      expect(access).toContain('HttpOnly');
      expect(access).toContain('SameSite=Lax');
      expect(access).toContain('Path=/;');
      const refresh = cookieFrom(response, REFRESH_TOKEN_COOKIE);
      expect(refresh).toContain('HttpOnly');
      expect(refresh).toContain('Path=/auth;');
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
      expect(cookieFrom(response, REFRESH_TOKEN_COOKIE)).toBeDefined();
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

  describe('POST /auth/refresh', () => {
    it('issues a new access token and keeps the refresh token', async () => {
      const agent = request.agent(app);
      const user = newUser();
      await agent.post('/auth/signup').send(user);

      const response = await agent.post('/auth/refresh');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(user.email);
      expect(cookieFrom(response, ACCESS_TOKEN_COOKIE)).toContain('HttpOnly');
      expect(cookieFrom(response, REFRESH_TOKEN_COOKIE)).toBeUndefined();
    });

    it('works with only the refresh cookie, and its access token works', async () => {
      const signupResponse = await signup(newUser());
      const refresh = cookiePair(signupResponse, REFRESH_TOKEN_COOKIE);

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', refresh);
      const me = await request(app)
        .get('/auth/me')
        .set('Cookie', cookiePair(response, ACCESS_TOKEN_COOKIE));

      expect(response.status).toBe(200);
      expect(me.status).toBe(200);
      expect(me.body.user.id).toBe(signupResponse.body.user.id);
    });

    it('returns 401 without a refresh cookie', async () => {
      const response = await request(app).post('/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
      expect(cookieFrom(response, ACCESS_TOKEN_COOKIE)).toContain('Expires=');
      expect(cookieFrom(response, REFRESH_TOKEN_COOKIE)).toContain('Expires=');
    });

    it('rejects an access token sent as the refresh cookie', async () => {
      const signupResponse = await signup(newUser());
      const access = cookiePair(signupResponse, ACCESS_TOKEN_COOKIE).split(
        '=',
      )[1];

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${access}`);

      expect(response.status).toBe(401);
    });

    it('returns 401 once the user is deleted', async () => {
      const agent = request.agent(app);
      const user = newUser();
      await agent.post('/auth/signup').send(user);
      await db.$client.query('delete from users where email = $1', [
        user.email,
      ]);

      const response = await agent.post('/auth/refresh');

      expect(response.status).toBe(401);
      expect(cookieFrom(response, REFRESH_TOKEN_COOKIE)).toContain('Expires=');
    });
  });

  describe('POST /auth/logout', () => {
    it('clears both cookies so /auth/me and /auth/refresh fail', async () => {
      const agent = request.agent(app);
      await agent.post('/auth/signup').send(newUser());

      const response = await agent.post('/auth/logout');

      expect(response.status).toBe(204);
      expect(cookieFrom(response, ACCESS_TOKEN_COOKIE)).toContain('Expires=');
      expect(cookieFrom(response, REFRESH_TOKEN_COOKIE)).toContain('Expires=');
      expect((await agent.get('/auth/me')).status).toBe(401);
      expect((await agent.post('/auth/refresh')).status).toBe(401);
    });
  });
});
