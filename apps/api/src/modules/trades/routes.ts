import type { FastifyPluginAsync } from 'fastify';
import { ok, paginationQuerySchema } from '@declawd/shared';
import { listTrades } from './service';

const tradesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/trades', async (request, reply) => {
    const query = paginationQuerySchema.parse(request.query);
    const result = await listTrades(fastify.prisma, request.user!.id, query);
    reply.send(ok(result));
  });
};

export default tradesRoutes;
