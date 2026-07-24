import type { FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';
import { JWT_ACCESS_TOKEN_COOKIE, JWT_REFRESH_TOKEN_COOKIE } from '@declawd/shared';
import { env } from '../config/env';
import { ttlToSeconds } from './jwt';

const CSRF_COOKIE = 'declawd_csrf';

const baseCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(reply: FastifyReply, tokens: { accessToken: string; refreshToken: string }): void {
  reply.setCookie(JWT_ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: ttlToSeconds(env.JWT_ACCESS_TTL),
  });
  reply.setCookie(JWT_REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: ttlToSeconds(env.JWT_REFRESH_TTL),
    path: '/api/v1/auth', // refresh token only needs to travel to auth endpoints
  });
  // Double-submit CSRF token: deliberately NOT httpOnly so the frontend can
  // read it and echo it back in the X-CSRF-Token header on mutating requests.
  reply.setCookie(CSRF_COOKIE, randomBytes(24).toString('hex'), {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ttlToSeconds(env.JWT_REFRESH_TTL),
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(JWT_ACCESS_TOKEN_COOKIE, { path: '/' });
  reply.clearCookie(JWT_REFRESH_TOKEN_COOKIE, { path: '/api/v1/auth' });
  reply.clearCookie(CSRF_COOKIE, { path: '/' });
}
