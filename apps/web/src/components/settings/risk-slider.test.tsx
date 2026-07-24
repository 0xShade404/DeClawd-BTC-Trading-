import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RiskSlider } from './risk-slider';

describe('RiskSlider', () => {
  it('clamps a value above the configured max down to max', () => {
    render(
      <RiskSlider label="Risk per trade" value={999} min={0.5} max={10} onChange={vi.fn()} id="risk" />,
    );
    const input = screen.getByLabelText('Risk per trade') as HTMLInputElement;
    expect(Number(input.value)).toBe(10);
    expect(screen.getByTestId('risk-slider-value')).toHaveTextContent('10');
  });

  it('clamps a value below the configured min up to min', () => {
    render(
      <RiskSlider label="Risk per trade" value={-5} min={0.5} max={10} onChange={vi.fn()} id="risk" />,
    );
    const input = screen.getByLabelText('Risk per trade') as HTMLInputElement;
    expect(Number(input.value)).toBe(0.5);
  });

  it('reports changes clamped to [min, max] via onChange', () => {
    const onChange = vi.fn();
    render(<RiskSlider label="Risk per trade" value={5} min={0.5} max={10} onChange={onChange} id="risk" />);
    const input = screen.getByLabelText('Risk per trade') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '7' } });
    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it('formats the displayed value with formatValue when provided', () => {
    render(
      <RiskSlider
        label="Risk per trade"
        value={2}
        min={0.5}
        max={10}
        onChange={vi.fn()}
        formatValue={(v) => `${v}%`}
        id="risk"
      />,
    );
    expect(screen.getByTestId('risk-slider-value')).toHaveTextContent('2%');
  });
});
