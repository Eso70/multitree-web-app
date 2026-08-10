import { GoneException, UnauthorizedException } from '@nestjs/common';
import {
  buildTenantUrl,
  BusinessOnboardingService,
} from './business-onboarding.service';

function createService() {
  const database = { query: jest.fn() };
  const config = {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  };
  const service = new BusinessOnboardingService(
    database as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config as never,
  );
  return { service, database, config };
}

describe('BusinessOnboardingService invitations', () => {
  it('preserves the handoff query when building a tenant URL', () => {
    expect(
      buildTenantUrl(
        'http://lvh.me:3011',
        'ismail',
        '/business/auth/consume?code=handoff-token',
      ),
    ).toBe(
      'http://ismail.lvh.me:3011/business/auth/consume?code=handoff-token',
    );
  });

  it('emails a one-time code and creates a tenant-bound business session', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [{ user_id: 'user-1', business_id: 'business-1' }],
        })
        .mockResolvedValue({ rows: [] }),
    };
    let savedChallenge: unknown;
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      isRateLimited: jest.fn().mockResolvedValue(false),
      set: jest.fn((_key: string, value: unknown) => {
        savedChallenge = value;
        return Promise.resolve(true);
      }),
      consume: jest.fn(() => Promise.resolve(savedChallenge)),
      del: jest.fn().mockResolvedValue(true),
    };
    const sessions = {
      createBusinessSession: jest.fn().mockResolvedValue({
        sessionToken: 'session-token',
        ttlSeconds: 7200,
      }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    let sentCode = '';
    const mail = {
      sendBusinessLoginCode: jest.fn((_email: string, code: string) => {
        sentCode = code;
        return Promise.resolve();
      }),
    };
    const config = {
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
      getOrThrow: jest.fn().mockReturnValue('test-session-secret'),
    };
    const service = new BusinessOnboardingService(
      database as never,
      redis as never,
      {} as never,
      sessions as never,
      {} as never,
      config as never,
      audit as never,
      mail as never,
    );

    const challenge = await service.requestBusinessEmailCode(
      ' Owner@Example.com ',
      'tenant',
    );
    const session = await service.verifyBusinessEmailCode({
      challengeId: challenge.challengeId,
      code: sentCode,
      subdomain: 'tenant',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(mail.sendBusinessLoginCode).toHaveBeenCalledWith(
      'owner@example.com',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(sessions.createBusinessSession).toHaveBeenCalledWith({
      businessId: 'business-1',
      userId: 'user-1',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      rememberDevice: false,
    });
    expect(session).toEqual({
      sessionToken: 'session-token',
      ttlSeconds: 7200,
    });
  });

  it('creates a platform session only for the configured verified Google email', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: 'admin-1',
            username: 'multitree-admin',
            name: 'MultiTree',
            email: 'esma3ildilshad04x@gmail.com',
          },
        ],
      }),
    };
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      consume: jest.fn().mockResolvedValue({
        mode: 'platform-admin',
        nonce: 'nonce',
        verifier: 'verifier',
      }),
    };
    const google = {
      exchangeCode: jest.fn().mockResolvedValue({
        subject: 'google-subject',
        email: 'esma3ildilshad04x@gmail.com',
        name: 'Ismail',
        avatarUrl: null,
        emailVerified: true,
      }),
    };
    const sessions = {
      createPlatformAdminSession: jest.fn().mockResolvedValue({
        sessionToken: 'platform-session',
        ttlSeconds: 1800,
      }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'PLATFORM_ADMIN_EMAIL') {
          return 'esma3ildilshad04x@gmail.com';
        }
        if (key === 'PLATFORM_ADMIN_PATH') {
          return '/ops-9c741e5b2f8a4d63b017ce95';
        }
        if (key === 'APP_BASE_URL') return 'http://lvh.me:3011';
        return fallback;
      }),
    };
    const service = new BusinessOnboardingService(
      database as never,
      redis as never,
      google as never,
      sessions as never,
      {} as never,
      config as never,
      audit as never,
    );

    await expect(
      service.finishGoogleCallback('code', 'state', {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      }),
    ).resolves.toEqual({
      mode: 'platform-admin',
      sessionToken: 'platform-session',
      ttlSeconds: 1800,
      redirectUrl: 'http://lvh.me:3011/ops-9c741e5b2f8a4d63b017ce95',
    });
    expect(sessions.createPlatformAdminSession).toHaveBeenCalledWith(
      expect.objectContaining({ platformAdminId: 'admin-1' }),
    );
  });

  it('rejects every Google email outside the platform allowlist', async () => {
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      consume: jest.fn().mockResolvedValue({
        mode: 'platform-admin',
        nonce: 'nonce',
        verifier: 'verifier',
      }),
    };
    const google = {
      exchangeCode: jest.fn().mockResolvedValue({
        subject: 'other-google-subject',
        email: 'other@example.com',
        name: 'Other',
        avatarUrl: null,
        emailVerified: true,
      }),
    };
    const sessions = { createPlatformAdminSession: jest.fn() };
    const service = new BusinessOnboardingService(
      { query: jest.fn() } as never,
      redis as never,
      google as never,
      sessions as never,
      {} as never,
      {
        get: jest.fn((key: string) => {
          if (key === 'PLATFORM_ADMIN_EMAIL') {
            return 'esma3ildilshad04x@gmail.com';
          }
          if (key === 'PLATFORM_ADMIN_PATH') {
            return '/ops-9c741e5b2f8a4d63b017ce95';
          }
          return undefined;
        }),
      } as never,
      { record: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(
      service.finishGoogleCallback('code', 'state'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.createPlatformAdminSession).not.toHaveBeenCalled();
  });

  it('creates invitations with the standard 24-hour lifetime', async () => {
    const { service, database } = createService();
    database.query.mockResolvedValue({
      rows: [{ id: 'invite-1', expires_at: '2026-08-10T06:00:00.000Z' }],
    });

    const invitation = await service.createInvitation('admin-1');

    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining("$4 * INTERVAL '1 hour'"),
      expect.arrayContaining(['admin-1', 24]),
    );
    expect(invitation.expiresAt).toBe('2026-08-10T06:00:00.000Z');
  });

  it('replaces the trigger-created default subscription with the reviewed plan', async () => {
    let subscriptionSql = '';
    let subscriptionParams: unknown[] | undefined;
    const client = {
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT * FROM business_signup_applications')) {
          return {
            rows: [
              {
                id: 'application-1',
                invitation_id: 'invitation-1',
                user_id: 'user-1',
                owner_email: 'owner@example.com',
                business_name: 'Multi Tree',
                phone: '7501234567',
                requested_subdomain: 'multi-tree',
                logo: null,
                favicon: null,
                default_avatar: null,
                website_color: null,
              },
            ],
          };
        }
        if (sql.includes('FROM billing_subscription_plans')) {
          return {
            rows: [
              {
                subscription_plan_id: 'ultra-plan',
                plan_id: 'ultra-profile',
                configuration_id: 'ultra-configuration',
                trial_days: 0,
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO businesses')) {
          return {
            rows: [
              {
                id: 'business-1',
                username: 'multi-tree',
                name: 'Multi Tree',
                phone: '7501234567',
                email: 'owner@example.com',
                subdomain: 'multi-tree',
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO business_subscriptions')) {
          subscriptionSql = sql;
          subscriptionParams = params;
        }
        return { rows: [{ id: 'result-1' }] };
      }),
    };
    const database = {
      transaction: jest.fn(
        async (work: (transactionClient: typeof client) => Promise<unknown>) =>
          work(client),
      ),
    };
    const storage = {
      claimBusinessAssets: jest.fn().mockResolvedValue(undefined),
    };
    const service = new BusinessOnboardingService(
      database as never,
      {} as never,
      {} as never,
      {} as never,
      storage as never,
      { get: jest.fn((_key: string, fallback?: unknown) => fallback) } as never,
    );

    await expect(
      service.reviewApplication('application-1', 'admin-1', {
        action: 'approve',
        subscriptionPlanId: 'ultra-plan',
        phoneVerified: true,
      }),
    ).resolves.toEqual({
      id: 'application-1',
      status: 'approved',
      businessId: 'business-1',
    });

    expect(subscriptionSql).toContain('ON CONFLICT (business_id) DO UPDATE');
    expect(subscriptionParams).toEqual(
      expect.arrayContaining([
        'business-1',
        'ultra-plan',
        'ultra-profile',
        'ultra-configuration',
      ]),
    );
  });

  it('returns a distinct gone error for an expired invitation', async () => {
    const { service, database } = createService();
    database.query.mockResolvedValue({
      rows: [
        {
          id: 'invite-1',
          email: null,
          expires_at: '2020-01-01T00:00:00.000Z',
          consumed_at: null,
          revoked_at: null,
          expired: true,
        },
      ],
    });

    await expect(service.validateInvitation('x'.repeat(32))).rejects.toEqual(
      expect.objectContaining<Partial<GoneException>>({
        message: 'Invitation expired',
      }),
    );
  });

  it('resumes the existing application when the same Google user gets a new invitation', async () => {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM business_signup_invitations')) {
          return { rows: [{ id: 'new-invite', email: null }] };
        }
        if (sql.includes('FROM user_identities')) {
          return { rows: [{ user_id: 'user-1' }] };
        }
        if (sql.includes('FROM business_signup_applications')) {
          return {
            rows: [
              {
                id: 'application-1',
                invitation_id: 'old-invite',
                status: 'draft',
              },
            ],
          };
        }
        if (sql.includes('UPDATE business_signup_applications')) {
          return { rows: [{ id: 'application-1' }] };
        }
        return { rows: [] };
      }),
    };
    const database = {
      transaction: jest.fn(
        async (work: (transactionClient: typeof client) => Promise<unknown>) =>
          work(client),
      ),
    };
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      consume: jest.fn().mockResolvedValue({
        mode: 'signup',
        nonce: 'nonce',
        verifier: 'verifier',
        invitationId: 'new-invite',
      }),
      set: jest.fn().mockResolvedValue(true),
    };
    const google = {
      exchangeCode: jest.fn().mockResolvedValue({
        subject: 'google-subject',
        email: 'owner@example.com',
        name: 'Owner',
        avatarUrl: null,
        emailVerified: true,
      }),
    };
    const config = {
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    };
    const service = new BusinessOnboardingService(
      database as never,
      redis as never,
      google as never,
      {} as never,
      {} as never,
      config as never,
    );

    const result = await service.finishGoogleCallback('code', 'state');

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'signup',
        redirectUrl: 'http://localhost:3011/join/application',
      }),
    );
    expect(
      client.query.mock.calls.some(([sql]) =>
        String(sql).includes('UPDATE business_signup_applications'),
      ),
    ).toBe(true);
    expect(
      client.query.mock.calls.some(([sql]) =>
        String(sql).includes('INSERT INTO business_signup_applications'),
      ),
    ).toBe(false);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^signup:session:/),
      { applicationId: 'application-1', userId: 'user-1' },
      7200,
    );
  });

  it('links Google after email signup only for the approved owner on the exact tenant', async () => {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM users user_account')) {
          return {
            rows: [
              {
                user_id: 'user-1',
                business_id: 'business-1',
                subdomain: 'tenant',
              },
            ],
          };
        }
        if (sql.includes('provider_subject = $1')) return { rows: [] };
        if (sql.includes("user_id = $1 AND provider = 'google'")) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };
    const database = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM user_identities identity')) return { rows: [] };
        return { rows: [] };
      }),
      transaction: jest.fn(
        async (work: (transactionClient: typeof client) => Promise<unknown>) =>
          work(client),
      ),
    };
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      consume: jest.fn().mockResolvedValue({
        mode: 'signin',
        nonce: 'nonce',
        verifier: 'verifier',
        subdomain: 'tenant',
      }),
      set: jest.fn().mockResolvedValue(true),
    };
    const google = {
      exchangeCode: jest.fn().mockResolvedValue({
        subject: 'google-subject',
        email: 'owner@example.com',
        name: 'Owner',
        avatarUrl: null,
        emailVerified: true,
      }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new BusinessOnboardingService(
      database as never,
      redis as never,
      google as never,
      {} as never,
      {} as never,
      {
        get: jest.fn((key: string, fallback?: unknown) =>
          key === 'APP_BASE_URL' ? 'http://lvh.me:3011' : fallback,
        ),
      } as never,
      audit as never,
    );

    const callback = await service.finishGoogleCallback('code', 'state', {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
    expect(callback.mode).toBe('signin');
    expect(callback.redirectUrl).toContain('tenant.lvh.me:3011');
    expect(
      client.query.mock.calls.some(([sql]) =>
        String(sql).includes('INSERT INTO user_identities'),
      ),
    ).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:handoff:/),
      expect.objectContaining({
        user_id: 'user-1',
        business_id: 'business-1',
        subdomain: 'tenant',
      }),
      60,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'business.identity.link',
        outcome: 'success',
      }),
    );
  });

  it('does not link a Google subject already owned by another user', async () => {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM users user_account')) {
          return {
            rows: [
              {
                user_id: 'user-1',
                business_id: 'business-1',
                subdomain: 'tenant',
              },
            ],
          };
        }
        if (sql.includes('provider_subject = $1')) {
          return { rows: [{ user_id: 'other-user' }] };
        }
        return { rows: [] };
      }),
    };
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      transaction: jest.fn(
        async (work: (transactionClient: typeof client) => Promise<unknown>) =>
          work(client),
      ),
    };
    const service = new BusinessOnboardingService(
      database as never,
      {
        isAvailable: jest.fn().mockReturnValue(true),
        consume: jest.fn().mockResolvedValue({
          mode: 'signin',
          nonce: 'nonce',
          verifier: 'verifier',
          subdomain: 'tenant',
        }),
      } as never,
      {
        exchangeCode: jest.fn().mockResolvedValue({
          subject: 'google-subject',
          email: 'owner@example.com',
          name: 'Owner',
          avatarUrl: null,
          emailVerified: true,
        }),
      } as never,
      {} as never,
      {} as never,
      { get: jest.fn((_key: string, fallback?: unknown) => fallback) } as never,
    );

    await expect(
      service.finishGoogleCallback('code', 'state'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(
      client.query.mock.calls.some(([sql]) =>
        String(sql).includes('INSERT INTO user_identities'),
      ),
    ).toBe(false);
  });

  it('sends an admin console code and creates a platform session when verified', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [{ id: 'admin-1' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'admin-1',
              username: 'multitree-admin',
              name: 'MultiTree',
            },
          ],
        }),
    };
    let savedChallenge: unknown;
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      isRateLimited: jest.fn().mockResolvedValue(false),
      set: jest.fn((_key: string, value: unknown) => {
        savedChallenge = value;
        return Promise.resolve(true);
      }),
      consume: jest.fn(() => Promise.resolve(savedChallenge)),
      del: jest.fn().mockResolvedValue(true),
    };
    const sessions = {
      createPlatformAdminSession: jest.fn().mockResolvedValue({
        sessionToken: 'admin-session',
        ttlSeconds: 1800,
      }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    let sentCode = '';
    const mail = {
      sendAdminLoginCode: jest.fn((_email: string, code: string) => {
        sentCode = code;
        return Promise.resolve();
      }),
    };
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'PLATFORM_ADMIN_EMAIL') {
          return 'esma3ildilshad04x@gmail.com';
        }
        if (key === 'PLATFORM_ADMIN_PATH') {
          return '/ops-9c741e5b2f8a4d63b017ce95';
        }
        if (key === 'APP_BASE_URL') return 'http://lvh.me:3011';
        if (key === 'SMTP_USER') return 'multitree-sender@example.test';
        return fallback;
      }),
      getOrThrow: jest.fn().mockReturnValue('test-session-secret'),
    };
    const service = new BusinessOnboardingService(
      database as never,
      redis as never,
      {} as never,
      sessions as never,
      {} as never,
      config as never,
      audit as never,
      mail as never,
    );

    const challenge = await service.requestAdminEmailCode(
      ' Esma3ildilshad04x@gmail.com ',
    );
    const session = await service.verifyAdminEmailCode({
      challengeId: challenge.challengeId,
      code: sentCode,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(mail.sendAdminLoginCode).toHaveBeenCalledWith(
      'esma3ildilshad04x@gmail.com',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(sessions.createPlatformAdminSession).toHaveBeenCalledWith({
      platformAdminId: 'admin-1',
      username: 'multitree-admin',
      name: 'MultiTree',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      rememberDevice: false,
    });
    expect(session.redirectUrl).toBe(
      'http://lvh.me:3011/ops-9c741e5b2f8a4d63b017ce95',
    );
  });

  it('creates a signup application from a verified email without Google', async () => {
    let savedChallenge: unknown;
    const client = {
      query: jest.fn(async (sql: string, _params?: unknown[]) => {
        if (sql.includes('FROM business_signup_invitations')) {
          return { rows: [{ id: 'invitation-1', email: null }] };
        }
        if (sql.includes('FROM users')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO users')) {
          return { rows: [{ id: 'user-1' }] };
        }
        if (sql.includes('FROM business_signup_applications')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO business_signup_applications')) {
          return { rows: [{ id: 'application-1' }] };
        }
        return { rows: [] };
      }),
    };
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id: 'invitation-1', email: null }],
      }),
      transaction: jest.fn(
        async (work: (transactionClient: typeof client) => Promise<unknown>) =>
          work(client),
      ),
    };
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      isRateLimited: jest.fn().mockResolvedValue(false),
      set: jest.fn((_key: string, value: unknown) => {
        savedChallenge = value;
        return Promise.resolve(true);
      }),
      consume: jest.fn(() => Promise.resolve(savedChallenge)),
      del: jest.fn().mockResolvedValue(true),
    };
    let sentCode = '';
    const mail = {
      sendBusinessSignupCode: jest.fn((_email: string, code: string) => {
        sentCode = code;
        return Promise.resolve();
      }),
    };
    const service = new BusinessOnboardingService(
      database as never,
      redis as never,
      {} as never,
      {} as never,
      {} as never,
      {
        get: jest.fn((_key: string, fallback?: unknown) => fallback),
        getOrThrow: jest.fn().mockReturnValue('test-session-secret'),
      } as never,
      undefined,
      mail as never,
    );

    const challenge = await service.requestSignupEmailCode(
      'x'.repeat(32),
      'owner@example.com',
    );
    const session = await service.verifySignupEmailCode({
      challengeId: challenge.challengeId,
      code: sentCode,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(mail.sendBusinessSignupCode).toHaveBeenCalledWith(
      'owner@example.com',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^signup:session:/),
      { applicationId: 'application-1', userId: 'user-1' },
      7200,
    );
    expect(session.redirectUrl).toBe('http://localhost:3011/join/application');
  });

  it('never verifies signup for an email that does not match a bound invitation', async () => {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM business_signup_invitations')) {
          return { rows: [{ id: 'invitation-1', email: 'bound@example.com' }] };
        }
        return { rows: [] };
      }),
    };
    let savedChallenge: unknown;
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id: 'invitation-1', email: 'bound@example.com' }],
      }),
      transaction: jest.fn(
        async (work: (transactionClient: typeof client) => Promise<unknown>) =>
          work(client),
      ),
    };
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      isRateLimited: jest.fn().mockResolvedValue(false),
      set: jest.fn((_key: string, value: unknown) => {
        savedChallenge = value;
        return Promise.resolve(true);
      }),
      consume: jest.fn(() => Promise.resolve(savedChallenge)),
      del: jest.fn().mockResolvedValue(true),
    };
    const mail = {
      sendBusinessLoginCode: jest.fn().mockResolvedValue(undefined),
    };
    const service = new BusinessOnboardingService(
      database as never,
      redis as never,
      {} as never,
      {} as never,
      {} as never,
      {
        get: jest.fn((_key: string, fallback?: unknown) => fallback),
        getOrThrow: jest.fn().mockReturnValue('test-session-secret'),
      } as never,
      undefined,
      mail as never,
    );

    const challenge = await service.requestSignupEmailCode(
      'x'.repeat(32),
      'other@example.com',
    );

    expect(mail.sendBusinessLoginCode).not.toHaveBeenCalled();
    await expect(
      service.verifySignupEmailCode({
        challengeId: challenge.challengeId,
        code: '000000',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
