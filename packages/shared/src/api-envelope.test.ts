import { describe, expect, it } from 'vitest';
import { ERROR_STATUS_MAP, ErrorCode, fail, ok } from './api-envelope';

describe('api envelope', () => {
  it('ok() wraps data as a success envelope', () => {
    expect(ok({ id: '1' })).toEqual({ success: true, data: { id: '1' } });
  });

  it('ok() includes meta when provided', () => {
    expect(ok({ id: '1' }, { page: 1 })).toEqual({
      success: true,
      data: { id: '1' },
      meta: { page: 1 },
    });
  });

  it('fail() wraps an error code and message', () => {
    expect(fail(ErrorCode.NOT_FOUND, 'missing')).toEqual({
      success: false,
      error: { code: ErrorCode.NOT_FOUND, message: 'missing' },
    });
  });

  it('every ErrorCode has a mapped HTTP status', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ERROR_STATUS_MAP[code]).toBeGreaterThanOrEqual(400);
    }
  });
});
