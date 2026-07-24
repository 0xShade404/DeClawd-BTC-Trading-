import type { FastifyPluginAsync } from 'fastify';
import { ok, updateNotificationPreferenceSchema, updateSettingsSchema } from '@declawd/shared';
import {
  getOrCreateSettings,
  listNotificationPreferences,
  toNotificationPreferenceDto,
  toUserSettingsDto,
  updateSettings,
  upsertNotificationPreference,
} from './service';

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/settings', async (request, reply) => {
    const settings = await getOrCreateSettings(fastify.prisma, request.user!.id);
    reply.send(ok(toUserSettingsDto(settings)));
  });

  fastify.patch('/settings', { preHandler: fastify.verifyCsrf }, async (request, reply) => {
    const input = updateSettingsSchema.parse(request.body);
    const settings = await updateSettings(fastify.prisma, request.user!.id, input);

    await fastify.auditLog({
      actorType: 'USER',
      actorId: request.user!.id,
      userId: request.user!.id,
      action: 'settings.updated',
      entityType: 'UserSettings',
      entityId: settings.id,
      metadata: input,
      request,
    });

    reply.send(ok(toUserSettingsDto(settings)));
  });

  fastify.get('/settings/notifications', async (request, reply) => {
    reply.send(ok(await listNotificationPreferences(fastify.prisma, request.user!.id)));
  });

  fastify.patch('/settings/notifications', { preHandler: fastify.verifyCsrf }, async (request, reply) => {
    const input = updateNotificationPreferenceSchema.parse(request.body);
    const pref = await upsertNotificationPreference(fastify.prisma, request.user!.id, input);

    await fastify.auditLog({
      actorType: 'USER',
      actorId: request.user!.id,
      userId: request.user!.id,
      action: 'notification_preference.updated',
      entityType: 'NotificationPreference',
      entityId: pref.id,
      metadata: { channel: input.channel, event: input.event, enabled: input.enabled },
      request,
    });

    reply.send(ok(toNotificationPreferenceDto(pref)));
  });
};

export default settingsRoutes;
