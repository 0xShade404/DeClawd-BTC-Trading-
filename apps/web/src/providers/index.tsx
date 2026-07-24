'use client';

import * as React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from './wagmi-config';
import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';

const rainbowKitTheme = darkTheme({
  accentColor: '#F7931A',
  accentColorForeground: '#0a0a0f',
  borderRadius: 'medium',
  overlayBlur: 'small',
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryProvider>
        <RainbowKitProvider theme={rainbowKitTheme}>
          <AuthProvider>{children}</AuthProvider>
        </RainbowKitProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
