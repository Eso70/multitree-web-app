import { mockArg } from '../common/test-utils';
import { BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { SessionService } from './session.service';
import { createHash } from 'crypto';

describe('SessionService business session management', () => {
  const redis = {
    del: jest.fn().mockResolvedValue(true),
    untrackBusinessSession: jest.fn().mockResolvedValue(true),
  } as unknown as RedisService;

  beforeEach(() => jest.clearAllMocks());

  it('returns active sessions and recent login activity', async () => {
    const sessions = [{ id: 'session-id', is_current: true }];
    const activity = [{ id: '1', outcome: 'success' }];
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: sessions })
        .mockResolvedValueOnce({ rows: activity }),
    } as unknown as DatabaseService;
    const service = new SessionService(database, redis);

    await expect(
      service.getBusinessLoginSecurity('business-id', 'current-token'),
    ).resolves.toEqual({ sessions, recent_activity: activity });
  });

  it('scopes Creator login activity to Creator audit events', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseService;
    const service = new SessionService(database, redis);

    await service.getCreatorLoginSecurity('creator-business-id', 'token');

    expect(mockArg(database.query, 1, 1)).toEqual([
      'creator-business-id',
      'creator',
      ['creator.login', 'creator.account.create'],
    ]);
  });

  it('revokes a selected session from PostgreSQL and Redis', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [{ session_token_hash: 'revoked-hash' }],
      }),
    } as unknown as DatabaseService;
    const service = new SessionService(database, redis);

    await service.revokeBusinessSession(
      'business-id',
      'session-id',
      'current-token',
    );

    expect(mockArg(database.query, 0, 1)).toEqual([
      'session-id',
      'business-id',
      createHash('sha256').update('current-token').digest('hex'),
    ]);
    expect(redis.del).toHaveBeenCalledWith('session:revoked-hash');
  });

  it('does not allow a business to revoke its current session', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseService;
    const service = new SessionService(database, redis);

    await expect(
      service.revokeBusinessSession(
        'business-id',
        'current-session-id',
        'current-token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a short platform administrator session for Google OAuth', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseService;
    const platformRedis = {
      set: jest.fn().mockResolvedValue(true),
      trackBusinessSession: jest.fn().mockResolvedValue(true),
    } as unknown as RedisService;
    const service = new SessionService(database, platformRedis);

    const result = await service.createPlatformAdminSession({
      platformAdminId: 'admin-id',
      username: 'multitree-admin',
      name: 'MultiTree',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(result.ttlSeconds).toBe(1800);
    expect(result.user.role).toBe('platform-admin');
    expect(platformRedis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^session:/),
      result.user,
      1800,
    );
  });

  it('keeps a remembered business device signed in for 30 days', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
    } as unknown as DatabaseService;
    const service = new SessionService(database, redis);

    const result = await service.createBusinessSession({
      businessId: 'business-id',
      userId: 'user-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      rememberDevice: true,
    });

    expect(result.ttlSeconds).toBe(30 * 24 * 60 * 60);
    expect(mockArg(database.query, 0, 1)).toEqual([
      'business-id',
      'user-id',
      expect.any(String),
      30 * 24 * 60 * 60,
      '127.0.0.1',
      'test-agent',
      true,
      // An owner sign-in carries no impersonation marker or reason.
      null,
      null,
    ]);
    expect(String(mockArg(database.query, 1, 0))).toContain('OFFSET 5');
  });

  it('warms the business session cache during sign-in', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
    } as unknown as DatabaseService;
    const sessionRedis = {
      set: jest.fn().mockResolvedValue(true),
      trackBusinessSession: jest.fn().mockResolvedValue(true),
    } as unknown as RedisService;
    const service = new SessionService(database, sessionRedis);

    const result = await service.createBusinessSession({
      businessId: 'business-id',
      userId: 'user-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      sessionUser: {
        username: 'tenant',
        name: 'Tenant',
        subdomain: 'tenant',
      },
    });

    expect(sessionRedis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^session:/),
      expect.objectContaining({
        id: 'business-id',
        userId: 'user-id',
        username: 'tenant',
        role: 'business',
      }),
      result.ttlSeconds,
    );
  });

  it('keeps a remembered platform device signed in for 7 days', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseService;
    const platformRedis = {
      set: jest.fn().mockResolvedValue(true),
      trackBusinessSession: jest.fn().mockResolvedValue(true),
    } as unknown as RedisService;
    const service = new SessionService(database, platformRedis);

    const result = await service.createPlatformAdminSession({
      platformAdminId: 'admin-id',
      username: 'multitree-admin',
      name: 'MultiTree',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      rememberDevice: true,
    });

    expect(result.ttlSeconds).toBe(7 * 24 * 60 * 60);
  });
});
