'use client';

import { motion } from 'framer-motion';
import { Wallet, Bot, TrendingUp, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const STEPS = [
  {
    icon: Wallet,
    title: 'Connect your wallet',
    description:
      'Link a Polygon wallet (MetaMask, Coinbase Wallet, Rainbow, WalletConnect, or Rabby) by signing a message — no seed phrase or private key ever touches DeClawd.',
  },
  {
    icon: Bot,
    title: 'Enable the AI agent',
    description:
      'Set your risk %, max daily loss, and AI aggressiveness. DeClawd scans eligible BTC markets on Polymarket every cycle for edges the model is confident in.',
  },
  {
    icon: TrendingUp,
    title: 'Automatic trading',
    description:
      'When the agent finds a positive-expected-value setup within your limits, it sizes and opens the position. Every trade is logged with its confidence and reasoning.',
  },
  {
    icon: PiggyBank,
    title: 'Profit split vault',
    description:
      'Realized profit automatically splits between your trading pool and a protected vault (70/30 by default, configurable) so gains compound safely over time.',
  },
] as const;

export function HowItWorksSection() {
  return (
    <section className="px-4 py-20 md:py-28" id="how-it-works">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How DeClawd works</h2>
          <p className="mt-4 text-muted-foreground">
            Four steps from connecting a wallet to a fully automated, non-custodial trading loop.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Card className="h-full glass-hover">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-bitcoin-500/15 text-bitcoin-500">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>
                    {i + 1}. {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
