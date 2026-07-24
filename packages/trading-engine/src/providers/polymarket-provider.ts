import type {
  IPredictionMarketProvider,
  NormalizedMarket,
  OrderBookSnapshot,
  OrderResult,
  PlaceOrderParams,
  SettlementResult,
} from '../types';
import { ProviderError } from '../types';

export interface PolymarketProviderConfig {
  gammaApiUrl: string;
  clobApiUrl: string;
  /**
   * Server-side API credentials for the CLOB REST API (market data / order
   * relay endpoints that require auth). These are NOT wallet private keys -
   * they authenticate DeClawd's backend to Polymarket's API, they cannot
   * move funds or sign orders. See https://docs.polymarket.com for how to
   * provision them (derived from an L1 wallet signature during setup, then
   * stored as an API key/secret/passphrase triple).
   */
  apiKey?: string;
  apiSecret?: string;
  apiPassphrase?: string;
}

interface GammaMarket {
  id: string;
  conditionId?: string;
  slug?: string;
  question: string;
  category?: string;
  active?: boolean;
  closed?: boolean;
  liquidity?: string;
  volume24hr?: string;
  outcomes?: string; // JSON-encoded array e.g. '["Yes","No"]'
  outcomePrices?: string; // JSON-encoded array e.g. '["0.62","0.38"]'
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  startDate?: string;
  endDate?: string;
  fee?: number;
}

/**
 * Polymarket implementation of IPredictionMarketProvider.
 *
 * Read paths (listMarkets/getMarket/getOrderBook/getSettlement) use
 * Polymarket's public Gamma + CLOB REST APIs and require no credentials.
 *
 * `submitOrder` relays a client-signed order to the CLOB `/order` endpoint.
 * DeClawd's backend never constructs or signs the order itself - the
 * EIP-712 signature in `signedOrder.signature` must have been produced by
 * the user's own wallet (see apps/web trade-confirmation flow). The exact
 * request/auth headers required by the CLOB API (POLY_ADDRESS,
 * POLY_SIGNATURE, POLY_TIMESTAMP, POLY_API_KEY, POLY_PASSPHRASE) should be
 * validated against the current Polymarket API docs before enabling live
 * trading - this is the integration point to wire real credentials into.
 */
export class PolymarketProvider implements IPredictionMarketProvider {
  readonly providerId = 'polymarket';

  constructor(private readonly config: PolymarketProviderConfig) {}

  async listMarkets(params: { category?: string; keyword?: string; status?: 'OPEN' }): Promise<NormalizedMarket[]> {
    const query = new URLSearchParams({ active: 'true', closed: 'false', limit: '100' });
    if (params.keyword) {
      query.set('search', params.keyword);
    }

    const res = await fetch(`${this.config.gammaApiUrl}/markets?${query.toString()}`);
    if (!res.ok) {
      throw new ProviderError(this.providerId, `listMarkets failed: ${res.status} ${res.statusText}`);
    }
    const markets = (await res.json()) as GammaMarket[];

    return markets
      .filter((m) => matchesKeyword(m, params.keyword))
      .map((m) => this.normalize(m));
  }

  async getMarket(providerMarketId: string): Promise<NormalizedMarket | null> {
    const res = await fetch(`${this.config.gammaApiUrl}/markets/${providerMarketId}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new ProviderError(this.providerId, `getMarket failed: ${res.status} ${res.statusText}`);
    }
    const market = (await res.json()) as GammaMarket;
    return this.normalize(market);
  }

  async getOrderBook(providerMarketId: string): Promise<OrderBookSnapshot> {
    const res = await fetch(`${this.config.clobApiUrl}/book?token_id=${providerMarketId}`);
    if (!res.ok) {
      throw new ProviderError(this.providerId, `getOrderBook failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as {
      bids?: Array<{ price: string; size: string }>;
      asks?: Array<{ price: string; size: string }>;
    };
    return {
      bids: (data.bids ?? []).map((l) => ({ price: Number(l.price), sizeUsd: Number(l.size) })),
      asks: (data.asks ?? []).map((l) => ({ price: Number(l.price), sizeUsd: Number(l.size) })),
      capturedAt: new Date().toISOString(),
    };
  }

  async submitOrder(params: PlaceOrderParams): Promise<OrderResult> {
    if (!this.config.apiKey || !this.config.apiSecret || !this.config.apiPassphrase) {
      throw new ProviderError(
        this.providerId,
        'CLOB API credentials not configured (POLYMARKET_API_KEY/SECRET/PASSPHRASE). ' +
          'Order relay is disabled until these are set.',
      );
    }
    if (params.signedOrder.format !== 'polymarket-clob-eip712') {
      throw new ProviderError(this.providerId, `unsupported signed order format: ${params.signedOrder.format}`);
    }

    const res = await fetch(`${this.config.clobApiUrl}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        POLY_API_KEY: this.config.apiKey,
        POLY_PASSPHRASE: this.config.apiPassphrase,
        // POLY_SIGNATURE / POLY_TIMESTAMP for L2 auth are HMAC-derived from
        // apiSecret per request - implement per current CLOB auth spec.
      },
      body: JSON.stringify(params.signedOrder.payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ProviderError(this.providerId, `submitOrder rejected: ${res.status} ${body}`);
    }

    const result = (await res.json()) as {
      orderID?: string;
      status?: string;
      makingAmount?: string;
      takingAmount?: string;
      transactionHash?: string;
    };

    return {
      orderId: result.orderID ?? '',
      status: mapOrderStatus(result.status),
      filledPrice: params.limitPrice,
      filledSizeUsd: result.takingAmount ? Number(result.takingAmount) : null,
      feesUsd: 0,
      txHash: result.transactionHash ?? null,
    };
  }

  async getSettlement(providerMarketId: string): Promise<SettlementResult> {
    const market = await this.getMarket(providerMarketId);
    if (!market) {
      return { providerMarketId, status: 'PENDING', resolvedOutcome: null, payoutPerShareUsd: null };
    }
    if (market.status !== 'RESOLVED') {
      return { providerMarketId, status: 'PENDING', resolvedOutcome: null, payoutPerShareUsd: null };
    }
    return {
      providerMarketId,
      status: 'RESOLVED',
      resolvedOutcome: market.resolvedOutcome,
      payoutPerShareUsd: market.resolvedOutcome ? 1 : 0,
    };
  }

  private normalize(m: GammaMarket): NormalizedMarket {
    const prices = safeParseNumberArray(m.outcomePrices);
    const yesPrice = prices?.[0] ?? null;
    const noPrice = prices?.[1] ?? (yesPrice !== null ? 1 - yesPrice : null);
    const liquidityUsd = m.liquidity ? Number(m.liquidity) : null;
    const volume24hUsd = m.volume24hr ? Number(m.volume24hr) : null;
    const spreadBps = typeof m.spread === 'number' ? Math.round(m.spread * 10_000) : null;

    let status: NormalizedMarket['status'] = 'OPEN';
    if (m.closed) status = 'CLOSED';
    if (!m.active && !m.closed) status = 'INVALID';

    return {
      providerId: this.providerId,
      providerMarketId: m.id,
      conditionId: m.conditionId,
      slug: m.slug,
      question: m.question,
      category: 'BTC',
      status,
      yesPrice,
      noPrice,
      liquidityUsd,
      volume24hUsd,
      bestBid: m.bestBid ?? null,
      bestAsk: m.bestAsk ?? null,
      spreadBps,
      feeBps: typeof m.fee === 'number' ? Math.round(m.fee * 10_000) : 0,
      opensAt: m.startDate ?? null,
      closesAt: m.endDate ?? null,
      resolvesAt: m.endDate ?? null,
      resolvedOutcome: null,
      raw: m,
    };
  }
}

function matchesKeyword(market: GammaMarket, keyword?: string): boolean {
  if (!keyword) return true;
  const haystack = `${market.question} ${market.slug ?? ''}`.toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function safeParseNumberArray(json?: string): number[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as string[];
    return parsed.map(Number);
  } catch {
    return null;
  }
}

function mapOrderStatus(status?: string): OrderResult['status'] {
  switch (status) {
    case 'matched':
    case 'filled':
      return 'FILLED';
    case 'partially_filled':
      return 'PARTIALLY_FILLED';
    case 'live':
    case 'open':
      return 'OPEN';
    default:
      return 'REJECTED';
  }
}
