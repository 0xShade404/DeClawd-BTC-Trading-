import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createWithdrawalSchema, ErrorCode, ok, paginationQuerySchema } from '@declawd/shared';
import { ApiError } from '../../plugins/error-handler';
import { createWithdrawal, listWithdrawals, requestWithdrawalNonce, toWithdrawalDto, WithdrawalVerificationError } from './service';

const WITHDRAWAL_RATE_LIMIT = { max: 5, timeWindow: '1 minute' };

const withdrawalNonceRequestSchema = z.object({
  amountUsd: z.number().positive(),
  destinationAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const withdrawalsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post(
    '/withdrawals/nonce',
    { config: { rateLimit: WITHDRAWAL_RATE_LIMIT } },
    async (request, reply) => {
      const input = withdrawalNonceRequestSchema.parse(request.body);
      try {
        const result = await requestWithdrawalNonce(fastify.prisma, request.user!.id, input);
        reply.send(ok(result));
      } catch (err) {
        if (err instanceof WithdrawalVerificationError) {
          throw new ApiError(ErrorCode.VALIDATION_ERROR, err.message);
        }
        throw err;
      }
    },
  );

  // Exempt from CSRF: protected by a fresh wallet signature over an
  // amount+destination-bound message, the same rationale as /wallet/link.
  fastify.post(
    '/withdrawals',
    { config: { rateLimit: WITHDRAWAL_RATE_LIMIT } },
    async (request, reply) => {
      const input = createWithdrawalSchema.parse(request.body);
      try {
        const withdrawal = await createWithdrawal(fastify.prisma, request.user!.id, input);
        await fastify.auditLog({
          actorType: 'USER',
          actorId: request.user!.id,
          userId: request.user!.id,
          action: 'withdrawal.created',
          entityType: 'Withdrawal',
          entityId: withdrawal.id,
          metadata: { amountUsd: input.amountUsd, sourceAccount: input.sourceAccount },
          request,
        });
        reply.status(201).send(ok(toWithdrawalDto(withdrawal)));
      } catch (err) {
        if (err instanceof WithdrawalVerificationError) {
          throw new ApiError(ErrorCode.WALLET_VERIFICATION_FAILED, err.message);
        }
        throw err;
      }
    },
  );

  fastify.get('/withdrawals', async (request, reply) => {
    const query = paginationQuerySchema.parse(request.query);
    const result = await listWithdrawals(fastify.prisma, request.user!.id, query);
    reply.send(ok(result));
  });
};

export default withdrawalsRoutes;
