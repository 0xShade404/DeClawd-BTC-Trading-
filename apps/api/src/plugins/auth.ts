import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { ErrorCode, JWT_ACCESS_TOKEN_COOKIE } from '@declawd/shared';
import type { UserRole } from '@declawd/database';
import { verifyAccessToken } from '../lib/jwt';
import { ApiError } from './error-handler';

const CSRF_COOKIE = 'declawd_csrf';
const CSRF_HEADER = 'x-csrf-token';

function extractAccessToken(request: FastifyRequest): string | null {
  const cookieToken = request.cookies[JWT_ACCESS_TOKEN_COOKIE];
  if (cookieToken) {
    // Cookie is set with @fastify/cookie's `signed` option off (we sign
    // sensitive cookies manually via JWT itself), so no unsign step needed.
    return cookieToken;
  }
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }
  return null;
}

/**
 * Decorates the Fastify instance with authentication/authorization
 * preHandlers:
 *  - `authenticate`: verifies the access-token JWT (cookie or Authorization
 *    header) and populates `request.user`.
 *  - `requireRole(...roles)`: must run after `authenticate`; rejects unless
 *    the caller's role is in the allow-list (ADMIN always passes).
 *  - `verifyCsrf`: double-submit-cookie CSRF check for cookie-authenticated,
 *    state-changing requests. Routes that already carry their own
 *    proof-of-intent (a fresh wallet signature, e.g. /wallet/link and
 *    /withdrawals) are exempt - the signature itself is unforgeable
 *    cross-site proof, which is a stronger guarantee than CSRF tokens.
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    const token = extractAccessToken(request);
    if (!token) {
      throw new ApiError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }
    try {
      const payload = verifyAccessToken(token);
      request.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      throw new ApiError(ErrorCode.UNAUTHORIZED, 'Invalid or expired access token');
    }
  });

  fastify.decorate('requireRole', (...roles: UserRole[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      if (!request.user) {
        throw new ApiError(ErrorCode.UNAUTHORIZED, 'Authentication required');
      }
      if (request.user.role === 'ADMIN') return;
      if (!roles.includes(request.user.role)) {
        throw new ApiError(ErrorCode.FORBIDDEN, 'Insufficient permissions');
      }
    };
  });

  fastify.decorate('verifyCsrf', async (request: FastifyRequest, _reply: FastifyReply) => {
    const cookieValue = request.cookies[CSRF_COOKIE];
    const headerValue = request.headers[CSRF_HEADER];
    if (!cookieValue || !headerValue || cookieValue !== headerValue) {
      throw new ApiError(ErrorCode.FORBIDDEN, 'Missing or invalid CSRF token');
    }
  });
};

export default fp(authPlugin, { name: 'auth' });
export { CSRF_COOKIE, CSRF_HEADER };
