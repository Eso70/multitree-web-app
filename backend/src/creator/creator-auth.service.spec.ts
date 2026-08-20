import { ConflictException } from '@nestjs/common';
import { CreatorAuthService } from './creator-auth.service';

describe('CreatorAuthService Google authentication', () => {
  const identity = {
    subject: 'google-subject-1',
    email: 'creator@example.com',
    name: 'Creator Name',
    avatarUrl: 'https://example.com/avatar.png',
    emailVerified: true,
  };

  function setup() {
    let authorizationState = '';
    const client = { query: jest.fn() };
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      transaction: jest.fn((work: (value: typeof client) => unknown) =>
        work(client),
      ),
    };
    const redis = {
      isAvailable: jest.fn().mockReturnValue(true),
      isRateLimited: jest.fn().mockResolvedValue(false),
      set: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn(),
    };
    const google = {
      isConfigured: jest.fn().mockReturnValue(true),
      authorizationUrl: jest.fn((input: { state: string }) => {
        authorizationState = input.state;
        return 'https://google.test/auth';
      }),
      exchangeCode: jest.fn().mockResolvedValue(identity),
    };
    const sessions = {
      createBusinessSession: jest.fn().mockResolvedValue({
        sessionToken: 'creator-session',
        ttlSeconds: 3600,
      }),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('a-secure-session-secret'),
      get: jest.fn().mockReturnValue(7),
    };
    const service = new CreatorAuthService(
      database as never,
      redis as never,
      google as never,
      sessions as never,
      audit as never,
      config as never,
    );
    return {
      service,
      client,
      database,
      redis,
      google,
      sessions,
      audit,
      authorizationState: () => authorizationState,
    };
  }

  it('starts a PKCE Google flow with namespaced single-use state and rate limits', async () => {
    const { service, redis, google, authorizationState } = setup();

    await expect(
      service.beginGoogleAuth({
        intent: 'signup',
        ipAddress: '203.0.113.10',
        deviceToken: 'device-token',
      }),
    ).resolves.toBe('https://google.test/auth');

    expect(redis.isRateLimited).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^creator:oauth:/),
      expect.objectContaining({ intent: 'signup' }),
      600,
    );
    expect(google.authorizationUrl).toHaveBeenCalledTimes(1);
    expect(authorizationState()).toMatch(/^creator\./);
  });

  it('signs an existing Creator in through the verified Google subject', async () => {
    const { service, client, database, redis, sessions, audit } = setup();
    redis.consume.mockResolvedValue({
      intent: 'login',
      nonce: 'nonce',
      verifier: 'verifier',
      deviceHmac: 'd'.repeat(64),
      ipHmac: 'i'.repeat(64),
    });
    client.query.mockImplementation((sql: string) => {
      if (
        sql.includes('FROM user_identities') &&
        sql.includes('provider_subject =')
      ) {
        return Promise.resolve({ rows: [{ user_id: 'user-1' }] });
      }
      if (sql.includes('FROM users WHERE email')) {
        return Promise.resolve({ rows: [{ id: 'user-1' }] });
      }
      if (sql.includes('FROM creator_accounts creator')) {
        return Promise.resolve({
          rows: [
            {
              business_id: 'business-1',
              username: 'creator-existing',
              name: 'Creator Name',
              status: 'active',
            },
          ],
        });
      }
      if (sql.includes('WHERE user_id = $1 AND provider')) {
        return Promise.resolve({
          rows: [{ provider_subject: 'google-subject-1' }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(
      service.finishGoogleCallback('code', 'creator.valid-state', {
        ipAddress: '203.0.113.10',
        userAgent: 'jest',
      }),
    ).resolves.toEqual({
      sessionToken: 'creator-session',
      ttlSeconds: 3600,
      redirectUrl: '/account',
    });

    expect(sessions.createBusinessSession).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'business-1',
        userId: 'user-1',
        sessionRole: 'creator',
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'creator.login',
        metadata: { provider: 'google' },
      }),
    );
    expect(database.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a second trial from an already claimed device or identity', async () => {
    const { service, client, redis } = setup();
    redis.consume.mockResolvedValue({
      intent: 'signup',
      nonce: 'nonce',
      verifier: 'verifier',
      deviceHmac: 'd'.repeat(64),
      ipHmac: 'i'.repeat(64),
    });
    client.query.mockImplementation((sql: string) => {
      if (sql.includes('FROM creator_trial_claims')) {
        return Promise.resolve({ rows: [{ exists: 1 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(
      service.finishGoogleCallback('code', 'creator.valid-state', {
        ipAddress: '203.0.113.10',
        userAgent: 'jest',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
