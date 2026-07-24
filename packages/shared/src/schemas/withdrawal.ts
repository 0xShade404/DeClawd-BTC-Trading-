import { z } from 'zod';

export const createWithdrawalSchema = z.object({
  sourceAccount: z.enum(['TRADING_POOL', 'PROTECTED_VAULT']),
  amountUsd: z.number().positive(),
  destinationAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  // Signature authorizing this withdrawal, produced by the user's wallet.
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  message: z.string().min(1),
});
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
