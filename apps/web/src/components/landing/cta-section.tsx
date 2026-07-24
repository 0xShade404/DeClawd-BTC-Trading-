'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { googleAuthUrl } from '@/lib/api-client';

export function CtaSection() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="glass relative mx-auto flex max-w-3xl flex-col items-center overflow-hidden rounded-2xl px-6 py-14 text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-glow-radial" aria-hidden="true" />
          <h2 className="relative text-3xl font-bold tracking-tight md:text-4xl">
            Ready to let the agent trade for you?
          </h2>
          <p className="relative mt-4 max-w-md text-muted-foreground">
            Sign in, connect a wallet, and set your risk limits in under two minutes.
          </p>
          <a
            href={googleAuthUrl()}
            className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow-orange transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in with Google
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
