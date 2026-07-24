import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { API_VERSION } from '@declawd/shared';
import { env } from './config/env';

import prismaPlugin from './plugins/prisma';
import errorHandlerPlugin from './plugins/error-handler';
import securityPlugin from './plugins/security';
import swaggerPlugin from './plugins/swagger';
import authPlugin from './plugins/auth';
import auditLogPlugin from './plugins/audit-log';

import healthRoutes from './modules/health/routes';
import authRoutes from './modules/auth/routes';
import walletRoutes from './modules/wallet/routes';
import dashboardRoutes from './modules/dashboard/routes';
import marketsRoutes from './modules/markets/routes';
import positionsRoutes from './modules/positions/routes';
import tradesRoutes from './modules/trades/routes';
import ledgerRoutes from './modules/ledger/routes';
import withdrawalsRoutes from './modules/withdrawals/routes';
import settingsRoutes from './modules/settings/routes';
import botRoutes from './modules/bot/routes';
import adminRoutes from './modules/admin/routes';

function defaultLoggerOptions(): FastifyServerOptions['logger'] {
  if (env.NODE_ENV === 'test') return false;
  if (env.NODE_ENV === 'development') {
    return {
      level: env.LOG_LEVEL,
      transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    };
  }
  return { level: env.LOG_LEVEL };
}

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
}

/**
 * Builds and fully configures a Fastify instance (plugins + routes) without
 * calling `.listen()`, so it can be reused both by src/server.ts and by
 * tests via `fastify.inject()`.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const fastify = Fastify({
    logger: options.logger ?? defaultLoggerOptions(),
    trustProxy: true,
  });

  fastify.register(errorHandlerPlugin);
  fastify.register(prismaPlugin);
  fastify.register(securityPlugin);
  fastify.register(swaggerPlugin);
  fastify.register(authPlugin);
  fastify.register(auditLogPlugin);

  // Unauthenticated, unversioned - container healthchecks probe this directly.
  fastify.register(healthRoutes);

  fastify.register(
    async (api) => {
      api.register(authRoutes);
      api.register(walletRoutes);
      api.register(dashboardRoutes);
      api.register(marketsRoutes);
      api.register(positionsRoutes);
      api.register(tradesRoutes);
      api.register(ledgerRoutes);
      api.register(withdrawalsRoutes);
      api.register(settingsRoutes);
      api.register(botRoutes);
      api.register(adminRoutes);
    },
    { prefix: `/api/${API_VERSION}` },
  );

  return fastify;
}
