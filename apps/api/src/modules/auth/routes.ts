import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { ErrorCode, JWT_REFRESH_TOKEN_COOKIE, fail, ok, refreshTokenSchema } from '@declawd/shared';
import { env } from '../../config/env';
import { ApiError } from '../../plugins/error-handler';
import { setAuthCookies, clearAuthCookies } from '../../lib/auth-cookies';
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  issueTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  toUserDto,
  upsertUserFromGoogle,
  verifyGoogleIdToken,
} from './service';

const OAUTH_STATE_COOKIE = 'declawd_oauth_state';
const AUTH_RATE_LIMIT = { max: 10, timeWindow: '1 minute' };

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/auth/google',
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const state = randomBytes(16).toString('hex');
      reply.setCookie(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth/google/callback',
        maxAge: 300,
      });
      reply.redirect(buildGoogleAuthUrl(state));
    },
  );

  fastify.get(
    '/auth/google/callback',
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const query = request.query as { code?: string; state?: string; error?: string };

      if (query.error) {
        reply.redirect(`${env.WEB_BASE_URL}/login?error=${encodeURIComponent(query.error)}`);
        return;
      }
      if (!query.code) {
        throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Missing OAuth authorization code');
      }

      const expectedState = request.cookies[OAUTH_STATE_COOKIE];
      reply.clearCookie(OAUTH_STATE_COOKIE, { path: '/api/v1/auth/google/callback' });
      if (!expectedState || !query.state || expectedState !== query.state) {
        throw new ApiError(ErrorCode.FORBIDDEN, 'Invalid or missing OAuth state (possible CSRF)');
      }

      let tokens;
      try {
        tokens = await exchangeGoogleCode(query.code);
      } catch (err) {
        request.log.error({ err }, 'Google token exchange failed');
        throw new ApiError(ErrorCode.PROVIDER_ERROR, 'Failed to exchange Google authorization code');
      }

      const profile = await verifyGoogleIdToken(tokens.id_token).catch((err) => {
        request.log.error({ err }, 'Google id_token verification failed');
        throw new ApiError(ErrorCode.PROVIDER_ERROR, 'Failed to verify Google identity token');
      });

      const { user, isNewUser } = await upsertUserFromGoogle(fastify.prisma, profile);
      const issued = await issueTokens(fastify.prisma, user, {
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      });
      setAuthCookies(reply, issued);

      await fastify.auditLog({
        actorType: 'USER',
        actorId: user.id,
        userId: user.id,
        action: isNewUser ? 'auth.signup' : 'auth.login',
        entityType: 'User',
        entityId: user.id,
        request,
      });

      reply.redirect(env.WEB_BASE_URL);
    },
  );

  fastify.post(
    '/auth/refresh',
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request, reply) => {
      const body = refreshTokenSchema.parse(request.body ?? {});
      const refreshToken = body.refreshToken ?? request.cookies[JWT_REFRESH_TOKEN_COOKIE];
      if (!refreshToken) {
        throw new ApiError(ErrorCode.UNAUTHORIZED, 'No refresh token supplied');
      }

      try {
        const { user, tokens } = await rotateRefreshToken(fastify.prisma, refreshToken, {
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
        });
        setAuthCookies(reply, tokens);
        await fastify.auditLog({
          actorType: 'USER',
          actorId: user.id,
          userId: user.id,
          action: 'auth.refresh',
          entityType: 'User',
          entityId: user.id,
          request,
        });
        reply.send(ok({ user: toUserDto(user) }));
      } catch (err) {
        request.log.warn({ err }, 'Refresh token rotation failed');
        clearAuthCookies(reply);
        reply.status(401).send(fail(ErrorCode.UNAUTHORIZED, 'Invalid or expired refresh token'));
      }
    },
  );

  fastify.post('/auth/logout', async (request, reply) => {
    const refreshToken = request.cookies[JWT_REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
      await revokeRefreshToken(fastify.prisma, refreshToken).catch((err) =>
        request.log.warn({ err }, 'Failed to revoke refresh token on logout'),
      );
    }
    clearAuthCookies(reply);

    if (request.user) {
      await fastify.auditLog({
        actorType: 'USER',
        actorId: request.user.id,
        userId: request.user.id,
        action: 'auth.logout',
        entityType: 'User',
        entityId: request.user.id,
        request,
      });
    }

    reply.send(ok({ loggedOut: true }));
  });

  fastify.get('/auth/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) {
      throw new ApiError(ErrorCode.NOT_FOUND, 'User not found');
    }
    reply.send(ok(toUserDto(user)));
  });
};

export default authRoutes;
