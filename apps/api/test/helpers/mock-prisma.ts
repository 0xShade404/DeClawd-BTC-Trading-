import { vi } from 'vitest';

/**
 * Minimal Prisma mock shared by tests that need `buildApp()` to construct
 * successfully without a live Postgres connection. Individual tests extend
 * specific model methods as needed; everything else defaults to a
 * never-called vi.fn() so an unexpected call surfaces loudly as a mock
 * assertion failure rather than a real DB connection attempt.
 */
export function createMockPrisma() {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $transaction: vi.fn(),
    user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    wallet: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), upsert: vi.fn(), delete: vi.fn(), update: vi.fn() },
    userSettings: { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    ledgerAccount: { upsert: vi.fn(), findUnique: vi.fn(), aggregate: vi.fn() },
    ledgerEntry: { aggregate: vi.fn() },
    position: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    trade: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    settlement: { groupBy: vi.fn() },
    market: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    aiSignal: { findFirst: vi.fn() },
    botRun: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    withdrawal: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    notificationPreference: { findMany: vi.fn(), upsert: vi.fn() },
    notificationLog: { create: vi.fn() },
    auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  };
}
