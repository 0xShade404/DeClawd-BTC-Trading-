import type { PrismaClient } from '@declawd/database';
import type { IPredictionMarketProvider } from '../types';
import { LedgerService } from '../ledger/ledger-service';

/**
 * Polls open positions for resolution and, once a market settles, credits
 * the payout and triggers profit distribution via LedgerService. Intended
 * to run on its own schedule (e.g. every few minutes), independent of the
 * 15-minute scan/trade cycle, since settlement timing is provider-driven.
 */
export class SettlementService {
  private readonly ledger: LedgerService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly provider: IPredictionMarketProvider,
  ) {
    this.ledger = new LedgerService(prisma);
  }

  async processPendingSettlements(): Promise<{ settled: number }> {
    const openPositions = await this.prisma.position.findMany({
      where: { status: { in: ['OPEN', 'CLOSING'] } },
      include: { market: true, user: { include: { settings: true } } },
    });

    let settled = 0;

    for (const position of openPositions) {
      const result = await this.provider.getSettlement(position.market.providerMarketId);
      if (result.status !== 'RESOLVED' || result.resolvedOutcome === null || result.payoutPerShareUsd === null) {
        continue;
      }

      const won = result.resolvedOutcome === position.direction;
      const shares = position.sharesAcquired
        ? Number(position.sharesAcquired)
        : Number(position.sizeUsd) / Number(position.entryPrice);
      const payoutUsd = won ? shares * result.payoutPerShareUsd : 0;

      const settings = position.user.settings;
      const { pnlUsd } = await this.ledger.recordTradeSettlement({
        userId: position.userId,
        tradeId: position.id,
        payoutUsd,
        stakeUsd: Number(position.sizeUsd),
        vaultAllocationPct: settings ? Number(settings.vaultAllocationPct) : 70,
        tradingPoolAllocationPct: settings ? Number(settings.tradingPoolAllocationPct) : 30,
        autoCompound: settings?.autoCompound ?? true,
      });

      await this.prisma.$transaction([
        this.prisma.position.update({
          where: { id: position.id },
          data: {
            status: 'SETTLED',
            exitPrice: result.payoutPerShareUsd,
            realizedPnlUsd: pnlUsd,
            closedAt: new Date(),
          },
        }),
        this.prisma.settlement.update({
          where: { positionId: position.id },
          data: {
            status: won ? 'WON' : 'LOST',
            resolvedOutcome: result.resolvedOutcome,
            payoutUsd,
            settledAt: new Date(),
          },
        }),
      ]);

      settled += 1;
    }

    return { settled };
  }
}
