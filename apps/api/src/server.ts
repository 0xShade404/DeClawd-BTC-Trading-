import { buildApp } from './app';
import { env } from './config/env';
import { prisma } from '@declawd/database';
import { connectRedis, closeRedis } from './lib/redis';
import { startTradingCycleScheduler, type TradingCycleSchedulerHandle } from './scheduler/trading-cycle-scheduler';

async function main(): Promise<void> {
  const app = buildApp();

  await connectRedis().catch((err) => {
    app.log.warn({ err }, 'Redis unavailable at startup - continuing with in-memory fallbacks where possible');
  });

  let schedulerHandle: TradingCycleSchedulerHandle | null = null;
  try {
    schedulerHandle = startTradingCycleScheduler(prisma, app.log);
  } catch (err) {
    app.log.error({ err }, 'Failed to start trading cycle scheduler');
  }

  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  app.log.info(`DeClawd API listening on http://${env.API_HOST}:${env.API_PORT}`);

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info(`Received ${signal}, shutting down gracefully...`);

    schedulerHandle?.stop();

    try {
      await app.close();
    } catch (err) {
      app.log.error({ err }, 'Error closing Fastify');
    }

    try {
      await prisma.$disconnect();
    } catch (err) {
      app.log.error({ err }, 'Error disconnecting Prisma');
    }

    await closeRedis();

    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error starting DeClawd API', err);
  process.exit(1);
});
