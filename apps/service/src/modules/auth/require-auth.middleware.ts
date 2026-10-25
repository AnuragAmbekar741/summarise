import type { RequestHandler } from 'express';

import { HttpError } from '../../common/error.utils';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';
import type { Tokens } from './utils/token.utils';

// Lets the request through only with a valid access cookie, and sets
// req.userId for the handlers after it.
export function requireAuth(tokens: Tokens): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies?.[ACCESS_TOKEN_COOKIE];
    const userId =
      typeof token === 'string' ? await tokens.verifyAccessToken(token) : null;
    if (!userId) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Not signed in');
    }
    req.userId = userId;
    next();
  };
}
