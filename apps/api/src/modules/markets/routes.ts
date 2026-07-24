import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ErrorCode, ok, paginationQuerySchema } from '@declawd/shared';
import { ApiError } from '../../plugins/error-handler';
import { getMarketWithLatestSignal, listMarkets } from './service';

const marketsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['OPEN', 'CLOSED', 'RESOLVED', 'INVALID']).optional(),
});

const marketsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/markets', async (request, reply) => {
    const query = marketsQuerySchema.parse(request.query);
    const result = await listMarkets(fastify.prisma, {
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });
    reply.send(ok(result));
  });

  fastify.get('/markets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getMarketWithLatestSignal(fastify.prisma, id);
    if (!result) {
      throw new ApiError(ErrorCode.NOT_FOUND, 'Market not found');
    }
    reply.send(ok(result));
  });
};

export default marketsRoutes;
