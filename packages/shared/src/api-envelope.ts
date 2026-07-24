/**
 * Consistent REST response envelope used by every DeClawd API v1 endpoint.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function fail(code: ErrorCode, message: string, details?: unknown): ApiError {
  return { success: false, error: { code, message, ...(details ? { details } : {}) } };
}

/**
 * Stable machine-readable error codes. Map to HTTP status in the API layer
 * (see apps/api/src/plugins/error-handler.ts).
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  WALLET_VERIFICATION_FAILED = 'WALLET_VERIFICATION_FAILED',
  MARKET_NOT_ELIGIBLE = 'MARKET_NOT_ELIGIBLE',
  TRADING_ENGINE_DISABLED = 'TRADING_ENGINE_DISABLED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INSUFFICIENT_BALANCE]: 422,
  [ErrorCode.WALLET_VERIFICATION_FAILED]: 401,
  [ErrorCode.MARKET_NOT_ELIGIBLE]: 422,
  [ErrorCode.TRADING_ENGINE_DISABLED]: 409,
  [ErrorCode.PROVIDER_ERROR]: 502,
  [ErrorCode.INTERNAL_ERROR]: 500,
};
