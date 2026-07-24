import type { PrismaClient } from '@declawd/database';
import type { IPredictionMarketProvider, RiskProfile } from '../types';
import { MarketScanner, DEFAULT_BTC_SCANNER_CONFIG } from '../scanner/market-scanner';
import { AiAnalysisService } from '../ai/analysis-service';
import { FeatureBuilder } from '../ai/feature-builder';
import { RiskEngine } from '../risk/risk-engine';
import { TradeExecutor } from '../execution/trade-executor';
import type { IOrderSigner } from '../execution/order-signer';

export interface TradingCycleDeps {
  prisma: PrismaClient;
  provider: IPredictionMarketProvider;
  featureBuilder: FeatureBuilder;
  aiService: AiAnalysisService;
  orderSigner: IOrderSigner;
  logger?: { info: (msg: string, meta?: object) => void; error: (msg: string, meta?: object) => void };
}

/**
 * Runs one full trading cycle, intended to be invoked every
 * TRADING_CYCLE_INTERVAL_MINUTES (default 15) by the scheduler in apps/api.
 *
 * Design: market scanning and AI analysis run ONCE per cycle (shared across
 * all users, since the signal doesn't depend on any one user's risk
 * settings), while risk evaluation and execution run per user against that
 * shared signal. This keeps provider/API load flat regardless of user count.
 *
 * The bot never assumes a BTC market exists every cycle - if the scanner
 * finds zero eligible markets, the cycle completes with zero trades.
 */
export class TradingCycle {
  private readonly scanner: MarketScanner;
  private readonly riskEngine = new RiskEngine();
  private readonly executor: TradeExecutor;

  constructor(private readonly deps: TradingCycleDeps) {
    this.scanner = new MarketScanner(deps.provider, DEFAULT_BTC_SCANNER_CONFIG);
    this.executor = new TradeExecutor(deps.prisma, deps.provider, deps.orderSigner);
  }

  async run(): Promise<{ eligibleMarkets: number; tradesOpened: number }> {
    const { prisma, logger } = this.deps;

    const enabledUsers = await prisma.userSettings.findMany({
      where: { botEnabled: true },
      include: { user: true },
    });

    if (enabledUsers.length === 0) {
      logger?.info('No users with the bot enabled; skipping cycle');
      return { eligibleMarkets: 0, tradesOpened: 0 };
    }

    const scanResults = await this.scanner.scan();
    const eligible = scanResults.filter((r) => r.eligible);
    logger?.info(`Scanned ${scanResults.length} markets, ${eligible.length} eligible`);

    let totalTradesOpened = 0;

    for (const settings of enabledUsers) {
      const botRun = await prisma.botRun.create({
        data: { userId: settings.userId, status: 'RUNNING', marketsScanned: scanResults.length, marketsEligible: eligible.length },
      });

      try {
        const tradesOpened = await this.runForUser(settings, eligible.map((r) => r.market), botRun.id);
        totalTradesOpened += tradesOpened;

        await prisma.botRun.update({
          where: { id: botRun.id },
          data: { status: 'COMPLETED', tradesOpened, finishedAt: new Date() },
        });
      } catch (err) {
        logger?.error(`Bot run failed for user ${settings.userId}`, { error: String(err) });
        await prisma.botRun.update({
          where: { id: botRun.id },
          data: { status: 'FAILED', errorMessage: String(err), finishedAt: new Date() },
        });
      }
    }

    return { eligibleMarkets: eligible.length, tradesOpened: totalTradesOpened };
  }

  private async runForUser(
    settings: { userId: string; riskPct: unknown; maxDailyLossUsd: unknown; maxTradeSizeUsd: unknown; aiAggressiveness: string },
    markets: import('../types').NormalizedMarket[],
    botRunId: string,
  ): Promise<number> {
    const { prisma, featureBuilder, aiService } = this.deps;
    const userId = settings.userId;

    const tradingPool = await prisma.ledgerAccount.findUnique({
      where: { userId_type: { userId, type: 'TRADING_POOL' } },
    });
    const tradingPoolBalanceUsd = tradingPool ? Number(tradingPool.balance) : 0;
    if (tradingPoolBalanceUsd <= 0) return 0;

    const openPositions = await prisma.position.findMany({
      where: { userId, status: { in: ['PENDING', 'OPEN', 'CLOSING'] } },
    });
    const openExposureUsd = openPositions.reduce((sum, p) => sum + Number(p.sizeUsd), 0);
    const openMarketIds = new Set(openPositions.map((p) => p.marketId));

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaysSettledLosses = await prisma.position.findMany({
      where: { userId, status: 'SETTLED', closedAt: { gte: startOfDay }, realizedPnlUsd: { lt: 0 } },
    });
    const realizedLossTodayUsd = Math.abs(
      todaysSettledLosses.reduce((sum, p) => sum + Number(p.realizedPnlUsd ?? 0), 0),
    );

    const riskProfile: RiskProfile = {
      riskPct: Number(settings.riskPct),
      maxDailyLossUsd: Number(settings.maxDailyLossUsd),
      maxTradeSizeUsd: Number(settings.maxTradeSizeUsd),
      aiAggressiveness: settings.aiAggressiveness as RiskProfile['aiAggressiveness'],
    };

    let tradesOpened = 0;

    for (const market of markets) {
      if (openMarketIds.has(market.providerMarketId)) continue; // avoid doubling up on the same market

      const orderBook = await this.deps.provider.getOrderBook(market.providerMarketId);
      const features = await featureBuilder.build(market, orderBook);
      const signal = await aiService.analyze(market, features);

      if (!signal.suggestedDirection) continue;

      const risk = this.riskEngine.evaluate({
        signal,
        market,
        tradingPoolBalanceUsd,
        realizedLossTodayUsd,
        openExposureUsd,
        riskProfile,
      });

      if (!risk.approved) continue;

      const result = await this.executor.execute({ userId, market, signal, risk, botRunId });
      if (result) {
        tradesOpened += 1;
      }
    }

    return tradesOpened;
  }
}
