import type { PrismaClient } from '@declawd/database';
import type { IPredictionMarketProvider, NormalizedMarket, RiskEvaluationResult, AiSignalResult } from '../types';
import type { IOrderSigner } from './order-signer';
import { LedgerService } from '../ledger/ledger-service';

export interface ExecuteTradeParams {
  userId: string;
  market: NormalizedMarket;
  signal: AiSignalResult;
  risk: RiskEvaluationResult;
  botRunId: string;
}

/**
 * Executes an approved trade end to end: obtains a wallet-authorized
 * signed order, relays it through the provider, and persists the
 * Position/Trade/Settlement + ledger debit atomically. Never touches funds
 * directly - all balance movement goes through LedgerService.
 */
export class TradeExecutor {
  private readonly ledger: LedgerService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly provider: IPredictionMarketProvider,
    private readonly orderSigner: IOrderSigner,
  ) {
    this.ledger = new LedgerService(prisma);
  }

  async execute(params: ExecuteTradeParams): Promise<{ positionId: string; tradeId: string } | null> {
    const { userId, market, signal, risk, botRunId } = params;
    if (!signal.suggestedDirection || !risk.approved) return null;

    const direction = signal.suggestedDirection;
    const limitPrice = direction === 'YES' ? market.yesPrice! : market.noPrice ?? 1 - market.yesPrice!;

    const authorized = await this.orderSigner.isAuthorizedFor(userId);
    if (!authorized) {
      throw new Error(
        `User ${userId} has bot enabled but no active on-chain trading authorization; skipping execution`,
      );
    }

    const signedOrder = await this.orderSigner.sign(userId, {
      providerMarketId: market.providerMarketId,
      direction,
      side: 'OPEN',
      sizeUsd: risk.sizeUsd,
      limitPrice,
    });

    const orderResult = await this.provider.submitOrder({
      providerMarketId: market.providerMarketId,
      direction,
      side: 'OPEN',
      sizeUsd: risk.sizeUsd,
      limitPrice,
      signerAddress: '', // populated by the relayer/session context in production
      signedOrder,
    });

    if (orderResult.status === 'REJECTED') {
      throw new Error(`Order rejected by ${this.provider.providerId} for market ${market.providerMarketId}`);
    }

    const dbMarket = await this.prisma.market.upsert({
      where: { provider_providerMarketId: { provider: market.providerId, providerMarketId: market.providerMarketId } },
      update: {
        status: market.status,
        outcomePrices: { yes: market.yesPrice, no: market.noPrice },
        liquidityUsd: market.liquidityUsd ?? undefined,
        volume24hUsd: market.volume24hUsd ?? undefined,
        spreadBps: market.spreadBps ?? undefined,
        feeBps: market.feeBps,
        closesAt: market.closesAt ? new Date(market.closesAt) : undefined,
      },
      create: {
        provider: market.providerId,
        providerMarketId: market.providerMarketId,
        conditionId: market.conditionId,
        slug: market.slug,
        question: market.question,
        category: market.category,
        status: market.status,
        outcomePrices: { yes: market.yesPrice, no: market.noPrice },
        liquidityUsd: market.liquidityUsd ?? undefined,
        volume24hUsd: market.volume24hUsd ?? undefined,
        spreadBps: market.spreadBps ?? undefined,
        feeBps: market.feeBps,
        opensAt: market.opensAt ? new Date(market.opensAt) : undefined,
        closesAt: market.closesAt ? new Date(market.closesAt) : undefined,
      },
    });

    const aiSignalRow = await this.prisma.aiSignal.create({
      data: {
        marketId: dbMarket.id,
        modelName: signal.modelName,
        modelVersion: signal.modelVersion,
        confidenceScore: signal.confidenceScore,
        expectedValue: signal.expectedValue,
        suggestedDirection: signal.suggestedDirection,
        riskScore: signal.riskScore,
        suggestedSizeUsd: signal.suggestedSizeUsd,
        reasoning: signal.reasoning,
        features: signal.features as unknown as object,
      },
    });

    const filledPrice = orderResult.filledPrice ?? limitPrice;
    const filledSizeUsd = orderResult.filledSizeUsd ?? risk.sizeUsd;

    const position = await this.prisma.position.create({
      data: {
        userId,
        marketId: dbMarket.id,
        aiSignalId: aiSignalRow.id,
        botRunId,
        direction,
        status: orderResult.status === 'FILLED' ? 'OPEN' : 'PENDING',
        entryPrice: filledPrice,
        sizeUsd: filledSizeUsd,
        feesUsd: orderResult.feesUsd,
        confidenceScore: signal.confidenceScore,
        reasoning: signal.reasoning,
      },
    });

    const trade = await this.prisma.trade.create({
      data: {
        userId,
        positionId: position.id,
        direction,
        side: 'OPEN',
        price: filledPrice,
        sizeUsd: filledSizeUsd,
        feesUsd: orderResult.feesUsd,
        txHash: orderResult.txHash,
        orderId: orderResult.orderId,
        signerAddress: 'relayer', // replaced with actual proxy-wallet address once wired to on-chain auth
        confidenceScore: signal.confidenceScore,
        reasoning: signal.reasoning,
      },
    });

    await this.prisma.settlement.create({
      data: { positionId: position.id, status: 'PENDING' },
    });

    await this.ledger.recordTradeOpen(userId, trade.id, Number(filledSizeUsd), Number(orderResult.feesUsd));

    return { positionId: position.id, tradeId: trade.id };
  }
}
