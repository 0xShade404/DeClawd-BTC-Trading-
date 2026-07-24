import type { FastifyPluginAsync } from 'fastify';
import { ErrorCode, linkWalletSchema, ok, walletNonceRequestSchema } from '@declawd/shared';
import { ApiError } from '../../plugins/error-handler';
import { deleteWallet, linkWallet, listWallets, requestWalletLinkNonce, toWalletDto, WalletVerificationError } from './service';

const walletRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/wallet/nonce', async (request, reply) => {
    const input = walletNonceRequestSchema.parse(request.body);
    const result = await requestWalletLinkNonce(input.address);
    reply.send(ok(result));
  });

  // Exempt from CSRF: the wallet signature itself is unforgeable cross-site
  // proof of intent (an attacker cannot make the victim's wallet sign
  // anything), a stronger guarantee than a CSRF token.
  fastify.post('/wallet/link', async (request, reply) => {
    const input = linkWalletSchema.parse(request.body);

    try {
      const wallet = await linkWallet(fastify.prisma, request.user!.id, input);
      await fastify.auditLog({
        actorType: 'USER',
        actorId: request.user!.id,
        userId: request.user!.id,
        action: 'wallet.linked',
        entityType: 'Wallet',
        entityId: wallet.id,
        metadata: { address: wallet.address, chainId: wallet.chainId },
        request,
      });
      reply.send(ok(toWalletDto(wallet)));
    } catch (err) {
      if (err instanceof WalletVerificationError) {
        throw new ApiError(ErrorCode.WALLET_VERIFICATION_FAILED, err.message);
      }
      throw err;
    }
  });

  fastify.get('/wallet', async (request, reply) => {
    reply.send(ok(await listWallets(fastify.prisma, request.user!.id)));
  });

  fastify.delete(
    '/wallet/:id',
    { preHandler: fastify.verifyCsrf },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        await deleteWallet(fastify.prisma, request.user!.id, id);
        await fastify.auditLog({
          actorType: 'USER',
          actorId: request.user!.id,
          userId: request.user!.id,
          action: 'wallet.unlinked',
          entityType: 'Wallet',
          entityId: id,
          request,
        });
        reply.send(ok({ deleted: true }));
      } catch (err) {
        if (err instanceof WalletVerificationError) {
          throw new ApiError(ErrorCode.NOT_FOUND, err.message);
        }
        throw err;
      }
    },
  );
};

export default walletRoutes;
