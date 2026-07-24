'use client';

import type { AiAggressiveness } from '@declawd/shared';
import { cn } from '@/lib/utils';

const OPTIONS: { value: AiAggressiveness; label: string; description: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservative', description: 'Fewer trades, high-confidence only' },
  { value: 'BALANCED', label: 'Balanced', description: 'Default risk/reward profile' },
  { value: 'AGGRESSIVE', label: 'Aggressive', description: 'More trades, lower confidence bar' },
];

export function AggressivenessSelector({
  value,
  onChange,
  disabled,
}: {
  value: AiAggressiveness;
  onChange: (value: AiAggressiveness) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="AI aggressiveness"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              active
                ? 'border-primary bg-primary/10'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/5',
            )}
          >
            <span className={cn('text-sm font-medium', active && 'text-primary')}>{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
