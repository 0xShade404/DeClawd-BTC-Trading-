import type { AiFeatureSet, IProbabilityModel } from '../types';

/**
 * Transparent, deterministic baseline probability model.
 *
 * It starts from the market's own implied probability (the crowd's prior,
 * which is a strong baseline for liquid prediction markets) and nudges it
 * using momentum, volatility, order-book imbalance, and news sentiment,
 * each weighted and clamped so no single signal can dominate. This keeps
 * the model auditable end-to-end (see `explain`) rather than a black box.
 *
 * Swap in a statistically trained or LLM-backed model later by implementing
 * IProbabilityModel - nothing else in the pipeline needs to change.
 */
export class RuleBasedProbabilityModel implements IProbabilityModel {
  readonly name = 'declawd-rule-based';
  readonly version = '1.0.0';

  async estimate(features: AiFeatureSet): ReturnType<IProbabilityModel['estimate']> {
    const adjustments = this.computeAdjustments(features);
    const totalAdjustment = adjustments.reduce((sum, a) => sum + a.delta, 0);

    // Blend the market's implied probability with our adjustment, clamped
    // to a sane range so the model never claims near-certainty.
    const raw = features.marketImpliedProbability + totalAdjustment;
    const estimatedProbability = clamp(raw, 0.02, 0.98);

    const confidenceScore = this.computeConfidence(features, adjustments);
    const reasoning = this.explain(features, adjustments, estimatedProbability);

    return { estimatedProbability, confidenceScore, reasoning };
  }

  private computeAdjustments(f: AiFeatureSet): Array<{ label: string; delta: number }> {
    const adjustments: Array<{ label: string; delta: number }> = [];

    // Momentum: sustained short-term moves shade probability toward the
    // direction of travel, but the effect is dampened by volatility - fast
    // moves in a highly volatile tape are less informative.
    const momentumSignal = 0.6 * clamp(f.btcMomentum1hPct / 2, -1, 1) +
      0.4 * clamp(f.btcMomentum24hPct / 6, -1, 1);
    const volatilityDamping = 1 / (1 + f.btcRealizedVolatility24hPct / 4);
    adjustments.push({ label: 'momentum', delta: momentumSignal * 0.06 * volatilityDamping });

    // Order book imbalance: heavier bid-side depth suggests buy pressure.
    adjustments.push({ label: 'order_book_imbalance', delta: f.orderBookImbalance * 0.03 });

    // News sentiment, if available.
    if (f.newsSentimentScore !== null) {
      adjustments.push({ label: 'news_sentiment', delta: f.newsSentimentScore * 0.04 });
    }

    // Time decay: far from close, market prices are less efficient and the
    // model leans slightly more on its own signal; close to expiry it
    // defers almost entirely to the market price.
    const timeWeight = clamp(f.timeToCloseHours / 48, 0, 1);
    for (const a of adjustments) {
      a.delta *= 0.3 + 0.7 * timeWeight;
    }

    return adjustments;
  }

  private computeConfidence(f: AiFeatureSet, adjustments: Array<{ delta: number }>): number {
    let confidence = 0.5;

    // Deep, liquid markets with tight spreads produce more reliable prices
    // to anchor against.
    confidence += clamp(f.liquidityUsd / 100_000, 0, 1) * 0.15;
    confidence -= clamp(f.spreadBps / 500, 0, 1) * 0.15;

    // Large disagreement between our adjustment and the market price is
    // treated with suspicion rather than conviction, since the model has
    // no privileged information.
    const totalAdjustment = Math.abs(adjustments.reduce((sum, a) => sum + a.delta, 0));
    confidence -= clamp(totalAdjustment / 0.1, 0, 1) * 0.2;

    if (f.historicalBriersScore !== null) {
      // Lower Brier score (better historical calibration) increases confidence.
      confidence += clamp((0.25 - f.historicalBriersScore) / 0.25, -1, 1) * 0.15;
    }

    return clamp(confidence, 0.05, 0.95);
  }

  private explain(
    f: AiFeatureSet,
    adjustments: Array<{ label: string; delta: number }>,
    estimatedProbability: number,
  ): string {
    const parts = [
      `Market-implied probability ${(f.marketImpliedProbability * 100).toFixed(1)}%`,
      ...adjustments
        .filter((a) => Math.abs(a.delta) > 0.0005)
        .map((a) => `${a.label} ${a.delta >= 0 ? '+' : ''}${(a.delta * 100).toFixed(2)}pp`),
      `-> model estimate ${(estimatedProbability * 100).toFixed(1)}%`,
    ];
    return parts.join('; ');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
