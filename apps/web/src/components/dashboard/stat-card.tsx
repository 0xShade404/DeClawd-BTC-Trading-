import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  hint?: string;
  className?: string;
}

/** Small glass tile for a single dashboard metric (balance, ROI, win rate, ...). */
export function StatCard({ label, value, icon: Icon, trend = 'neutral', hint, className }: StatCardProps) {
  return (
    <Card className={cn('glass-hover', className)}>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {Icon && <Icon className="h-4 w-4 text-base-500" aria-hidden="true" />}
        </div>
        <span
          data-testid="stat-card-value"
          className={cn(
            'text-2xl font-semibold tracking-tight',
            trend === 'up' && 'text-success',
            trend === 'down' && 'text-destructive',
          )}
        >
          {value}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}
