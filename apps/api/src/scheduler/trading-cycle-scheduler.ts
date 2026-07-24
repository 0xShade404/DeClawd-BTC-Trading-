import cron, { type ScheduledTask } from 'node-cron';
import type { PrismaClient } from '@declawd/database';
import {
  AiAnalysisService,
  CoinGeckoPriceFeed,
  FeatureBuilder,
  NullNewsSentimentProvider,
  PolymarketProvider,
  RuleBasedProbabilityModel,
  SettlementService,
  TradingCycle,
  type IHistoricalCalibrationProvider,
  type IOrderSigner,
  type OrderSigningRequest,
  type SignedOrderPayload,
} from '@declawd/trading-engine';
import { env } from '../config/env';
import { NotificationService } from '../notifications/notification-service';

type Logger = { info: (msg: string, meta?: object) => void; error: (msg: string, meta?: object) => void; warn: (msg: string, meta?: object) => void };

/**
 * No trade history to calibrate against yet in this scaffold - always
 * returns null so the AI module correctly treats calibration as "no
 * signal" rather than fabricating a Brier score.
 */
class NullHistoricalCalibrationProvider implements IHistoricalCalibrationProvider {
  async getBrierScore(): Promise<number | null> {
    return null;
  }
}

/**
 * Stand-in IOrderSigner for environments without a live relayer/KMS wired
 * up yet. `isAuthorizedFor` always returns false, so TradeExecutor's
 * authorization check fails fast with a clear error for that user's BotRun
 * (caught and recorded as BotRunStatus.FAILED by TradingCycle - it does
 * NOT crash the scheduler or the process) instead of ever fabricating a
 * signature. Swap for `RelayerOrderSigner` once:
 *   1. A relayer key is provisioned in a KMS/HSM (never in app code/env).
 *   2. Users have completed the on-chain authorization flow granting that
 *      relayer permission to trade (not withdraw) via their proxy wallet.
 *   3. The Polymarket CLOB EIP-712 order schema is finalized in
 *      RelayerOrderSigner (see packages/trading-engine/src/execution/order-signer.ts).
 */
class DisabledOrderSigner implements IOrderSigner {
  async isAuthorizedFor(_userId: string): Promise<boolean> {
    return false;
  }

  async sign(_userId: string, _request: OrderSigningRequest): Promise<SignedOrderPayload> {
    throw new Error('DisabledOrderSigner cannot sign orders - no relayer/KMS configured in this deployment');
  }
}

export interface TradingCycleSchedulerHandle {
  stop: () => void;
}

/**
 * Wires @declawd/trading-engine's TradingCycle + SettlementService up with
 * real dependencies and schedules them via node-cron. The trading cycle
 * itself only runs if TRADING_ENGINE_ENABLED=true; settlement processing
 * (resolving already-open positions) runs independently since it doesn't
 * open new exposure and existing open positions still need to be settled
 * even while the cycle is paused.
 */
export function startTradingCycleScheduler(
  prisma: PrismaClient,
  logger: Logger,
): TradingCycleSchedulerHandle {
  const provider = new PolymarketProvider({
    gammaApiUrl: env.POLYMARKET_GAMMA_API_URL,
    clobApiUrl: env.POLYMARKET_CLOB_API_URL,
    apiKey: env.POLYMARKET_API_KEY,
    apiSecret: env.POLYMARKET_API_SECRET,
    apiPassphrase: env.POLYMARKET_API_PASSPHRASE,
  });

  const featureBuilder = new FeatureBuilder(
    new CoinGeckoPriceFeed(env.BTC_PRICE_FEED_URL),
    new NullNewsSentimentProvider(),
    new NullHistoricalCalibrationProvider(),
  );

  const aiService = new AiAnalysisService(new RuleBasedProbabilityModel());
  const orderSigner = new DisabledOrderSigner();
  const notificationService = new NotificationService(prisma, logger);

  const tradingCycle = new TradingCycle({
    prisma,
    provider,
    featureBuilder,
    aiService,
    orderSigner,
    logger,
  });

  const settlementService = new SettlementService(prisma, provider);

  const tasks: ScheduledTask[] = [];

  if (env.TRADING_ENGINE_ENABLED) {
    logger.info(`Trading engine enabled - scheduling trading cycle on "${env.TRADING_CYCLE_CRON}"`);
    const cycleTask = cron.schedule(env.TRADING_CYCLE_CRON, () => {
      tradingCycle
        .run()
        .then((result) => logger.info('Trading cycle completed', result))
        .catch((err) => logger.error('Trading cycle run failed', { error: String(err) }));
    });
    tasks.push(cycleTask);
  } else {
    logger.info('TRADING_ENGINE_ENABLED=false - trading cycle scheduling skipped');
  }

  // Settlement processing runs every 5 minutes regardless of the engine
  // flag, so previously opened positions still resolve/settle correctly.
  const settlementTask = cron.schedule('*/5 * * * *', () => {
    settlementService
      .processPendingSettlements()
      .then(async (result) => {
        if (result.settled > 0) {
          logger.info(`Settlement sweep processed ${result.settled} position(s)`);
          await notifySettledPositions(prisma, notificationService, logger);
        }
      })
      .catch((err) => logger.error('Settlement sweep failed', { error: String(err) }));
  });
  tasks.push(settlementTask);

  return {
    stop: () => {
      for (const task of tasks) task.stop();
    },
  };
}

/**
 * Fires TRADE_CLOSED/LARGE_PROFIT/LARGE_LOSS notifications for positions
 * that settled in the last sweep. Looks back over recently closed
 * positions rather than threading callbacks through SettlementService, to
 * keep the trading-engine package free of any notification concerns.
 */
async function notifySettledPositions(
  prisma: PrismaClient,
  notificationService: NotificationService,
  logger: Logger,
): Promise<void> {
  const recentlySettled = await prisma.position.findMany({
    where: { status: 'SETTLED', closedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    include: { market: true },
  });

  for (const position of recentlySettled) {
    try {
      await notificationService.notifyTradeClosed(
        position.userId,
        position.market.question,
        Number(position.realizedPnlUsd ?? 0),
      );
    } catch (err) {
      logger.error('Failed to send settlement notification', { error: String(err), positionId: position.id });
    }
  }
}
