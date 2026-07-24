import type { RiskEvaluationInput, RiskEvaluationResult } from '../types';

const AGGRESSIVENESS_MULTIPLIER: Record<RiskEvaluationInput['riskProfile']['aiAggressiveness'], number> = {
  CONSERVATIVE: 0.5,
  BALANCED: 1,
  AGGRESSIVE: 1.5,
};

// Signals below this confidence, or with a risk score above this ceiling,
// are rejected outright regardless of aggressiveness.
const MIN_ACCEPTABLE_CONFIDENCE = 0.4;
const MAX_ACCEPTABLE_RISK_SCORE = 0.85;

/**
 * Final authority on whether a trade executes and at what size. Applies
 * hard risk gates (confidence, EV, daily loss cap, exposure cap, trade size
 * cap) before scaling the AI's suggested size by the user's configured risk
 * tolerance. Losses are absorbed by the trading pool only, so this engine
 * treats `tradingPoolBalanceUsd` as the sole capital base for sizing.
 */
export class RiskEngine {
  evaluate(input: RiskEvaluationInput): RiskEvaluationResult {
    const { signal, tradingPoolBalanceUsd, realizedLossTodayUsd, openExposureUsd, riskProfile } = input;

    if (!signal.suggestedDirection) {
      return { approved: false, sizeUsd: 0, reason: 'AI did not produce a directional signal' };
    }
    if (signal.confidenceScore < MIN_ACCEPTABLE_CONFIDENCE) {
      return { approved: false, sizeUsd: 0, reason: `confidence ${signal.confidenceScore.toFixed(2)} below minimum ${MIN_ACCEPTABLE_CONFIDENCE}` };
    }
    if (signal.riskScore > MAX_ACCEPTABLE_RISK_SCORE) {
      return { approved: false, sizeUsd: 0, reason: `risk score ${signal.riskScore.toFixed(2)} exceeds ceiling ${MAX_ACCEPTABLE_RISK_SCORE}` };
    }
    if (signal.expectedValue <= 0) {
      return { approved: false, sizeUsd: 0, reason: 'non-positive expected value' };
    }
    if (tradingPoolBalanceUsd <= 0) {
      return { approved: false, sizeUsd: 0, reason: 'trading pool balance is zero' };
    }
    if (realizedLossTodayUsd >= riskProfile.maxDailyLossUsd) {
      return { approved: false, sizeUsd: 0, reason: 'maximum daily loss reached' };
    }

    const remainingDailyBudgetUsd = riskProfile.maxDailyLossUsd - realizedLossTodayUsd;

    // Base size = risk% of trading pool, scaled by aggressiveness and by
    // how much conviction the signal carries (confidence x (1 - riskScore)).
    const conviction = signal.confidenceScore * (1 - signal.riskScore);
    const aggressivenessMultiplier = AGGRESSIVENESS_MULTIPLIER[riskProfile.aiAggressiveness];
    let sizeUsd = tradingPoolBalanceUsd * (riskProfile.riskPct / 100) * aggressivenessMultiplier * conviction;

    // Never risk more than what a single loss could safely absorb within
    // today's remaining loss budget.
    sizeUsd = Math.min(sizeUsd, remainingDailyBudgetUsd);

    // Respect the user's configured per-trade cap.
    sizeUsd = Math.min(sizeUsd, riskProfile.maxTradeSizeUsd);

    // Never exceed available (unallocated) trading pool balance.
    const availableUsd = Math.max(0, tradingPoolBalanceUsd - openExposureUsd);
    sizeUsd = Math.min(sizeUsd, availableUsd);

    // Also respect the AI's own suggested ceiling (fractional-Kelly output),
    // scaled to actual bankroll rather than the normalized $100 the AI used.
    const aiSuggestedUsd = (signal.suggestedSizeUsd / 100) * tradingPoolBalanceUsd;
    if (aiSuggestedUsd > 0) {
      sizeUsd = Math.min(sizeUsd, aiSuggestedUsd);
    }

    sizeUsd = Math.round(sizeUsd * 100) / 100;

    if (sizeUsd < 1) {
      return { approved: false, sizeUsd: 0, reason: 'computed position size below $1 minimum' };
    }

    return {
      approved: true,
      sizeUsd,
      reason: `approved: risk% ${riskProfile.riskPct}, aggressiveness x${aggressivenessMultiplier}, conviction ${(conviction * 100).toFixed(1)}%`,
    };
  }
}
