import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@declawd/database';

/**
 * Decorates the Fastify instance with the shared Prisma singleton from
 * @declawd/database. Connection lifecycle (disconnect on shutdown) is
 * handled in src/server.ts, not here, so this plugin stays test-friendly
 * (buildApp() never needs a live DB connection just to construct routes).
 */
const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('prisma', prisma);
};

export default fp(prismaPlugin, { name: 'prisma' });
