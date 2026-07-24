import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon } from 'wagmi/chains';

/**
 * wagmi + RainbowKit configuration. RainbowKit's `getDefaultConfig` wires up
 * WalletConnect, MetaMask, Coinbase Wallet, and Rainbow out of the box.
 *
 * Rabby Wallet doesn't have a first-party RainbowKit connector, but it
 * injects `window.ethereum` like MetaMask does, so wagmi's built-in
 * `injected()` connector (included by `getDefaultConfig`) auto-detects it —
 * no extra config needed for users connecting with Rabby.
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'DeClawd',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'declawd-dev-placeholder',
  chains: [polygon],
  ssr: true,
});
