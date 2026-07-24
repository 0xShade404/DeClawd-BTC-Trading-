import type { AiFeatureSet, NormalizedMarket, OrderBookSnapshot } from '../types';

export interface BtcPricePoint {
  price: number;
  timestamp: string;
}

/**
 * Source of BTC spot price + recent history. Default implementation talks
 * to a public market-data API (see providers/coingecko-price-feed.ts).
 * Swap in a different feed (exchange websocket, Chainlink oracle, etc.) by
 * implementing this interface.
 */
export interface IBtcPriceFeed {
  getSpotPrice(): Promise<number>;
  /** Ascending-time price history covering at least the last 24h. */
  getRecentHistory(hours: number): Promise<BtcPricePoint[]>;
}

/**
 * Optional sentiment source. Returns null when unconfigured (no API key)
 * rather than fabricating a score - the AI module treats null sentiment as
 * "no signal" and excludes it from its estimate.
 */
export interface INewsSentimentProvider {
  getSentimentScore(topic: string): Promise<number | null>;
}

export class NullNewsSentimentProvider implements INewsSentimentProvider {
  async getSentimentScore(): Promise<number | null> {
    return null;
  }
}

/**
 * Optional per-market historical calibration lookup (Brier score of past
 * signals on similar markets). Returns null until enough trade history
 * exists to compute one.
 */
export interface IHistoricalCalibrationProvider {
  getBrierScore(category: string): Promise<number | null>;
}

export class FeatureBuilder {
  constructor(
    private readonly priceFeed: IBtcPriceFeed,
    private readonly sentimentProvider: INewsSentimentProvider,
    private readonly calibrationProvider: IHistoricalCalibrationProvider,
  ) {}

  async build(market: NormalizedMarket, orderBook: OrderBookSnapshot): Promise<AiFeatureSet> {
    const [spot, history, sentiment, brier] = await Promise.all([
      this.priceFeed.getSpotPrice(),
      this.priceFeed.getRecentHistory(24),
      this.sentimentProvider.getSentimentScore('bitcoin'),
      this.calibrationProvider.getBrierScore(market.category),
    ]);

    const momentum1h = computeMomentumPct(history, spot, 1);
    const momentum24h = computeMomentumPct(history, spot, 24);
    const volatility24h = computeRealizedVolatilityPct(history);
    const imbalance = computeOrderBookImbalance(orderBook);

    const yesPrice = market.yesPrice ?? 0.5;
    const closesAt = market.closesAt ? new Date(market.closesAt).getTime() : Date.now() + 3_600_000;
    const timeToCloseHours = Math.max(0, (closesAt - Date.now()) / 3_600_000);

    return {
      btcSpotPrice: spot,
      btcMomentum1hPct: momentum1h,
      btcMomentum24hPct: momentum24h,
      btcRealizedVolatility24hPct: volatility24h,
      marketYesPrice: yesPrice,
      marketImpliedProbability: yesPrice,
      liquidityUsd: market.liquidityUsd ?? 0,
      spreadBps: market.spreadBps ?? 0,
      feeBps: market.feeBps,
      orderBookImbalance: imbalance,
      timeToCloseHours,
      newsSentimentScore: sentiment,
      historicalBriersScore: brier,
    };
  }
}

function computeMomentumPct(history: BtcPricePoint[], spot: number, hoursAgo: number): number {
  if (history.length === 0) return 0;
  const targetTime = Date.now() - hoursAgo * 3_600_000;
  const past = history.reduce((closest, point) => {
    const t = new Date(point.timestamp).getTime();
    const closestT = new Date(closest.timestamp).getTime();
    return Math.abs(t - targetTime) < Math.abs(closestT - targetTime) ? point : closest;
  }, history[0]!);
  if (past.price === 0) return 0;
  return ((spot - past.price) / past.price) * 100;
}

function computeRealizedVolatilityPct(history: BtcPricePoint[]): number {
  if (history.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]!.price;
    const curr = history[i]!.price;
    if (prev > 0) returns.push((curr - prev) / prev);
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

function computeOrderBookImbalance(book: OrderBookSnapshot): number {
  const bidVolume = book.bids.reduce((sum, l) => sum + l.sizeUsd, 0);
  const askVolume = book.asks.reduce((sum, l) => sum + l.sizeUsd, 0);
  const total = bidVolume + askVolume;
  if (total === 0) return 0;
  return (bidVolume - askVolume) / total;
}
