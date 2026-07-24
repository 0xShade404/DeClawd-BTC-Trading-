import { describe, expect, it, vi } from 'vitest';
import { createMockPrisma } from './helpers/mock-prisma';

vi.mock('@declawd/database', () => ({ prisma: createMockPrisma() }));
vi.mock('../src/lib/redis', () => ({
  isRedisConnected: vi.fn().mockResolvedValue(false),
  getRedisClient: vi.fn().mockReturnValue(null),
  connectRedis: vi.fn().mockResolvedValue(null),
  closeRedis: vi.fn().mockResolvedValue(undefined),
}));

import { buildApp } from '../src/app';

describe('GET /health', () => {
  it('reports ok when the database is reachable', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.dbConnected).toBe(true);
    expect(typeof body.uptime).toBe('number');

    await app.close();
  });
});
