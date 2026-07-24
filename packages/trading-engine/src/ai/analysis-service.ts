import type { AiFeatureSet, AiSignalResult, IProbabilityModel, NormalizedMarket } from '../types';

const MIN_EDGE_TO_TRADE = 0.03; // 3 percentage points of edge required before suggesting a trade
const MIN_CONFIDENCE_TO_TRADE = 0.4;

/**
 * Orchestrates a probability model into a full trading signal: direction,
 * expected value, risk score, and a baseline (pre-risk-engine) position
 * size using a fractional-Kelly heuristic. The Risk Engine downstream is
 * the final authority on actual position size and can veto entirely.
 */
export class AiAnalysisService {
  constructor(private readonly model: IProbabilityModel) {}

  async analyze(market: NormalizedMarket, features: AiFeatureSet): Promise<AiSignalResult> {
    const { estimatedProbability, confidenceScore, reasoning } = await this.model.estimate(features);

    const yesEdge = estimatedProbability - features.marketYesPrice;
    const noEdge = 1 - estimatedProbability - (1 - features.marketYesPrice);

    let suggestedDirection: 'YES' | 'NO' | null = null;
    let edge = 0;
    if (yesEdge >= MIN_EDGE_TO_TRADE && yesEdge >= noEdge) {
      suggestedDirection = 'YES';
      edge = yesEdge;
    } else if (noEdge >= MIN_EDGE_TO_TRADE && noEdge > yesEdge) {
      suggestedDirection = 'NO';
      edge = noEdge;
    }

    if (confidenceScore < MIN_CONFIDENCE_TO_TRADE) {
      suggestedDirection = null;
    }

    const entryPrice = suggestedDirection === 'NO' ? 1 - features.marketYesPrice : features.marketYesPrice;
    // Expected value per $1 staked, net of the venue fee.
    const winProbability = suggestedDirection === 'NO' ? 1 - estimatedProbability : estimatedProbability;
    const feeFraction = features.feeBps / 10_000;
    const expectedValue = suggestedDirection
      ? winProbability * (1 / entryPrice - 1) - (1 - winProbability) - feeFraction
      : 0;

    const riskScore = this.computeRiskScore(features, confidenceScore);

    // Fractional Kelly (25%) against a normalized $1 bankroll; the risk
    // engine rescales this to the user's actual trading pool and limits.
    const kellyFraction = suggestedDirection
      ? clamp((winProbability - (1 - winProbability) * (entryPrice / (1 - entryPrice))) * 0.25, 0, 0.25)
      : 0;
    const suggestedSizeUsd = suggestedDirection ? round2(kellyFraction * 100) : 0;

    return {
      marketId: market.providerMarketId,
      modelName: this.model.name,
      modelVersion: this.model.version,
      estimatedProbability,
      confidenceScore,
      expectedValue,
      suggestedDirection,
      riskScore,
      suggestedSizeUsd,
      reasoning: suggestedDirection
        ? `${reasoning}; edge ${(edge * 100).toFixed(2)}pp on ${suggestedDirection} at ${entryPrice.toFixed(3)}; EV ${(expectedValue * 100).toFixed(2)}%`
        : `${reasoning}; no trade: edge/confidence below threshold`,
      features,
    };
  }

  private computeRiskScore(features: AiFeatureSet, confidenceScore: number): number {
    let risk = 0.3;
    risk += clamp(features.btcRealizedVolatility24hPct / 10, 0, 1) * 0.3;
    risk += clamp(features.spreadBps / 500, 0, 1) * 0.2;
    risk += (1 - confidenceScore) * 0.3;
    risk -= clamp(features.timeToCloseHours / 72, 0, 1) * 0.1;
    return clamp(risk, 0, 1);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
