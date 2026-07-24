import type { IPredictionMarketProvider, MarketEligibility, ScannerConfig } from '../types';

/**
 * Default BTC-market scan configuration. Markets that don't clear liquidity,
 * spread, fee, or time-to-close thresholds are excluded before any AI
 * evaluation happens - the AI never sees markets that fail these hard gates.
 */
export const DEFAULT_BTC_SCANNER_CONFIG: ScannerConfig = {
  keywords: ['bitcoin', 'btc'],
  minLiquidityUsd: 5_000,
  maxSpreadBps: 300, // 3%
  maxFeeBps: 200, // 2%
  minTimeToCloseMinutes: 30,
};

/**
 * Scans a provider for eligible BTC markets. Pure function of provider +
 * config so it can be unit-tested without network access (inject a fake
 * IPredictionMarketProvider).
 */
export class MarketScanner {
  constructor(
    private readonly provider: IPredictionMarketProvider,
    private readonly config: ScannerConfig = DEFAULT_BTC_SCANNER_CONFIG,
  ) {}

  async scan(): Promise<MarketEligibility[]> {
    const results: MarketEligibility[] = [];

    for (const keyword of this.config.keywords) {
      const markets = await this.provider.listMarkets({ category: 'BTC', keyword, status: 'OPEN' });
      for (const market of markets) {
        if (results.some((r) => r.market.providerMarketId === market.providerMarketId)) {
          continue; // already evaluated via another keyword match
        }
        results.push(this.evaluate(market));
      }
    }

    return results;
  }

  private evaluate(market: import('../types').NormalizedMarket): MarketEligibility {
    const reasons: string[] = [];

    if (market.status !== 'OPEN') {
      reasons.push('market is not open');
    }
    if (market.liquidityUsd === null || market.liquidityUsd < this.config.minLiquidityUsd) {
      reasons.push(
        `liquidity $${market.liquidityUsd ?? 0} below minimum $${this.config.minLiquidityUsd}`,
      );
    }
    if (market.spreadBps === null || market.spreadBps > this.config.maxSpreadBps) {
      reasons.push(`spread ${market.spreadBps ?? 'unknown'}bps exceeds max ${this.config.maxSpreadBps}bps`);
    }
    if (market.feeBps > this.config.maxFeeBps) {
      reasons.push(`fee ${market.feeBps}bps exceeds max ${this.config.maxFeeBps}bps`);
    }
    if (market.closesAt) {
      const minutesToClose = (new Date(market.closesAt).getTime() - Date.now()) / 60_000;
      if (minutesToClose < this.config.minTimeToCloseMinutes) {
        reasons.push(
          `closes in ${minutesToClose.toFixed(1)}m, below minimum ${this.config.minTimeToCloseMinutes}m`,
        );
      }
    } else {
      reasons.push('missing closesAt timestamp');
    }
    if (market.yesPrice === null || market.yesPrice <= 0 || market.yesPrice >= 1) {
      reasons.push('invalid or missing YES price');
    }

    return {
      market,
      eligible: reasons.length === 0,
      rejectionReason: reasons.length > 0 ? reasons.join('; ') : null,
    };
  }
}
