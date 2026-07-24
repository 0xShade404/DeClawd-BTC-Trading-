import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@declawd/shared';
import { createMockPrisma } from './helpers/mock-prisma';

vi.mock('@declawd/database', () => ({ prisma: createMockPrisma() }));

import { buildApp } from '../src/app';
import { authHeaders } from './helpers/fake-auth';

describe('PATCH /api/v1/settings validation', () => {
  it('rejects a malformed body (riskPct above RISK_LIMITS.MAX_RISK_PCT) with 400 VALIDATION_ERROR', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/settings',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      payload: { riskPct: 999 },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_ERROR);

    await app.close();
  });
});
