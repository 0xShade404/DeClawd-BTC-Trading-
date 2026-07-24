import { ShieldCheck } from 'lucide-react';

/**
 * Persistent reminder that DeClawd never takes custody of funds — shown in
 * the app shell footer and anywhere a wallet signature is requested.
 */
export function NonCustodialBanner({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 border-t border-white/10 bg-black/40 px-4 py-2.5 text-center text-xs text-muted-foreground backdrop-blur-glass ${className ?? ''}`}
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-base-500" aria-hidden="true" />
      <span>DeClawd is non-custodial — you always sign your own transactions.</span>
    </div>
  );
}
