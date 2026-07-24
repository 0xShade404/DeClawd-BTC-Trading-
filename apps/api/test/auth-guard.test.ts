import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@declawd/shared';
import { createMockPrisma } from './helpers/mock-prisma';

vi.mock('@declawd/database', () => ({ prisma: createMockPrisma() }));

import { buildApp } from '../src/app';

describe('Protected routes without authentication', () => {
  it('returns 401 UNAUTHORIZED for GET /api/v1/dashboard/summary with no access token', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/api/v1/dashboard/summary' });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.UNAUTHORIZED);

    await app.close();
  });
});
