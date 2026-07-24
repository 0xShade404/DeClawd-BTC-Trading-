import { describe, expect, it } from 'vitest';
import { allocateProfit } from './profit-distribution';

describe('allocateProfit', () => {
  it('splits profit 70/30 by default', () => {
    const result = allocateProfit(20, 70, 30);
    expect(result.vaultAmountUsd).toBe(14);
    expect(result.tradingPoolAmountUsd).toBe(6);
  });

  it('returns zero allocation for non-positive profit', () => {
    expect(allocateProfit(0, 70, 30)).toEqual({ vaultAmountUsd: 0, tradingPoolAmountUsd: 0 });
    expect(allocateProfit(-5, 70, 30)).toEqual({ vaultAmountUsd: 0, tradingPoolAmountUsd: 0 });
  });

  it('throws if allocation percentages do not sum to 100', () => {
    expect(() => allocateProfit(10, 60, 30)).toThrow();
  });

  it('handles custom allocation splits', () => {
    const result = allocateProfit(100, 50, 50);
    expect(result.vaultAmountUsd).toBe(50);
    expect(result.tradingPoolAmountUsd).toBe(50);
  });

  it('rounds to the nearest cent', () => {
    const result = allocateProfit(10, 33, 67);
    expect(result.vaultAmountUsd + result.tradingPoolAmountUsd).toBeCloseTo(10, 2);
  });
});
