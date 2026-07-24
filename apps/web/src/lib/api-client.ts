import type { ApiResponse } from '@declawd/shared';
import { ErrorCode } from '@declawd/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
const API_PREFIX = '/api/v1';

/**
 * Typed error thrown by the api-client whenever the backend responds with
 * `{success:false}`, a non-2xx status with no envelope, or a network
 * failure. Carries the stable machine-readable ErrorCode from
 * @declawd/shared so callers can branch on it (e.g. redirect to `/` on
 * UNAUTHORIZED).
 */
export class ApiClientError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function handleResponse<T>(res: Response): Promise<T> {
  let body: ApiResponse<T> | undefined;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(
      ErrorCode.INTERNAL_ERROR,
      `Received a non-JSON response (HTTP ${res.status})`,
      res.status,
    );
  }

  if (!body.success) {
    throw new ApiClientError(body.error.code, body.error.message, res.status, body.error.details);
  }

  return body.data;
}

async function request<T>(
  path: string,
  init: RequestInit & { params?: QueryParams } = {},
): Promise<T> {
  const { params, headers, ...rest } = init;
  try {
    const res = await fetch(buildUrl(path, params), {
      ...rest,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...headers,
      },
    });
    return await handleResponse<T>(res);
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    throw new ApiClientError(
      ErrorCode.INTERNAL_ERROR,
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }
}

export function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>(path, { method: 'GET', params });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export { API_BASE_URL, API_PREFIX };

/** Full URL to start the Google OAuth flow — navigate the browser here directly, never fetch(). */
export function googleAuthUrl(): string {
  return `${API_BASE_URL}${API_PREFIX}/auth/google`;
}
