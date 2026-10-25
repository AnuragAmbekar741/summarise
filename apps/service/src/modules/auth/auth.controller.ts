import type {
  AuthResponse,
  LoginInput,
  SignupInput,
} from '@summarise/contract';
import type { Request, Response } from 'express';

import { HttpError } from '../../common/error.utils';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import type { AuthService } from './auth.service';
import {
  clearAuthCookies,
  setAccessCookie,
  setRefreshCookie,
} from './utils/auth.utils';
import type { Tokens } from './utils/token.utils';

type AuthControllerDeps = {
  authService: AuthService;
  tokens: Tokens;
  secureCookies: boolean;
};

export function createAuthController({
  authService,
  tokens,
  secureCookies,
}: AuthControllerDeps) {
  async function startSession(res: Response, userId: string) {
    setAccessCookie(res, await tokens.signAccessToken(userId), secureCookies);
    setRefreshCookie(res, await tokens.signRefreshToken(userId), secureCookies);
  }

  // Clears both cookies so the web app stops retrying with a dead session.
  function endSession(res: Response): never {
    clearAuthCookies(res, secureCookies);
    throw new HttpError(401, 'UNAUTHENTICATED', 'Session expired');
  }

  return {
    async signup(req: Request, res: Response<AuthResponse>) {
      const user = await authService.signup(req.body as SignupInput);
      await startSession(res, user.id);
      res.status(201).json({ user });
    },

    async login(req: Request, res: Response<AuthResponse>) {
      const user = await authService.login(req.body as LoginInput);
      await startSession(res, user.id);
      res.status(200).json({ user });
    },

    // Issues a new access token only. The refresh token keeps its original
    // 7-day expiry, so every session ends 7 days after login.
    async refresh(req: Request, res: Response<AuthResponse>) {
      const token: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
      const userId =
        typeof token === 'string'
          ? await tokens.verifyRefreshToken(token)
          : null;
      if (!userId) endSession(res);

      const user = await authService.findUser(userId);
      if (!user) endSession(res);

      setAccessCookie(
        res,
        await tokens.signAccessToken(user.id),
        secureCookies,
      );
      res.status(200).json({ user });
    },

    logout(_req: Request, res: Response) {
      clearAuthCookies(res, secureCookies);
      res.status(204).end();
    },

    async me(req: Request, res: Response<AuthResponse>) {
      // requireAuth runs first and sets userId.
      const user = await authService.getUser(req.userId!);
      res.status(200).json({ user });
    },
  };
}
