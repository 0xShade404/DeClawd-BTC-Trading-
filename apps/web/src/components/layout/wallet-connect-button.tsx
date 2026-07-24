'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * Thin wrapper around RainbowKit's ConnectButton so the rest of the app
 * imports one stable component and we control the compact/mobile variant
 * in one place.
 */
export function WalletConnectButton() {
  return (
    <ConnectButton
      showBalance={false}
      chainStatus="icon"
      accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
    />
  );
}
