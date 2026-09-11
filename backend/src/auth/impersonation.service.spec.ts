import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { SessionService } from './session.service';
import { ImpersonationService } from './impersonation.service';
import { authHandoffKey, AUTH_HANDOFF_TTL_SECONDS } from './auth-handoff';

const admin = { id: 'admin-id', name: 'Platform Admin' };
const context = { ipAddress: '203.0.113.9', userAgent: 'jest' };

function createService(businessRow?: Record<string, unknown>) {
  const database = {
    query: jest
      .fn()
      .mockResolvedValue({ rows: businessRow ? [businessRow] : [] }),
  } as unknown as DatabaseService;
  const redis = {
    isAvailable: jest.fn().mockReturnValue(true),
    isRateLimited: jest.fn().mockResolvedValue(false),
    set: jest.fn().mockResolvedValue(true),
  } as unknown as RedisService;
  const sessions = {
    destroySession: jest.fn().mockResolvedValue(undefined),
  } as unknown as SessionService;
  const config = {
    get: jest.fn((key: string) =>
      key === 'APP_BASE_URL' ? 'http://lvh.me:3011' : undefined,
    ),
  };
  const service = new ImpersonationService(
    database,
    redis,
    sessions,
    config as never,
  );
  return { service, database, redis, sessions };
}

const activeBusiness = {
  id: 'business-id',
  username: 'ismail',
  name: 'Ismail Store',
  subdomain: 'ismail',
  status: 'active',
};

describe('ImpersonationService.start', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mints a single-use tenant handoff instead of a credential', async () => {
    const { service, redis } = createService(activeBusiness);

    const result = await service.start({
      businessId: 'business-id',
      admin,
      reason: 'support ticket 42',
      context,
    });

    const cacheCalls = (redis.set as jest.Mock).mock.calls as unknown[][];
    const [key, payload, ttl] = cacheCalls[0];
    expect(ttl).toBe(AUTH_HANDOFF_TTL_SECONDS);
    expect(payload).toMatchObject({
      kind: 'impersonation',
      business_id: 'business-id',
      subdomain: 'ismail',
      rememberDevice: false,
      // Never attributed to a real owner account.
      user_id: null,
      impersonation: {
        platformAdminId: 'admin-id',
        platformAdminName: 'Platform Admin',
        reason: 'support ticket 42',
      },
    });

    // The code travels in the URL; only its digest is stored.
    const code = new URL(result.redirectUrl).searchParams.get('code') || '';
    expect(code).not.toHaveLength(0);
    expect(key).toBe(authHandoffKey(code));
    expect(key).not.toContain(code);

    expect(result.redirectUrl).toContain('http://ismail.lvh.me:3011');
    expect(result.redirectUrl).toContain('/business/auth/consume?code=');
  });

  it('rejects an unknown business', async () => {
    const { service, redis } = createService();

    await expect(
      service.start({ businessId: 'missing', admin, context }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it.each([
    ['suspended', { ...activeBusiness, status: 'suspended' }],
    ['subdomain-less', { ...activeBusiness, subdomain: null }],
  ])('refuses a %s business', async (_label, row) => {
    const { service, redis } = createService(row);

    await expect(
      service.start({ businessId: 'business-id', admin, context }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('refuses to mint when the temporary store is unavailable', async () => {
    const { service, redis } = createService(activeBusiness);
    (redis.isAvailable as jest.Mock).mockReturnValue(false);

    await expect(
      service.start({ businessId: 'business-id', admin, context }),
    ).rejects.toThrow(/temporarily unavailable/i);
  });

  it('rate limits repeated attempts by the same administrator', async () => {
    const { service, redis } = createService(activeBusiness);
    (redis.isRateLimited as jest.Mock).mockResolvedValue(true);

    await expect(
      service.start({ businessId: 'business-id', admin, context }),
    ).rejects.toThrow(/Too many impersonation attempts/i);
    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe('ImpersonationService.end', () => {
  beforeEach(() => jest.clearAllMocks());

  const impersonatedUser = {
    id: 'business-id',
    username: 'ismail',
    name: 'Ismail Store',
    role: 'business' as const,
    subdomain: 'ismail',
    impersonation: {
      platformAdminId: 'admin-id',
      platformAdminName: 'Platform Admin',
      startedAt: '2026-08-12T10:00:00.000Z',
    },
  };

  it('destroys the impersonated session', async () => {
    const { service, sessions } = createService(activeBusiness);

    const result = await service.end({
      sessionToken: 'token',
      user: impersonatedUser,
      context,
    });

    expect(sessions.destroySession).toHaveBeenCalledWith(
      'token',
      impersonatedUser,
    );
    expect(result.consoleUrl).toBe('http://lvh.me:3011');
  });

  it('refuses to end an ordinary owner session', async () => {
    const { service, sessions } = createService(activeBusiness);

    await expect(
      service.end({
        sessionToken: 'token',
        user: { ...impersonatedUser, impersonation: undefined },
        context,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessions.destroySession).not.toHaveBeenCalled();
  });
});
