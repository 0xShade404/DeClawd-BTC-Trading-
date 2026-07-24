import type { FastifyPluginAsync } from 'fastify';
import { ok } from '@declawd/shared';
import { getDashboardSummary } from './service';

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/dashboard/summary', async (request, reply) => {
    reply.send(ok(await getDashboardSummary(fastify.prisma, request.user!.id)));
  });
};

export default dashboardRoutes;
