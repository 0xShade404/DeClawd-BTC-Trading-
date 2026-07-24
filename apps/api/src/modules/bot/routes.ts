import type { FastifyPluginAsync } from 'fastify';
import { ErrorCode, ok, paginationQuerySchema } from '@declawd/shared';
import { ApiError } from '../../plugins/error-handler';
import { NotificationService } from '../../notifications/notification-service';
import { BotServiceError, disableBot, enableBot, getBotStatus, listBotRuns } from './service';

const botRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/bot/enable', { preHandler: fastify.verifyCsrf }, async (request, reply) => {
    try {
      await enableBot(fastify.prisma, request.user!.id);
    } catch (err) {
      if (err instanceof BotServiceError) {
        throw new ApiError(ErrorCode.VALIDATION_ERROR, err.message);
      }
      throw err;
    }

    await fastify.auditLog({
      actorType: 'USER',
      actorId: request.user!.id,
      userId: request.user!.id,
      action: 'bot.enabled',
      entityType: 'UserSettings',
      request,
    });

    const notificationService = new NotificationService(fastify.prisma, request.log);
    await notificationService.notify({
      userId: request.user!.id,
      event: 'BOT_STARTED',
      title: 'Trading bot enabled',
      message: 'Your DeClawd trading bot is now active and will begin scanning BTC markets on the next cycle.',
    });

    reply.send(ok({ botEnabled: true }));
  });

  fastify.post('/bot/disable', { preHandler: fastify.verifyCsrf }, async (request, reply) => {
    await disableBot(fastify.prisma, request.user!.id);

    await fastify.auditLog({
      actorType: 'USER',
      actorId: request.user!.id,
      userId: request.user!.id,
      action: 'bot.disabled',
      entityType: 'UserSettings',
      request,
    });

    const notificationService = new NotificationService(fastify.prisma, request.log);
    await notificationService.notify({
      userId: request.user!.id,
      event: 'BOT_STOPPED',
      title: 'Trading bot disabled',
      message: 'Your DeClawd trading bot has been stopped. No new trades will be opened.',
    });

    reply.send(ok({ botEnabled: false }));
  });

  fastify.get('/bot/status', async (request, reply) => {
    reply.send(ok(await getBotStatus(fastify.prisma, request.user!.id)));
  });

  fastify.get('/bot/runs', async (request, reply) => {
    const query = paginationQuerySchema.parse(request.query);
    reply.send(ok(await listBotRuns(fastify.prisma, request.user!.id, query)));
  });
};

export default botRoutes;
