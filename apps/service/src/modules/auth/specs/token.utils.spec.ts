import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../auth.constants';
import { createTokens } from '../utils/token.utils';

const accessSecret = 'a'.repeat(32);
const refreshSecret = 'r'.repeat(32);
const tokens = createTokens({ accessSecret, refreshSecret });
const userId = '6f1c2a4e-1b7d-4c1e-9a8f-0d2b3c4e5f60';

afterEach(() => vi.useRealTimers());

describe('access tokens', () => {
  it('round-trips the user id', async () => {
    const token = await tokens.signAccessToken(userId);

    expect(await tokens.verifyAccessToken(token)).toBe(userId);
  });

  it('rejects an expired token', async () => {
    vi.useFakeTimers();
    const token = await tokens.signAccessToken(userId);
    vi.advanceTimersByTime((ACCESS_TOKEN_TTL_SECONDS + 1) * 1000);

    expect(await tokens.verifyAccessToken(token)).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const token = await tokens.signAccessToken(userId);
    const tampered = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');

    expect(await tokens.verifyAccessToken(tampered)).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const other = createTokens({
      accessSecret: 'b'.repeat(32),
      refreshSecret,
    });
    const token = await other.signAccessToken(userId);

    expect(await tokens.verifyAccessToken(token)).toBeNull();
  });

  it('rejects a token of another type signed with the access secret', async () => {
    const token = await new SignJWT({ type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(accessSecret));

    expect(await tokens.verifyAccessToken(token)).toBeNull();
  });

  it('rejects a refresh token', async () => {
    const token = await tokens.signRefreshToken(userId);

    expect(await tokens.verifyAccessToken(token)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await tokens.verifyAccessToken('not.a.jwt')).toBeNull();
  });
});

describe('refresh tokens', () => {
  it('round-trips the user id', async () => {
    const token = await tokens.signRefreshToken(userId);

    expect(await tokens.verifyRefreshToken(token)).toBe(userId);
  });

  it('is still valid just before 7 days', async () => {
    vi.useFakeTimers();
    const token = await tokens.signRefreshToken(userId);
    vi.advanceTimersByTime((REFRESH_TOKEN_TTL_SECONDS - 60) * 1000);

    expect(await tokens.verifyRefreshToken(token)).toBe(userId);
  });

  it('rejects an expired token', async () => {
    vi.useFakeTimers();
    const token = await tokens.signRefreshToken(userId);
    vi.advanceTimersByTime((REFRESH_TOKEN_TTL_SECONDS + 1) * 1000);

    expect(await tokens.verifyRefreshToken(token)).toBeNull();
  });

  it('rejects an access token', async () => {
    const token = await tokens.signAccessToken(userId);

    expect(await tokens.verifyRefreshToken(token)).toBeNull();
  });
});
