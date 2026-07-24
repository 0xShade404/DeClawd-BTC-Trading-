import type { FastifyPluginAsync } from 'fastify';
import { isRedisConnected } from '../../lib/redis';

/**
 * Unauthenticated liveness/readiness endpoint for container healthchecks.
 * Deliberately registered at the app root (not under /api/v1) so
 * orchestrators (Docker/K8s) can probe it without any API versioning
 * concerns.
 */
const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    let dbConnected = true;
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbConnected = false;
    }

    const redisConnected = await isRedisConnected();

    reply.status(dbConnected ? 200 : 503).send({
      status: dbConnected ? 'ok' : 'degraded',
      uptime: process.uptime(),
      dbConnected,
      redisConnected,
    });
  });
};

export default healthRoutes;
