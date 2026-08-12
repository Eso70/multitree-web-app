import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { SessionService } from './session.service';

function createRedis() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    trackBusinessSession: jest.fn().mockResolvedValue(true),
    untrackBusinessSession: jest.fn().mockResolvedValue(true),
  } as unknown as RedisService;
}

describe('impersonated business sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('never lets an administrator session evict a real one', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            { impersonation_started_at: new Date('2026-08-12T10:00:00Z') },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }),
    } as unknown as DatabaseService;
    const service = new SessionService(database, createRedis());

    await service.createBusinessSession({
      businessId: 'business-id',
      userId: null,
      ipAddress: '203.0.113.9',
      userAgent: 'jest',
      ttlSeconds: 1800,
      impersonation: {
        platformAdminId: 'admin-id',
        platformAdminName: 'Platform Admin',
      },
    });

    const queries = (database.query as jest.Mock).mock.calls as unknown[][];
    const trimSql = String(queries[1][0]);
    // The per-business cap is counted and applied over real sign-ins only.
    expect(trimSql).toContain('impersonated_by_platform_admin_id IS NULL');
  });

  it('stores the session as impersonated and never remembered', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            { impersonation_started_at: new Date('2026-08-12T10:00:00Z') },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }),
    } as unknown as DatabaseService;
    const redis = createRedis();
    const service = new SessionService(database, redis);

    await service.createBusinessSession({
      businessId: 'business-id',
      userId: null,
      ipAddress: '203.0.113.9',
      userAgent: 'jest',
      ttlSeconds: 1800,
      rememberDevice: true,
      impersonation: {
        platformAdminId: 'admin-id',
        platformAdminName: 'Platform Admin',
        reason: 'support ticket 42',
      },
      sessionUser: {
        username: 'ismail',
        name: 'Ismail Store',
        subdomain: 'ismail',
      },
    });

    const queries = (database.query as jest.Mock).mock.calls as unknown[][];
    const insertParams = queries[0][1] as unknown[];
    // `rememberDevice` is ignored for an impersonated session.
    expect(insertParams[6]).toBe(false);
    expect(insertParams[7]).toBe('admin-id');
    expect(insertParams[8]).toBe('support ticket 42');

    const cacheCalls = (redis.set as jest.Mock).mock.calls as unknown[][];
    const cachedUser = cacheCalls[0][1];
    expect(cachedUser).toMatchObject({
      role: 'business',
      impersonation: {
        platformAdminId: 'admin-id',
        platformAdminName: 'Platform Admin',
      },
    });
    expect(cachedUser).not.toHaveProperty('userId');
  });

  it('rebuilds the marker from PostgreSQL after a cache eviction', async () => {
    const database = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [
          {
            business_id: 'business-id',
            user_id: null,
            username: 'ismail',
            name: 'Ismail Store',
            subdomain: 'ismail',
            session_expires_at: new Date(Date.now() + 60_000).toISOString(),
            impersonated_by_platform_admin_id: 'admin-id',
            impersonated_by_name: 'Platform Admin',
            impersonation_started_at: new Date('2026-08-12T10:00:00Z'),
          },
        ],
      }),
    } as unknown as DatabaseService;
    const service = new SessionService(database, createRedis());

    const user = await service.getSessionUser('session-token');

    // A cache miss must not silently downgrade a borrowed session into an
    // ordinary owner session, which would bypass the restriction policy and
    // the dashboard banner.
    expect(user?.impersonation).toEqual({
      platformAdminId: 'admin-id',
      platformAdminName: 'Platform Admin',
      startedAt: '2026-08-12T10:00:00.000Z',
    });
  });

  it('leaves an ordinary owner session unmarked', async () => {
    const database = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [
          {
            business_id: 'business-id',
            user_id: 'user-id',
            username: 'ismail',
            name: 'Ismail Store',
            subdomain: 'ismail',
            session_expires_at: new Date(Date.now() + 60_000).toISOString(),
            impersonated_by_platform_admin_id: null,
            impersonated_by_name: null,
            impersonation_started_at: null,
          },
        ],
      }),
    } as unknown as DatabaseService;
    const service = new SessionService(database, createRedis());

    const user = await service.getSessionUser('session-token');

    expect(user).not.toHaveProperty('impersonation');
    expect(user?.userId).toBe('user-id');
  });
});
