import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ok, paginationQuerySchema } from '@declawd/shared';
import { listPositions } from './service';

const positionsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['open', 'closed']).optional(),
});

const positionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/positions', async (request, reply) => {
    const query = positionsQuerySchema.parse(request.query);
    const result = await listPositions(fastify.prisma, request.user!.id, {
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });
    reply.send(ok(result));
  });
};

export default positionsRoutes;
