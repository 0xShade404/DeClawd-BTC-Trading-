'use client';

import type { SVGProps } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { googleAuthUrl } from '@/lib/api-client';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-24 md:pb-28 md:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-glow-radial" aria-hidden="true" />

      <div className="container relative flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground"
        >
          <Zap className="h-3.5 w-3.5 text-bitcoin-500" />
          AI-powered BTC prediction market trading on Polymarket
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-balance max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
        >
          Let AI trade Bitcoin prediction markets.{' '}
          <span className="bg-gradient-to-r from-bitcoin-400 to-bitcoin-600 bg-clip-text text-transparent">
            You keep the keys.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-balance mt-6 max-w-xl text-base text-muted-foreground md:text-lg"
        >
          DeClawd is a non-custodial trading agent that scans BTC markets on Polymarket, sizes
          positions with an AI probability model, and executes trades you always sign yourself.
          Fast, minimal, and never in control of your funds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <a
            href={googleAuthUrl()}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow-orange transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <GoogleIcon className="h-4 w-4" />
            Sign in with Google
            <ArrowRight className="h-4 w-4" />
          </a>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-bitcoin-500" />
            Non-custodial — you always sign your own transactions
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.7 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.7 4 24 4c-7.4 0-13.8 4.1-17.1 10.2z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.6 0 10.7-2.1 14.5-5.6l-6.7-5.5C29.7 34.5 27 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.1 39.7 16 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.4l6.7 5.5C41.4 35.9 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
