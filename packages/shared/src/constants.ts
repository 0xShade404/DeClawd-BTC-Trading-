export const SUPPORTED_CHAIN_ID = 137; // Polygon mainnet
export const USDC_DECIMALS = 6;

export const TRADING_CYCLE_INTERVAL_MINUTES = 15;

export const DEFAULT_VAULT_ALLOCATION_PCT = 70;
export const DEFAULT_TRADING_POOL_ALLOCATION_PCT = 30;

export const RISK_LIMITS = {
  MIN_RISK_PCT: 0.5,
  MAX_RISK_PCT: 10,
  MIN_TRADE_SIZE_USD: 1,
  MAX_TRADE_SIZE_USD: 10_000,
} as const;

export const NOTIFICATION_LARGE_PROFIT_THRESHOLD_USD = 50;
export const NOTIFICATION_LARGE_LOSS_THRESHOLD_USD = 25;

export const JWT_ACCESS_TOKEN_COOKIE = 'declawd_access_token';
export const JWT_REFRESH_TOKEN_COOKIE = 'declawd_refresh_token';

export const API_VERSION = 'v1';
