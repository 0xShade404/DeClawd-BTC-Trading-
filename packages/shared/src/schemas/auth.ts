import { z } from 'zod';

export const googleAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1).optional(),
});
export type GoogleAuthCallbackInput = z.infer<typeof googleAuthCallbackSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(), // may also arrive via httpOnly cookie
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * SIWE-style message + signature proving control of a wallet address.
 * The message is generated server-side (nonce + domain binding) and signed
 * client-side by the user's wallet - the private key never leaves the client.
 */
export const linkWalletSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid EVM address'),
  chainId: z.number().int().positive(),
  provider: z.enum(['METAMASK', 'COINBASE_WALLET', 'WALLET_CONNECT', 'RABBY', 'RAINBOW']),
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Must be a valid hex signature'),
});
export type LinkWalletInput = z.infer<typeof linkWalletSchema>;

export const walletNonceRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});
export type WalletNonceRequestInput = z.infer<typeof walletNonceRequestSchema>;
