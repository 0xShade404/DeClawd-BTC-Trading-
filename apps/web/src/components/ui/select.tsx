'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Minimal native-<select>-backed dropdown styled to match the glass design
 * system. Keeps full keyboard/accessibility support for free; can be
 * swapped for a Radix-based shadcn/ui Select later with the same props.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ value, onValueChange, options, placeholder, disabled, id, className, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            'flex h-10 w-full appearance-none rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 pr-9 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-background text-muted-foreground">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-background text-foreground">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
