'use client';

import * as React from 'react';
import { cn, clamp } from '@/lib/utils';

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Minimal single-thumb range slider, shadcn/ui `Slider`-compatible API
 * (native <input type="range"> under the hood so it stays accessible and
 * keyboard operable without extra JS). Value is always clamped to
 * [min, max] so callers (e.g. the risk % control) can't push it out of the
 * configured bounds.
 */
const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, disabled, id, className, ...props }, ref) => {
    const clamped = clamp(value, min, max);
    const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

    return (
      <input
        ref={ref}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={disabled}
        onChange={(e) => onValueChange(clamp(Number(e.target.value), min, max))}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-base-500 disabled:cursor-not-allowed disabled:opacity-50',
          '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow-blue',
          className,
        )}
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
        }}
        {...props}
      />
    );
  },
);
Slider.displayName = 'Slider';

export { Slider };
