import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-10">
      <div className="container flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <span className="chrome flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white">
            D
          </span>
          <span className="font-semibold tracking-tight">DeClawd</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-base-500" />
          Non-custodial — you always sign your own transactions.
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/help" className="hover:text-foreground">
            Help &amp; FAQ
          </Link>
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Polymarket
          </a>
        </nav>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} DeClawd. Not financial advice. Prediction markets
          carry risk of loss.
        </p>
      </div>
    </footer>
  );
}
