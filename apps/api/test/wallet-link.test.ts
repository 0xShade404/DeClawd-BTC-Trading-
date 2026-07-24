import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@declawd/shared';
import { createMockPrisma } from './helpers/mock-prisma';

vi.mock('@declawd/database', () => ({ prisma: createMockPrisma() }));
vi.mock('../src/lib/redis', () => ({
  isRedisConnected: vi.fn().mockResolvedValue(false),
  getRedisClient: vi.fn().mockReturnValue(null),
  connectRedis: vi.fn().mockResolvedValue(null),
  closeRedis: vi.fn().mockResolvedValue(undefined),
}));

import { buildApp } from '../src/app';
import { authHeaders } from './helpers/fake-auth';

describe('POST /api/v1/wallet/link', () => {
  it('rejects an invalid/unrequested signature with 401 WALLET_VERIFICATION_FAILED before touching Prisma', async () => {
    const app = buildApp();
    await app.ready();

    // No prior POST /wallet/nonce call was made for this address, so the
    // server has no cached message to verify against - the request must
    // fail at signature verification, never reaching the database.
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/wallet/link',
      headers: { ...authHeaders(), 'content-type': 'application/json' },
      payload: {
        address: '0x1234567890123456789012345678901234567890',
        chainId: 137,
        provider: 'METAMASK',
        message: 'this message was never issued by the server',
        signature: '0xdeadbeef',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.WALLET_VERIFICATION_FAILED);

    await app.close();
  });
});
