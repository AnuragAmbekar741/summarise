import { jwtVerify, SignJWT } from 'jose';

import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants';

type TokenSecrets = { accessSecret: string };

export function createTokens({ accessSecret }: TokenSecrets) {
  const accessKey = new TextEncoder().encode(accessSecret);

  return {
    signAccessToken(userId: string) {
      return new SignJWT({ type: 'access' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
        .sign(accessKey);
    },

    // Returns the user id, or null for a missing, expired, tampered or
    // wrong-type token.
    async verifyAccessToken(token: string): Promise<string | null> {
      try {
        const { payload } = await jwtVerify(token, accessKey, {
          algorithms: ['HS256'],
        });
        return payload.type === 'access' && payload.sub ? payload.sub : null;
      } catch {
        return null;
      }
    },
  };
}

export type Tokens = ReturnType<typeof createTokens>;
