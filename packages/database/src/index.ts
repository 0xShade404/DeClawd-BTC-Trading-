import { PrismaClient } from './generated';

export * from './generated';

declare global {
  // eslint-disable-next-line no-var
  var __declawdPrisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client. In dev, reused across hot reloads via globalThis
 * to avoid exhausting the Postgres connection pool.
 */
export const prisma: PrismaClient =
  globalThis.__declawdPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__declawdPrisma = prisma;
}
