export interface ProfitAllocation {
  vaultAmountUsd: number;
  tradingPoolAmountUsd: number;
}

/**
 * Splits realized profit between the Protected Vault and the Trading Pool
 * according to the user's configured percentages (default 70/30). Losses
 * are never routed through this function - they are absorbed directly by
 * the Trading Pool ledger balance (see LedgerService.recordTradeSettlement).
 */
export function allocateProfit(
  profitUsd: number,
  vaultAllocationPct: number,
  tradingPoolAllocationPct: number,
): ProfitAllocation {
  if (profitUsd <= 0) {
    return { vaultAmountUsd: 0, tradingPoolAmountUsd: 0 };
  }
  if (Math.round(vaultAllocationPct + tradingPoolAllocationPct) !== 100) {
    throw new Error('vaultAllocationPct + tradingPoolAllocationPct must equal 100');
  }

  const vaultAmountUsd = round2(profitUsd * (vaultAllocationPct / 100));
  const tradingPoolAmountUsd = round2(profitUsd - vaultAmountUsd);

  return { vaultAmountUsd, tradingPoolAmountUsd };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
