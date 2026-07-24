import { getRedisClient } from './redis';

const NONCE_TTL_SECONDS = 5 * 60; // 5 minutes to complete the sign-and-submit flow
const NAMESPACE = 'declawd:nonce:';

interface CachedEntry {
  value: string;
  expiresAt: number;
}

/** In-memory fallback used when Redis is unreachable (e.g. local dev without Redis running). */
const memoryStore = new Map<string, CachedEntry>();

function memoryPrune(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) memoryStore.delete(key);
  }
}

/**
 * Caches the server-issued nonce/message for a given key (typically a wallet
 * address, lowercased) so it can be verified exactly once when the signed
 * message comes back. Prefers Redis (works across API instances); falls
 * back to an in-process Map otherwise.
 */
export async function setNonce(key: string, value: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(`${NAMESPACE}${key}`, value, 'EX', NONCE_TTL_SECONDS);
      return;
    } catch {
      // fall through to memory store
    }
  }
  memoryPrune();
  memoryStore.set(key, { value, expiresAt: Date.now() + NONCE_TTL_SECONDS * 1000 });
}

export async function getNonce(key: string): Promise<string | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      return await redis.get(`${NAMESPACE}${key}`);
    } catch {
      // fall through to memory store
    }
  }
  memoryPrune();
  return memoryStore.get(key)?.value ?? null;
}

export async function deleteNonce(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`${NAMESPACE}${key}`);
      return;
    } catch {
      // fall through
    }
  }
  memoryStore.delete(key);
}
