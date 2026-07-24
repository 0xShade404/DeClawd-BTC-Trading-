import { describe, expect, it } from 'vitest';
import { createWithdrawalSchema } from './withdrawal';

describe('createWithdrawalSchema', () => {
  const valid = {
    sourceAccount: 'TRADING_POOL' as const,
    amountUsd: 25.5,
    destinationAddress: '0x1234567890123456789012345678901234567890',
    signature: '0xabcdef',
    message: 'Sign to withdraw',
  };

  it('accepts a well-formed withdrawal request', () => {
    expect(createWithdrawalSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a non-positive amount', () => {
    expect(createWithdrawalSchema.safeParse({ ...valid, amountUsd: 0 }).success).toBe(false);
  });

  it('rejects a malformed destination address', () => {
    expect(createWithdrawalSchema.safeParse({ ...valid, destinationAddress: 'not-an-address' }).success).toBe(
      false,
    );
  });

  it('rejects an invalid source account', () => {
    expect(
      createWithdrawalSchema.safeParse({ ...valid, sourceAccount: 'SAVINGS' }).success,
    ).toBe(false);
  });
});
