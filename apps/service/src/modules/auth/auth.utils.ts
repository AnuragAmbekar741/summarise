import type { CookieOptions, Response } from 'express';

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';

function accessCookie(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

function refreshCookie(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: REFRESH_TOKEN_COOKIE_PATH,
  };
}

export function setAccessCookie(res: Response, token: string, secure: boolean) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...accessCookie(secure),
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
}

export function setRefreshCookie(
  res: Response,
  token: string,
  secure: boolean,
) {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...refreshCookie(secure),
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response, secure: boolean) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, accessCookie(secure));
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookie(secure));
}
