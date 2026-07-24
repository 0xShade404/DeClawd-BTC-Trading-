/**
 * Domain-level DTOs shared between the API and web app. These mirror the
 * Prisma models but stay decoupled from the ORM so the frontend never
 * imports @declawd/database directly.
 */

export type UserRole = 'USER' | 'ADMIN' | 'SUPPORT';
export type WalletProvider = 'METAMASK' | 'COINBASE_WALLET' | 'WALLET_CONNECT' | 'RABBY' | 'RAINBOW';
export type LedgerAccountType = 'TRADING_POOL' | 'PROTECTED_VAULT';
export type MarketStatus = 'OPEN' | 'CLOSED' | 'RESOLVED' | 'INVALID';
export type TradeDirection = 'YES' | 'NO';
export type PositionStatus = 'PENDING' | 'OPEN' | 'CLOSING' | 'SETTLED' | 'CANCELLED' | 'FAILED';
export type SettlementStatus = 'PENDING' | 'WON' | 'LOST' | 'PUSHED' | 'DISPUTED';
export type AiAggressiveness = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
export type TradingScheduleMode = 'ALWAYS_ON' | 'MARKET_HOURS' | 'CUSTOM';
export type WithdrawalStatus = 'PENDING' | 'SIGNED' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
export type NotificationChannel = 'EMAIL' | 'TELEGRAM' | 'DISCORD' | 'BROWSER_PUSH';
export type NotificationEvent =
  | 'TRADE_OPENED'
  | 'TRADE_CLOSED'
  | 'LARGE_PROFIT'
  | 'LARGE_LOSS'
  | 'BOT_STOPPED'
  | 'BOT_STARTED'
  | 'ERROR'
  | 'WITHDRAWAL_COMPLETED';

export interface UserDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
}

export interface WalletDto {
  id: string;
  address: string;
  chainId: number;
  provider: WalletProvider;
  isPrimary: boolean;
  verifiedAt: string;
}

export interface LedgerAccountDto {
  type: LedgerAccountType;
  balanceUsd: string;
  updatedAt: string;
}

export interface MarketDto {
  id: string;
  provider: string;
  providerMarketId: string;
  question: string;
  category: string;
  status: MarketStatus;
  yesPrice: number | null;
  noPrice: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  spreadBps: number | null;
  feeBps: number | null;
  closesAt: string | null;
}

export interface AiSignalDto {
  id: string;
  marketId: string;
  confidenceScore: number;
  expectedValue: number;
  suggestedDirection: TradeDirection | null;
  riskScore: number;
  suggestedSizeUsd: number | null;
  reasoning: string;
  createdAt: string;
}

export interface PositionDto {
  id: string;
  marketId: string;
  marketQuestion: string;
  direction: TradeDirection;
  status: PositionStatus;
  entryPrice: number;
  exitPrice: number | null;
  sizeUsd: number;
  feesUsd: number;
  realizedPnlUsd: number | null;
  confidenceScore: number | null;
  reasoning: string | null;
  settlementStatus: SettlementStatus | null;
  openedAt: string;
  closedAt: string | null;
}

export interface TradeDto {
  id: string;
  positionId: string;
  marketQuestion: string;
  direction: TradeDirection;
  side: 'OPEN' | 'CLOSE';
  price: number;
  sizeUsd: number;
  feesUsd: number;
  pnlUsd: number | null;
  confidenceScore: number | null;
  reasoning: string | null;
  executedAt: string;
}

export interface DashboardSummaryDto {
  walletBalanceUsd: number | null;
  tradingPoolUsd: number;
  protectedVaultUsd: number;
  openPositions: PositionDto[];
  dailyProfitUsd: number;
  weeklyProfitUsd: number;
  monthlyProfitUsd: number;
  roiPct: number;
  winRatePct: number;
  sharpeRatio: number;
  botEnabled: boolean;
  nextScanAt: string | null;
}

export interface UserSettingsDto {
  botEnabled: boolean;
  riskPct: number;
  maxDailyLossUsd: number;
  maxTradeSizeUsd: number;
  aiAggressiveness: AiAggressiveness;
  autoCompound: boolean;
  tradingScheduleMode: TradingScheduleMode;
  tradingScheduleCron: string | null;
  vaultAllocationPct: number;
  tradingPoolAllocationPct: number;
}

export interface WithdrawalDto {
  id: string;
  sourceAccount: LedgerAccountType;
  amountUsd: number;
  destinationAddress: string;
  status: WithdrawalStatus;
  txHash: string | null;
  requestedAt: string;
  confirmedAt: string | null;
}

export interface NotificationPreferenceDto {
  channel: NotificationChannel;
  event: NotificationEvent;
  enabled: boolean;
  target: string | null;
}

export interface AdminPlatformMetricsDto {
  totalUsers: number;
  activeBots: number;
  totalVolumeUsd: number;
  totalVaultUsd: number;
  totalTradingPoolUsd: number;
  openPositions: number;
  closedPositions: number;
  revenueUsd: number;
  capturedAt: string;
}
