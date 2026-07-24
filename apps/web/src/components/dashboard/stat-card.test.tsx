import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Wallet } from 'lucide-react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Wallet balance" value="$1,234.56" />);
    expect(screen.getByText('Wallet balance')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-value')).toHaveTextContent('$1,234.56');
  });

  it('renders an optional hint and icon without crashing', () => {
    render(<StatCard label="ROI" value="12.3%" icon={Wallet} hint="Since inception" trend="up" />);
    expect(screen.getByText('Since inception')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-value')).toHaveTextContent('12.3%');
  });
});
