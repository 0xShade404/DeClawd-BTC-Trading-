import type { TradeDirection } from '@declawd/shared';

/**
 * Normalized market shape returned by any IPredictionMarketProvider.
 * Provider-specific fields live under `raw`.
 */
export interface NormalizedMarket {
  providerId: string;
  providerMarketId: string;
  conditionId?: string;
  slug?: string;
  question: string;
  category: string;
  status: 'OPEN' | 'CLOSED' | 'RESOLVED' | 'INVALID';
  yesPrice: number | null;
  noPrice: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  spreadBps: number | null;
  feeBps: number;
  opensAt: string | null;
  closesAt: string | null;
  resolvesAt: string | null;
  resolvedOutcome: 'YES' | 'NO' | null;
  raw: unknown;
}

export interface OrderBookLevel {
  price: number;
  sizeUsd: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  capturedAt: string;
}

export interface PlaceOrderParams {
  providerMarketId: string;
  direction: TradeDirection;
  side: 'OPEN' | 'CLOSE';
  sizeUsd: number;
  limitPrice: number;
  /** Address of the wallet that will sign / has signed this order. */
  signerAddress: string;
  /**
   * Pre-signed order payload produced client-side by the user's wallet
   * (e.g. a Polymarket CLOB EIP-712 order). The provider relays it —
   * DeClawd's backend never holds signing authority.
   */
  signedOrder: SignedOrderPayload;
}

/**
 * Opaque, provider-defined signed order envelope. The backend only ever
 * transports this value; it cannot construct a valid one without the
 * user's wallet signature.
 */
export interface SignedOrderPayload {
  format: string;
  payload: Record<string, unknown>;
  signature: string;
}

export interface OrderResult {
  orderId: string;
  status: 'FILLED' | 'PARTIALLY_FILLED' | 'OPEN' | 'REJECTED';
  filledPrice: number | null;
  filledSizeUsd: number | null;
  feesUsd: number;
  txHash: string | null;
}

export interface SettlementResult {
  providerMarketId: string;
  status: 'PENDING' | 'RESOLVED';
  resolvedOutcome: 'YES' | 'NO' | null;
  payoutPerShareUsd: number | null;
}

/**
 * Behind-the-interface abstraction for any prediction market venue.
 * Additional providers (e.g. Kalshi, Manifold) implement this same
 * contract so the scanner/AI/risk/execution pipeline stays provider-agnostic.
 */
export interface IPredictionMarketProvider {
  readonly providerId: string;

  /** List markets matching a category/keyword filter (e.g. BTC markets). */
  listMarkets(params: { category?: string; keyword?: string; status?: 'OPEN' }): Promise<NormalizedMarket[]>;

  getMarket(providerMarketId: string): Promise<NormalizedMarket | null>;

  getOrderBook(providerMarketId: string): Promise<OrderBookSnapshot>;

  /**
   * Relay a client-signed order to the venue. Throws ProviderError on
   * rejection. DeClawd never signs on the user's behalf.
   */
  submitOrder(params: PlaceOrderParams): Promise<OrderResult>;

  getSettlement(providerMarketId: string): Promise<SettlementResult>;
}

export class ProviderError extends Error {
  constructor(
    public readonly providerId: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${providerId}] ${message}`);
    this.name = 'ProviderError';
  }
}

// ---------------------------------------------------------------------------
// AI module
// ---------------------------------------------------------------------------

export interface AiFeatureSet {
  btcSpotPrice: number;
  btcMomentum1hPct: number;
  btcMomentum24hPct: number;
  btcRealizedVolatility24hPct: number;
  marketYesPrice: number;
  marketImpliedProbability: number;
  liquidityUsd: number;
  spreadBps: number;
  feeBps: number;
  orderBookImbalance: number; // -1 (all asks) .. 1 (all bids)
  timeToCloseHours: number;
  newsSentimentScore: number | null; // -1..1, null if unavailable
  historicalBriersScore: number | null; // model's own past calibration, null if no history
}

export interface AiSignalResult {
  marketId: string;
  modelName: string;
  modelVersion: string;
  /** Model's estimated probability the YES outcome resolves true, 0..1. */
  estimatedProbability: number;
  /** Model's confidence in its own estimate, 0..1. */
  confidenceScore: number;
  /** Expected value of taking the suggested position, as a fraction of stake. */
  expectedValue: number;
  suggestedDirection: TradeDirection | null;
  riskScore: number; // 0..1, higher = riskier
  suggestedSizeUsd: number;
  reasoning: string;
  features: AiFeatureSet;
}

/**
 * Pluggable probability-estimation strategy. The default implementation
 * (RuleBasedProbabilityModel) is a transparent, deterministic baseline.
 * Swap in a trained/statistical or LLM-backed model by implementing this
 * interface - the rest of the pipeline (risk engine, execution) is unaffected.
 */
export interface IProbabilityModel {
  readonly name: string;
  readonly version: string;
  estimate(features: AiFeatureSet): Promise<{
    estimatedProbability: number;
    confidenceScore: number;
    reasoning: string;
  }>;
}

// ---------------------------------------------------------------------------
// Risk engine
// ---------------------------------------------------------------------------

export interface RiskProfile {
  riskPct: number; // % of trading pool to risk per trade
  maxDailyLossUsd: number;
  maxTradeSizeUsd: number;
  aiAggressiveness: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
}

export interface RiskEvaluationInput {
  signal: AiSignalResult;
  market: NormalizedMarket;
  tradingPoolBalanceUsd: number;
  realizedLossTodayUsd: number;
  openExposureUsd: number;
  riskProfile: RiskProfile;
}

export interface RiskEvaluationResult {
  approved: boolean;
  sizeUsd: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

export interface MarketEligibility {
  market: NormalizedMarket;
  eligible: boolean;
  rejectionReason: string | null;
}

export interface ScannerConfig {
  keywords: string[];
  minLiquidityUsd: number;
  maxSpreadBps: number;
  maxFeeBps: number;
  minTimeToCloseMinutes: number;
  minTimeToCloseHours?: number;
}
