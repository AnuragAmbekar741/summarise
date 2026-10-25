import type { CookieOptions, Response } from 'express';

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
} from './auth.constants';

function baseCookie(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

export function setAccessCookie(res: Response, token: string, secure: boolean) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...baseCookie(secure),
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response, secure: boolean) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookie(secure));
}
