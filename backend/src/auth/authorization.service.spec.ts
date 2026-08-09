import { AuthorizationService } from './authorization.service';

describe('AuthorizationService business policy engine', () => {
  const businessId = '00000000-0000-4000-8000-000000000001';
  const database = { query: jest.fn() };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    deleteByPattern: jest.fn(),
  };
  let service: AuthorizationService;

  const policy = (overrides: Record<string, unknown> = {}) => ({
    subscription: {
      business_status: 'active',
      subscription_id: '00000000-0000-4000-8000-000000000002',
      subscription_status: 'active',
      plan_id: '00000000-0000-4000-8000-000000000003',
      plan_code: 'pro',
      plan_name: 'Pro',
      plan_configuration_id: '00000000-0000-4000-8000-000000000004',
      current_period_end: null,
    },
    permissions: {},
    entitlements: {},
    templateKeys: [],
    pendingApprovals: [],
    ...overrides,
  });

  const request = (
    permission: string,
    extra: Record<string, unknown> = {},
  ) => ({
    principal: { id: businessId, type: 'business' as const },
    businessId,
    permission,
    context: { now: new Date('2026-07-16T12:00:00Z') },
    ...extra,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthorizationService(database as never, redis as never);
    jest
      .spyOn(service as never, 'hasEmergencyDeny' as never)
      .mockResolvedValue(false as never);
    jest
      .spyOn(service as never, 'getQuotaUsage' as never)
      .mockResolvedValue(0 as never);
  });

  it('denies a new catalog permission until a plan rule exists', async () => {
    jest
      .spyOn(service as never, 'getBusinessPolicy' as never)
      .mockResolvedValue(policy() as never);

    const decision = await service.authorize(request('business:links:reorder'));

    expect(decision.outcome).toBe('deny');
    expect(decision.reasonCode).toBe('NO_PERMISSION');
  });

  it('keeps simple analytics available while advanced analytics is excluded', async () => {
    jest
      .spyOn(service as never, 'getBusinessPolicy' as never)
      .mockResolvedValue(
        policy({
          permissions: {
            'business:analytics:totals-read': {
              key: 'business:analytics:totals-read',
              accessMode: 'direct',
              fieldModes: {},
              resourceScope: { type: 'all' },
              conditions: {},
              source: 'plan',
            },
            'business:analytics:details-read': {
              key: 'business:analytics:details-read',
              accessMode: 'direct',
              fieldModes: {},
              resourceScope: { type: 'all' },
              conditions: {},
              source: 'plan',
            },
            'business:analytics:advanced-read': {
              key: 'business:analytics:advanced-read',
              accessMode: 'direct',
              fieldModes: {},
              resourceScope: { type: 'all' },
              conditions: {},
              source: 'plan',
            },
          },
          entitlements: { 'feature.advanced_analytics': false },
        }) as never,
      );

    const [totals, details, advanced] = await Promise.all([
      service.authorize(request('business:analytics:totals-read')),
      service.authorize(request('business:analytics:details-read')),
      service.authorize(request('business:analytics:advanced-read')),
    ]);

    expect(totals.outcome).toBe('allow');
    expect(details.outcome).toBe('allow');
    expect(advanced.outcome).toBe('deny');
    expect(advanced.reasonCode).toBe('FEATURE_NOT_INCLUDED');
  });

  it('allows a platform administrator without a role lookup', async () => {
    const decision = await service.authorize({
      principal: { id: businessId, type: 'platform-admin' },
      permission: 'platform:businesses:delete',
      context: { now: new Date('2026-07-16T12:00:00Z') },
    });

    expect(decision.outcome).toBe('allow');
    expect(decision.source).toBe('platform-role');
    expect(database.query).not.toHaveBeenCalled();
  });

  it('allows a field granted by the assigned plan', async () => {
    jest
      .spyOn(service as never, 'getBusinessPolicy' as never)
      .mockResolvedValue(
        policy({
          permissions: {
            'business:profile:update': {
              key: 'business:profile:update',
              accessMode: 'direct',
              fieldModes: { logo: 'direct' },
              resourceScope: { type: 'all' },
              conditions: {},
              source: 'plan',
            },
          },
          entitlements: {
            'feature.profile_editing': true,
            'limit.profile_changes_monthly': -1,
          },
        }) as never,
      );

    const decision = await service.authorize(
      request('business:profile:update', { changedFields: ['logo'] }),
    );

    expect(decision.outcome).toBe('allow');
    expect(decision.source).toBe('plan');
  });

  it('rejects the whole mutation when one changed field is denied', async () => {
    jest
      .spyOn(service as never, 'getBusinessPolicy' as never)
      .mockResolvedValue(
        policy({
          permissions: {
            'business:profile:update': {
              key: 'business:profile:update',
              accessMode: 'direct',
              fieldModes: { name: 'direct', logo: 'deny' },
              resourceScope: { type: 'all' },
              conditions: {},
              source: 'plan',
            },
          },
          entitlements: {
            'feature.profile_editing': true,
            'limit.profile_changes_monthly': -1,
          },
        }) as never,
      );

    const decision = await service.authorize(
      request('business:profile:update', {
        changedFields: ['name', 'logo'],
      }),
    );

    expect(decision.outcome).toBe('deny');
    expect(decision.reasonCode).toBe('FIELD_DENIED');
    expect(decision.deniedFields).toEqual(['logo']);
  });

  it('turns mixed direct and approval fields into one approval decision', async () => {
    jest
      .spyOn(service as never, 'getBusinessPolicy' as never)
      .mockResolvedValue(
        policy({
          permissions: {
            'business:profile:update': {
              key: 'business:profile:update',
              accessMode: 'direct',
              fieldModes: { name: 'direct', website_color: 'approval' },
              resourceScope: { type: 'all' },
              conditions: {},
              source: 'plan',
            },
          },
          entitlements: {
            'feature.profile_editing': true,
            'limit.profile_changes_monthly': -1,
          },
        }) as never,
      );

    const decision = await service.authorize(
      request('business:profile:update', {
        changedFields: ['name', 'website_color'],
      }),
    );

    expect(decision.outcome).toBe('approval');
    expect(decision.approvalFields).toEqual(['website_color']);
  });

  it('rejects unknown changed fields', async () => {
    jest
      .spyOn(service as never, 'getBusinessPolicy' as never)
      .mockResolvedValue(
        policy({
          permissions: {
            'business:profile:update': {
              key: 'business:profile:update',
              accessMode: 'direct',
              fieldModes: {},
              resourceScope: { type: 'all' },
              conditions: {},
              source: 'plan',
            },
          },
          entitlements: { 'feature.profile_editing': true },
        }) as never,
      );

    const decision = await service.authorize(
      request('business:profile:update', {
        changedFields: ['subdomain'],
      }),
    );

    expect(decision.reasonCode).toBe('FIELD_DENIED');
    expect(decision.deniedFields).toEqual(['subdomain']);
  });

  it('lets a platform emergency deny override a grant', async () => {
    jest
      .spyOn(service as never, 'getBusinessPolicy' as never)
      .mockResolvedValue(
        policy({
          permissions: {
            'business:linktrees:read': {
              key: 'business:linktrees:read',
              accessMode: 'direct',
              fieldModes: {},
              resourceScope: { type: 'all' },
              conditions: {},
              source: 'plan',
            },
          },
        }) as never,
      );
    jest
      .spyOn(service as never, 'hasEmergencyDeny' as never)
      .mockResolvedValue(true as never);

    const decision = await service.authorize(
      request('business:linktrees:read'),
    );

    expect(decision.reasonCode).toBe('PLATFORM_DENY');
  });

  it('denies cross-tenant requests before loading policy', async () => {
    const policySpy = jest.spyOn(
      service as never,
      'getBusinessPolicy' as never,
    );
    const decision = await service.authorize({
      ...request('business:linktrees:read'),
      businessId: '00000000-0000-4000-8000-000000000099',
    });

    expect(decision.reasonCode).toBe('TENANT_MISMATCH');
    expect(policySpy).not.toHaveBeenCalled();
  });

  it.each(['business:linktrees:create', 'business:mini-websites:create'])(
    'denies %s when the shared public-page quota is exhausted',
    async (permission) => {
      jest
        .spyOn(service as never, 'getBusinessPolicy' as never)
        .mockResolvedValue(
          policy({
            permissions: {
              [permission]: {
                key: permission,
                accessMode: 'direct',
                fieldModes: {},
                resourceScope: { type: 'all' },
                conditions: {},
                source: 'plan',
              },
            },
            entitlements: { 'limit.linktrees': 2 },
          }) as never,
        );
      jest
        .spyOn(service as never, 'getQuotaUsage' as never)
        .mockResolvedValue(2 as never);

      const decision = await service.authorize(request(permission));

      expect(decision.reasonCode).toBe('QUOTA_EXCEEDED');
      expect(decision.quota).toEqual({
        key: 'limit.linktrees',
        limit: 2,
        used: 2,
        remaining: 0,
      });
    },
  );

  it('counts Linktrees and non-archived mini-websites in one quota query', async () => {
    jest.restoreAllMocks();
    database.query.mockResolvedValue({ rows: [{ used: 4 }] });
    service = new AuthorizationService(database as never, redis as never);

    const usage = await (
      service as unknown as {
        getQuotaUsage(business: string, entitlement: string): Promise<number>;
      }
    ).getQuotaUsage(businessId, 'limit.linktrees');

    expect(usage).toBe(4);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /FROM linktrees[\s\S]+FROM mini_websites[\s\S]+status <> 'archived'/,
      ),
      [businessId],
    );
  });
});
