import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { SecurityAuditService } from './security-audit.service';
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
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new ImpersonationService(
    database,
    redis,
    sessions,
    config as never,
    audit as unknown as SecurityAuditService,
  );
  return { service, database, redis, sessions, audit };
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

  it('records a platform-attributed audit event', async () => {
    const { service, audit } = createService(activeBusiness);

    await service.start({ businessId: 'business-id', admin, context });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: 'platform-admin',
        actorId: 'admin-id',
        businessId: 'business-id',
        eventType: 'platform.business.impersonation.start',
        outcome: 'success',
        ipAddress: '203.0.113.9',
      }),
    );
  });

  it('rejects an unknown business and records the denial', async () => {
    const { service, redis, audit } = createService();

    await expect(
      service.start({ businessId: 'missing', admin, context }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(redis.set).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'failure',
        metadata: { reason: 'business_not_found' },
      }),
    );
  });

  it.each([
    ['suspended', { ...activeBusiness, status: 'suspended' }],
    ['subdomain-less', { ...activeBusiness, subdomain: null }],
  ])('refuses a %s business and records the denial', async (_label, row) => {
    const { service, redis, audit } = createService(row);

    await expect(
      service.start({ businessId: 'business-id', admin, context }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(redis.set).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure' }),
    );
  });

  it('refuses to mint when the temporary store is unavailable', async () => {
    const { service, redis } = createService(activeBusiness);
    (redis.isAvailable as jest.Mock).mockReturnValue(false);

    await expect(
      service.start({ businessId: 'business-id', admin, context }),
    ).rejects.toThrow(/temporarily unavailable/i);
  });

  it('rate limits repeated attempts by the same administrator', async () => {
    const { service, redis, audit } = createService(activeBusiness);
    (redis.isRateLimited as jest.Mock).mockResolvedValue(true);

    await expect(
      service.start({ businessId: 'business-id', admin, context }),
    ).rejects.toThrow(/Too many impersonation attempts/i);
    expect(redis.set).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'denied',
        metadata: { reason: 'rate_limited' },
      }),
    );
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

  it('destroys the session and records the end of administrator access', async () => {
    const { service, sessions, audit } = createService(activeBusiness);

    const result = await service.end({
      sessionToken: 'token',
      user: impersonatedUser,
      context,
    });

    expect(sessions.destroySession).toHaveBeenCalledWith(
      'token',
      impersonatedUser,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: 'platform-admin',
        actorId: 'admin-id',
        eventType: 'platform.business.impersonation.end',
      }),
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
