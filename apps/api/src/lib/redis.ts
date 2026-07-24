import Redis from 'ioredis';
import { env } from '../config/env';

let client: Redis | null = null;
let connectionFailed = false;

/**
 * Lazily creates a shared ioredis client. Callers that can tolerate Redis
 * being unavailable (nonce cache, rate limiting) should catch errors and
 * fall back to an in-memory implementation rather than crashing the process
 * - Redis is an optimization here, not a hard dependency for local dev.
 */
export function getRedisClient(): Redis | null {
  if (connectionFailed) return null;
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // don't keep retrying forever; caller falls back
    });
    client.on('error', () => {
      // Swallow - callers treat Redis as best-effort. Avoid unhandled 'error' crashes.
    });
  }
  return client;
}

export async function connectRedis(): Promise<Redis | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    if (redis.status === 'ready' || redis.status === 'connecting') return redis;
    await redis.connect();
    return redis;
  } catch {
    connectionFailed = true;
    return null;
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}

export async function isRedisConnected(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
