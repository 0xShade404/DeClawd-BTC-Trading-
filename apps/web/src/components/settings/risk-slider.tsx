'use client';

import * as React from 'react';
import { Slider } from '@/components/ui/slider';
import { clamp } from '@/lib/utils';

export interface RiskSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  id?: string;
}

/**
 * Labeled slider for a bounded numeric risk setting (e.g. riskPct, governed
 * by @declawd/shared's RISK_LIMITS). Always clamps both the displayed value
 * and any value fed back via onChange to [min, max], so a caller can never
 * end up with an out-of-range setting even if `value` arrives out of bounds
 * (e.g. a stale prop during a settings refetch).
 */
export function RiskSlider({
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
  formatValue,
  disabled,
  id,
}: RiskSliderProps) {
  const clamped = clamp(value, min, max);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-sm text-bitcoin-500" data-testid="risk-slider-value">
          {formatValue ? formatValue(clamped) : clamped}
        </span>
      </div>
      <Slider
        id={id}
        value={clamped}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(next) => onChange(clamp(next, min, max))}
        aria-label={label}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}
