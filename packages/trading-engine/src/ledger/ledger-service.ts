import type { PrismaClient } from '@declawd/database';
import { allocateProfit } from '../profit/profit-distribution';

/**
 * All writes to LedgerAccount balances happen exclusively through this
 * service, inside a single Prisma transaction per operation, so the
 * denormalized `balance` column never drifts from the sum of its entries.
 */
export class LedgerService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrCreateAccounts(userId: string) {
    const [tradingPool, vault] = await Promise.all([
      this.prisma.ledgerAccount.upsert({
        where: { userId_type: { userId, type: 'TRADING_POOL' } },
        update: {},
        create: { userId, type: 'TRADING_POOL' },
      }),
      this.prisma.ledgerAccount.upsert({
        where: { userId_type: { userId, type: 'PROTECTED_VAULT' } },
        update: {},
        create: { userId, type: 'PROTECTED_VAULT' },
      }),
    ]);
    return { tradingPool, vault };
  }

  /** Debits the trading pool when a position is opened. */
  async recordTradeOpen(userId: string, tradeId: string, sizeUsd: number, feesUsd: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const account = await tx.ledgerAccount.findUniqueOrThrow({
        where: { userId_type: { userId, type: 'TRADING_POOL' } },
      });
      const debit = sizeUsd + feesUsd;
      const balanceAfter = Number(account.balance) - debit;

      await tx.ledgerEntry.create({
        data: {
          userId,
          accountId: account.id,
          type: 'TRADE_DEBIT',
          amount: -debit,
          balanceAfter,
          relatedTradeId: tradeId,
          description: 'Position opened',
        },
      });
      await tx.ledgerAccount.update({ where: { id: account.id }, data: { balance: balanceAfter } });
    });
  }

  /**
   * Applies a settled position's result to the ledger: the trading pool is
   * credited with the full payout (stake back + P&L). If the outcome was
   * profitable, the realized profit is then split into the vault and
   * trading pool per the user's configured allocation - losses are left
   * entirely in the trading pool.
   */
  async recordTradeSettlement(params: {
    userId: string;
    tradeId: string;
    payoutUsd: number;
    stakeUsd: number;
    vaultAllocationPct: number;
    tradingPoolAllocationPct: number;
    autoCompound: boolean;
  }): Promise<{ vaultAmountUsd: number; tradingPoolAmountUsd: number; pnlUsd: number }> {
    const pnlUsd = params.payoutUsd - params.stakeUsd;

    return this.prisma.$transaction(async (tx) => {
      const tradingPool = await tx.ledgerAccount.findUniqueOrThrow({
        where: { userId_type: { userId: params.userId, type: 'TRADING_POOL' } },
      });

      // Step 1: credit the full payout to the trading pool.
      let tradingPoolBalance = Number(tradingPool.balance) + params.payoutUsd;
      await tx.ledgerEntry.create({
        data: {
          userId: params.userId,
          accountId: tradingPool.id,
          type: pnlUsd >= 0 ? 'TRADE_CREDIT' : 'LOSS_ABSORPTION',
          amount: params.payoutUsd,
          balanceAfter: tradingPoolBalance,
          relatedTradeId: params.tradeId,
          description: `Settlement payout (pnl ${pnlUsd.toFixed(2)})`,
        },
      });

      let vaultAmountUsd = 0;
      let tradingPoolAmountUsd = 0;

      // Step 2: if profitable and auto-compound is on, sweep the realized
      // profit into the vault/pool split. If auto-compound is off, the
      // full payout stays in the trading pool for the user to manage.
      if (pnlUsd > 0 && params.autoCompound) {
        const allocation = allocateProfit(
          pnlUsd,
          params.vaultAllocationPct,
          params.tradingPoolAllocationPct,
        );
        vaultAmountUsd = allocation.vaultAmountUsd;
        tradingPoolAmountUsd = allocation.tradingPoolAmountUsd;

        if (vaultAmountUsd > 0) {
          tradingPoolBalance -= vaultAmountUsd;
          await tx.ledgerEntry.create({
            data: {
              userId: params.userId,
              accountId: tradingPool.id,
              type: 'PROFIT_ALLOCATION',
              amount: -vaultAmountUsd,
              balanceAfter: tradingPoolBalance,
              relatedTradeId: params.tradeId,
              description: 'Profit swept to Protected Vault',
            },
          });
          await tx.ledgerAccount.update({
            where: { id: tradingPool.id },
            data: { balance: tradingPoolBalance },
          });

          const vault = await tx.ledgerAccount.findUniqueOrThrow({
            where: { userId_type: { userId: params.userId, type: 'PROTECTED_VAULT' } },
          });
          const vaultBalance = Number(vault.balance) + vaultAmountUsd;
          await tx.ledgerEntry.create({
            data: {
              userId: params.userId,
              accountId: vault.id,
              type: 'PROFIT_ALLOCATION',
              amount: vaultAmountUsd,
              balanceAfter: vaultBalance,
              relatedTradeId: params.tradeId,
              description: 'Profit received from Trading Pool',
            },
          });
          await tx.ledgerAccount.update({ where: { id: vault.id }, data: { balance: vaultBalance } });
          return { vaultAmountUsd, tradingPoolAmountUsd, pnlUsd };
        }
      }

      await tx.ledgerAccount.update({ where: { id: tradingPool.id }, data: { balance: tradingPoolBalance } });
      return { vaultAmountUsd, tradingPoolAmountUsd, pnlUsd };
    });
  }

  async recordWithdrawal(userId: string, withdrawalId: string, accountType: 'TRADING_POOL' | 'PROTECTED_VAULT', amountUsd: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const account = await tx.ledgerAccount.findUniqueOrThrow({
        where: { userId_type: { userId, type: accountType } },
      });
      if (Number(account.balance) < amountUsd) {
        throw new Error('Insufficient balance for withdrawal');
      }
      const balanceAfter = Number(account.balance) - amountUsd;
      await tx.ledgerEntry.create({
        data: {
          userId,
          accountId: account.id,
          type: 'WITHDRAWAL',
          amount: -amountUsd,
          balanceAfter,
          relatedWithdrawalId: withdrawalId,
          description: 'Withdrawal to user wallet',
        },
      });
      await tx.ledgerAccount.update({ where: { id: account.id }, data: { balance: balanceAfter } });
    });
  }
}
