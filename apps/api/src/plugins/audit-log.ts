import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { AuditActorType, Prisma, PrismaClient } from '@declawd/database';

export interface AuditLogParams {
  actorType: AuditActorType;
  actorId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  request?: FastifyRequest;
}

/**
 * Writes an AuditLog row. Failures are logged but never thrown - an audit
 * trail write should never take down the primary request path.
 */
export async function writeAuditLog(prisma: PrismaClient, params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: params.actorType,
        actorId: params.actorId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: params.request?.ip,
        userAgent: params.request?.headers['user-agent'],
      },
    });
  } catch (err) {
    params.request?.log.error({ err }, `Failed to write audit log for action ${params.action}`);
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    auditLog: (params: AuditLogParams) => Promise<void>;
  }
}

const auditLogPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('auditLog', (params: AuditLogParams) => writeAuditLog(fastify.prisma, params));
};

export default fp(auditLogPlugin, { name: 'audit-log', dependencies: ['prisma'] });
