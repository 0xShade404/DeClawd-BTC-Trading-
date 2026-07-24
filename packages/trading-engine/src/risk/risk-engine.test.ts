import { describe, expect, it } from 'vitest';
import { RiskEngine } from './risk-engine';
import type { AiSignalResult, NormalizedMarket, RiskEvaluationInput, RiskProfile } from '../types';

function makeSignal(overrides: Partial<AiSignalResult> = {}): AiSignalResult {
  return {
    marketId: 'm1',
    modelName: 'test',
    modelVersion: '1.0.0',
    estimatedProbability: 0.65,
    confidenceScore: 0.7,
    expectedValue: 0.1,
    suggestedDirection: 'YES',
    riskScore: 0.3,
    suggestedSizeUsd: 10,
    reasoning: 'test signal',
    features: {} as AiSignalResult['features'],
    ...overrides,
  };
}

const market = { providerMarketId: 'm1' } as NormalizedMarket;

const riskProfile: RiskProfile = {
  riskPct: 2,
  maxDailyLossUsd: 50,
  maxTradeSizeUsd: 25,
  aiAggressiveness: 'BALANCED',
};

function makeInput(overrides: Partial<RiskEvaluationInput> = {}): RiskEvaluationInput {
  return {
    signal: makeSignal(),
    market,
    tradingPoolBalanceUsd: 1000,
    realizedLossTodayUsd: 0,
    openExposureUsd: 0,
    riskProfile,
    ...overrides,
  };
}

describe('RiskEngine', () => {
  const engine = new RiskEngine();

  it('rejects signals with no directional suggestion', () => {
    const result = engine.evaluate(makeInput({ signal: makeSignal({ suggestedDirection: null }) }));
    expect(result.approved).toBe(false);
  });

  it('rejects low-confidence signals', () => {
    const result = engine.evaluate(makeInput({ signal: makeSignal({ confidenceScore: 0.1 }) }));
    expect(result.approved).toBe(false);
  });

  it('rejects signals above the risk score ceiling', () => {
    const result = engine.evaluate(makeInput({ signal: makeSignal({ riskScore: 0.95 }) }));
    expect(result.approved).toBe(false);
  });

  it('rejects non-positive expected value', () => {
    const result = engine.evaluate(makeInput({ signal: makeSignal({ expectedValue: -0.01 }) }));
    expect(result.approved).toBe(false);
  });

  it('rejects when daily loss cap already reached', () => {
    const result = engine.evaluate(makeInput({ realizedLossTodayUsd: 50 }));
    expect(result.approved).toBe(false);
  });

  it('never exceeds the configured max trade size', () => {
    const result = engine.evaluate(
      makeInput({ tradingPoolBalanceUsd: 100_000, riskProfile: { ...riskProfile, riskPct: 10 } }),
    );
    expect(result.approved).toBe(true);
    expect(result.sizeUsd).toBeLessThanOrEqual(riskProfile.maxTradeSizeUsd);
  });

  it('never exceeds available (unallocated) trading pool balance', () => {
    const result = engine.evaluate(makeInput({ tradingPoolBalanceUsd: 100, openExposureUsd: 95 }));
    expect(result.sizeUsd).toBeLessThanOrEqual(5);
  });

  it('approves a well-formed, high-conviction signal within limits', () => {
    const result = engine.evaluate(makeInput());
    expect(result.approved).toBe(true);
    expect(result.sizeUsd).toBeGreaterThan(0);
  });

  it('scales size by aggressiveness', () => {
    const conservative = engine.evaluate(
      makeInput({ riskProfile: { ...riskProfile, aiAggressiveness: 'CONSERVATIVE', maxTradeSizeUsd: 1000 } }),
    );
    const aggressive = engine.evaluate(
      makeInput({ riskProfile: { ...riskProfile, aiAggressiveness: 'AGGRESSIVE', maxTradeSizeUsd: 1000 } }),
    );
    expect(aggressive.sizeUsd).toBeGreaterThan(conservative.sizeUsd);
  });
});
