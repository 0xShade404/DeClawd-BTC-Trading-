import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ok, paginationQuerySchema } from '@declawd/shared';
import { getAdminHealth, getPlatformMetrics, listAllPositions, listAuditLogs, listUsers } from './service';

const positionsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['open', 'closed']).optional(),
});

/** All routes here require the ADMIN role. */
const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.requireRole('ADMIN'));

  fastify.get('/admin/users', async (request, reply) => {
    const query = paginationQuerySchema.parse(request.query);
    reply.send(ok(await listUsers(fastify.prisma, query)));
  });

  fastify.get('/admin/metrics', async (_request, reply) => {
    reply.send(ok(await getPlatformMetrics(fastify.prisma)));
  });

  fastify.get('/admin/positions', async (request, reply) => {
    const query = positionsQuerySchema.parse(request.query);
    reply.send(ok(await listAllPositions(fastify.prisma, query)));
  });

  fastify.get('/admin/logs', async (request, reply) => {
    const query = paginationQuerySchema.parse(request.query);
    reply.send(ok(await listAuditLogs(fastify.prisma, query)));
  });

  fastify.get('/admin/health', async (_request, reply) => {
    reply.send(ok(await getAdminHealth(fastify.prisma)));
  });
};

export default adminRoutes;
