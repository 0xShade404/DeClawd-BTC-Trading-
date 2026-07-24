import { describe, expect, it } from 'vitest';
import { MarketScanner } from './market-scanner';
import type { IPredictionMarketProvider, NormalizedMarket } from '../types';

function makeMarket(overrides: Partial<NormalizedMarket> = {}): NormalizedMarket {
  return {
    providerId: 'test',
    providerMarketId: 'm1',
    question: 'Will BTC exceed $100k by Friday?',
    category: 'BTC',
    status: 'OPEN',
    yesPrice: 0.55,
    noPrice: 0.45,
    liquidityUsd: 10_000,
    volume24hUsd: 5_000,
    bestBid: 0.54,
    bestAsk: 0.56,
    spreadBps: 100,
    feeBps: 50,
    opensAt: null,
    closesAt: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    resolvesAt: null,
    resolvedOutcome: null,
    raw: {},
    ...overrides,
  };
}

class FakeProvider implements IPredictionMarketProvider {
  readonly providerId = 'test';
  constructor(private readonly markets: NormalizedMarket[]) {}
  async listMarkets(): Promise<NormalizedMarket[]> {
    return this.markets;
  }
  async getMarket(id: string): Promise<NormalizedMarket | null> {
    return this.markets.find((m) => m.providerMarketId === id) ?? null;
  }
  async getOrderBook(): Promise<never> {
    throw new Error('not implemented');
  }
  async submitOrder(): Promise<never> {
    throw new Error('not implemented');
  }
  async getSettlement(): Promise<never> {
    throw new Error('not implemented');
  }
}

describe('MarketScanner', () => {
  it('marks a well-formed liquid market as eligible', async () => {
    const provider = new FakeProvider([makeMarket()]);
    const scanner = new MarketScanner(provider);
    const results = await scanner.scan();
    expect(results).toHaveLength(1);
    expect(results[0]!.eligible).toBe(true);
  });

  it('rejects markets below the minimum liquidity threshold', async () => {
    const provider = new FakeProvider([makeMarket({ liquidityUsd: 100 })]);
    const scanner = new MarketScanner(provider);
    const results = await scanner.scan();
    expect(results[0]!.eligible).toBe(false);
    expect(results[0]!.rejectionReason).toMatch(/liquidity/);
  });

  it('rejects markets closing too soon', async () => {
    const provider = new FakeProvider([
      makeMarket({ closesAt: new Date(Date.now() + 60_000).toISOString() }),
    ]);
    const scanner = new MarketScanner(provider);
    const results = await scanner.scan();
    expect(results[0]!.eligible).toBe(false);
    expect(results[0]!.rejectionReason).toMatch(/closes in/);
  });

  it('rejects markets with excessive spread', async () => {
    const provider = new FakeProvider([makeMarket({ spreadBps: 1000 })]);
    const scanner = new MarketScanner(provider);
    const results = await scanner.scan();
    expect(results[0]!.eligible).toBe(false);
    expect(results[0]!.rejectionReason).toMatch(/spread/);
  });

  it('does not assume a market always exists - returns empty when none found', async () => {
    const provider = new FakeProvider([]);
    const scanner = new MarketScanner(provider);
    const results = await scanner.scan();
    expect(results).toHaveLength(0);
  });
});
