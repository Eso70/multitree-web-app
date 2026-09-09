import { UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { ClientLinktreeAccessService } from './client-linktree-access.service';

const SECRET = 's'.repeat(32);
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function invitation(token: string, pin: string) {
  const tokenHash = hash(token);
  return {
    id: '11111111-1111-4111-8111-111111111111',
    business_id: '22222222-2222-4222-8222-222222222222',
    client_label: 'Client A',
    token_hash: tokenHash,
    pin_hash: createHmac('sha256', SECRET)
      .update(`${tokenHash}:${pin}`)
      .digest('hex'),
    status: 'active' as 'active' | 'submitted' | 'expired',
    failed_pin_attempts: 0,
    locked_until: null,
    created_at: new Date(),
    submitted_at: null,
    expired_at: null,
  } as const;
}

function setup(row = invitation('a'.repeat(43), '123456')) {
  const queries: Array<{ sql: string; params?: unknown[] }> = [];
  const client = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params });
      if (sql.includes('SELECT invitation.*')) {
        return { rows: [row] };
      }
      return { rows: [], rowCount: 1 };
    }),
    release: jest.fn(),
  };
  const database = {
    getClient: jest.fn(async () => client),
    query: jest.fn(async () => ({ rows: [] })),
    transaction: jest.fn(),
  };
  const redis = { isRateLimited: jest.fn(async () => false) };
  const audit = { record: jest.fn(async () => undefined) };
  const linktrees = {
    createLinktree: jest.fn(),
    isSlugAvailable: jest.fn(async () => true),
    isNameAvailable: jest.fn(async () => true),
  };
  const authorization = {
    authorize: jest.fn(async () => ({ outcome: 'allow' })),
  };
  const analyticsReads = { getLinktreeDetails: jest.fn() };
  const storage = { areBusinessAssetsOwned: jest.fn(async () => true) };
  const service = new ClientLinktreeAccessService(
    database as never,
    { getOrThrow: jest.fn(() => SECRET) } as never,
    redis as never,
    { getEffectiveKeys: jest.fn() } as never,
    linktrees as never,
    audit as never,
    { assertAllowed: jest.fn(async () => undefined) } as never,
    authorization as never,
    analyticsReads as never,
    storage as never,
  );
  return {
    service,
    client,
    database,
    queries,
    redis,
    audit,
    linktrees,
    authorization,
    analyticsReads,
    storage,
  };
}

describe('ClientLinktreeAccessService invitation exchange', () => {
  const context = {
    ipAddress: '203.0.113.10',
    userAgent: 'test-agent',
    requestId: 'request-1',
  };

  it('stores only a digest of the temporary session token', async () => {
    const token = 'a'.repeat(43);
    const { service, queries, audit } = setup(invitation(token, '123456'));

    const result = await service.exchange(token, '123456', context);

    const insert = queries.find((entry) =>
      entry.sql.includes('INSERT INTO client_linktree_sessions'),
    );
    expect(insert?.params?.[1]).toBe(hash(result.sessionToken));
    expect(insert?.params).not.toContain(result.sessionToken);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success' }),
    );
  });

  it('revokes all client access without deleting the created Linktree', async () => {
    const { service, client, database, queries } = setup();
    database.query.mockResolvedValueOnce({
      rows: [{ id: invitation('', '').id }],
    } as never);
    database.transaction.mockImplementationOnce(
      async (operation: (transactionClient: typeof client) => unknown) =>
        operation(client),
    );

    await service.revokeAccess(
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
    );

    expect(
      queries.some((entry) =>
        entry.sql.includes('UPDATE client_linktree_invitations'),
      ),
    ).toBe(true);
    expect(
      queries.some((entry) =>
        entry.sql.includes('UPDATE client_linktree_sessions'),
      ),
    ).toBe(true);
    expect(
      queries.some((entry) => /DELETE\s+FROM\s+linktrees/i.test(entry.sql)),
    ).toBe(false);
  });

  it('allows a submitted invitation to reopen its read-only dashboard', async () => {
    const token = 'a'.repeat(43);
    const row = {
      ...invitation(token, '123456'),
      status: 'submitted' as const,
    };
    const { service, queries } = setup(row);

    await service.exchange(token, '123456', context);

    expect(
      queries.some((entry) =>
        entry.sql.includes('INSERT INTO client_linktree_sessions'),
      ),
    ).toBe(true);
  });

  it('does not create a session when the PIN is wrong', async () => {
    const token = 'a'.repeat(43);
    const { service, queries, audit } = setup(invitation(token, '123456'));

    await expect(
      service.exchange(token, '654321', context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(
      queries.some((entry) =>
        entry.sql.includes('INSERT INTO client_linktree_sessions'),
      ),
    ).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure' }),
    );
  });

  it('applies both per-IP and per-invitation rate limits', async () => {
    const token = 'a'.repeat(43);
    const { service, redis } = setup(invitation(token, '123456'));

    await service.exchange(token, '123456', context);

    expect(redis.isRateLimited).toHaveBeenNthCalledWith(
      1,
      `rl:client-linktree:ip:${hash(context.ipAddress)}`,
      20,
      900,
    );
    expect(redis.isRateLimited).toHaveBeenNthCalledWith(
      2,
      `rl:client-linktree:invite:${hash(token)}`,
      10,
      900,
    );
  });

  it('rate limits uploads by both session and address', async () => {
    const { service, redis, authorization } = setup();
    await service.assertUploadAllowed(
      {
        sessionId: '33333333-3333-4333-8333-333333333333',
        invitationId: '11111111-1111-4111-8111-111111111111',
        businessId: '22222222-2222-4222-8222-222222222222',
        clientLabel: 'Client A',
        expiresAt: new Date(),
      },
      context,
    );

    expect(redis.isRateLimited).toHaveBeenCalledWith(
      'rl:client-linktree-upload:session:33333333-3333-4333-8333-333333333333',
      12,
      3600,
    );
    expect(authorization.authorize).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: '22222222-2222-4222-8222-222222222222',
      }),
    );
  });

  it('rejects a submitted image that is not owned by the invitation tenant', async () => {
    const { service, storage, linktrees } = setup();
    storage.areBusinessAssetsOwned.mockResolvedValue(false);

    await expect(
      service.submit(
        {
          sessionId: '33333333-3333-4333-8333-333333333333',
          invitationId: '11111111-1111-4111-8111-111111111111',
          businessId: '22222222-2222-4222-8222-222222222222',
          clientLabel: 'Client A',
          expiresAt: new Date(),
        },
        {
          name: 'Client page',
          slug: 'client-page',
          image: '/images/upload/businesses/other/profile.png',
        },
        context,
      ),
    ).rejects.toThrow('not owned by this business');

    expect(linktrees.createLinktree).not.toHaveBeenCalled();
  });

  it('hides sponsorship on client-created pages', async () => {
    const { service, linktrees } = setup();
    linktrees.createLinktree.mockResolvedValue({ id: 'page-id' });

    await service.submit(
      {
        sessionId: '33333333-3333-4333-8333-333333333333',
        invitationId: '11111111-1111-4111-8111-111111111111',
        businessId: '22222222-2222-4222-8222-222222222222',
        clientLabel: 'Client A',
        expiresAt: new Date(),
      },
      {
        name: 'Client page',
        slug: 'client-page',
        footer_text: 'Changed by client',
        footer_hidden: true,
        platforms: ['whatsapp'],
        links: { whatsapp: ['7500000000'] },
      },
      context,
    );

    expect(linktrees.createLinktree).toHaveBeenCalledWith(
      expect.objectContaining({
        footer_text: 'Sponsor.krd',
        footer_phone: '7502485829',
        footer_hidden: true,
        is_default: false,
      }),
      '22222222-2222-4222-8222-222222222222',
      'business',
      '11111111-1111-4111-8111-111111111111',
    );
  });
});
