'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Gauge, LineChart, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Non-custodial by design',
    description:
      'DeClawd never holds your private keys or seed phrase. Every withdrawal and trade authorization is a message you sign with your own wallet.',
  },
  {
    icon: Gauge,
    title: 'Configurable risk',
    description:
      'Cap risk per trade, set a max daily loss, and choose an AI aggressiveness profile from conservative to aggressive.',
  },
  {
    icon: LineChart,
    title: 'Transparent signals',
    description:
      'Every AI trade shows its confidence score, expected value, and plain-English reasoning — nothing is a black box.',
  },
  {
    icon: Lock,
    title: 'Protected vault',
    description:
      'A configurable share of profits automatically moves into a protected vault, separate from active trading capital.',
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Built for professionals, not degens
          </h2>
          <p className="mt-4 text-muted-foreground">
            A fast, minimal interface with the guardrails serious traders expect.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Card className="h-full glass-hover">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-base-500/15 text-base-500">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
