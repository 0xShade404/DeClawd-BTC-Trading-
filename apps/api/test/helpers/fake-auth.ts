import { JWT_ACCESS_TOKEN_COOKIE } from '@declawd/shared';
import { signAccessToken } from '../../src/lib/jwt';

export const FAKE_USER_ID = 'test-user-id';
export const FAKE_CSRF_TOKEN = 'test-csrf-token';

/** Builds Cookie/X-CSRF-Token headers for an authenticated, CSRF-valid test request. */
export function authHeaders(overrides: { role?: 'USER' | 'ADMIN' | 'SUPPORT'; withCsrf?: boolean } = {}) {
  const accessToken = signAccessToken({
    sub: FAKE_USER_ID,
    email: 'test@example.com',
    role: overrides.role ?? 'USER',
  });

  const cookies = [`${JWT_ACCESS_TOKEN_COOKIE}=${accessToken}`];
  if (overrides.withCsrf !== false) {
    cookies.push(`declawd_csrf=${FAKE_CSRF_TOKEN}`);
  }

  const headers: Record<string, string> = { cookie: cookies.join('; ') };
  if (overrides.withCsrf !== false) {
    headers['x-csrf-token'] = FAKE_CSRF_TOKEN;
  }
  return headers;
}
