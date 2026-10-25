import { jwtVerify, SignJWT } from 'jose';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';

type TokenType = 'access' | 'refresh';
type TokenSecrets = { accessSecret: string; refreshSecret: string };

export function createTokens({ accessSecret, refreshSecret }: TokenSecrets) {
  const encoder = new TextEncoder();
  const keys = {
    access: encoder.encode(accessSecret),
    refresh: encoder.encode(refreshSecret),
  };
  const ttls = {
    access: ACCESS_TOKEN_TTL_SECONDS,
    refresh: REFRESH_TOKEN_TTL_SECONDS,
  };

  function sign(type: TokenType, userId: string) {
    return new SignJWT({ type })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${ttls[type]}s`)
      .sign(keys[type]);
  }

  // Returns the user id, or null for a missing, expired, tampered or
  // wrong-type token.
  async function verify(type: TokenType, token: string) {
    try {
      const { payload } = await jwtVerify(token, keys[type], {
        algorithms: ['HS256'],
      });
      return payload.type === type && payload.sub ? payload.sub : null;
    } catch {
      return null;
    }
  }

  return {
    signAccessToken: (userId: string) => sign('access', userId),
    signRefreshToken: (userId: string) => sign('refresh', userId),
    verifyAccessToken: (token: string) => verify('access', token),
    verifyRefreshToken: (token: string) => verify('refresh', token),
  };
}

export type Tokens = ReturnType<typeof createTokens>;
