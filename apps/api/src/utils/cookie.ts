import { Response } from 'express';
import { env } from '../config/env.js';

export const REFRESH_COOKIE_NAME = env.NODE_ENV === 'production' ? '__Host-refresh_token' : 'refresh_token';

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax', // Allow smooth cross-origin refresh development
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}
