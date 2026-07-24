import type { FastifyPluginAsync } from 'fastify';
import { ok } from '@declawd/shared';
import type { LedgerAccountDto } from '@declawd/shared';
import { LedgerService } from '@declawd/trading-engine';

const ledgerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/ledger/accounts', async (request, reply) => {
    const ledgerService = new LedgerService(fastify.prisma);
    const { tradingPool, vault } = await ledgerService.getOrCreateAccounts(request.user!.id);

    const dtos: LedgerAccountDto[] = [
      { type: 'TRADING_POOL', balanceUsd: tradingPool.balance.toString(), updatedAt: tradingPool.updatedAt.toISOString() },
      { type: 'PROTECTED_VAULT', balanceUsd: vault.balance.toString(), updatedAt: vault.updatedAt.toISOString() },
    ];

    reply.send(ok(dtos));
  });
};

export default ledgerRoutes;
