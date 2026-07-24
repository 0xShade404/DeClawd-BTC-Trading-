import type { BtcPricePoint, IBtcPriceFeed } from '../ai/feature-builder';

/**
 * Default BTC price feed backed by the public CoinGecko API. No API key
 * required for this endpoint at low request volume; set BTC_PRICE_FEED_URL
 * to point at a paid/self-hosted feed for production traffic.
 */
export class CoinGeckoPriceFeed implements IBtcPriceFeed {
  constructor(private readonly baseUrl: string = 'https://api.coingecko.com/api/v3') {}

  async getSpotPrice(): Promise<number> {
    const res = await fetch(`${this.baseUrl}/simple/price?ids=bitcoin&vs_currencies=usd`);
    if (!res.ok) {
      throw new Error(`CoinGecko price request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { bitcoin?: { usd?: number } };
    const price = data.bitcoin?.usd;
    if (typeof price !== 'number') {
      throw new Error('CoinGecko response missing bitcoin.usd price');
    }
    return price;
  }

  async getRecentHistory(hours: number): Promise<BtcPricePoint[]> {
    const days = Math.max(1, Math.ceil(hours / 24));
    const res = await fetch(
      `${this.baseUrl}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`,
    );
    if (!res.ok) {
      throw new Error(`CoinGecko history request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { prices?: Array<[number, number]> };
    const prices = data.prices ?? [];
    const cutoff = Date.now() - hours * 3_600_000;
    return prices
      .filter(([ts]) => ts >= cutoff)
      .map(([ts, price]) => ({ timestamp: new Date(ts).toISOString(), price }));
  }
}
