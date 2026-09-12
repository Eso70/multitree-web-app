import { BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { AdvertisingService } from '../advertising/advertising.service';
import { BusinessAdministrationService } from './business-administration.service';

describe('BusinessAdministrationService', () => {
  function buildService(query: jest.Mock) {
    const database = { query } as unknown as DatabaseService;
    const redis = {} as unknown as RedisService;
    const storage = {} as unknown as StorageService;
    const advertising = {
      invalidatePublicCacheForBusiness: () => Promise.resolve(),
    } as unknown as AdvertisingService;
    return new BusinessAdministrationService(
      database,
      redis,
      storage,
      advertising,
    );
  }

  /**
   * Signup provisioning and this console are the two writers of
   * `businesses.subdomain`, and only provisioning used to apply the rule. The
   * console trimmed, lower-cased and wrote whatever remained.
   */
  describe('updateBusiness subdomain rule', () => {
    function serviceWithCurrent(subdomain: string) {
      const query = jest.fn((sql: string) => {
        if (sql.includes('FROM businesses a')) {
          return Promise.resolve({
            rows: [{ username: 'acme', name: 'Acme', subdomain }],
          });
        }
        return Promise.resolve({ rows: [] });
      });
      return buildService(query);
    }

    it.each(['www', 'api', 'bio'])(
      'refuses %s, which would leave the tenant unreachable at its own address',
      async (reserved) => {
        await expect(
          serviceWithCurrent('acme').updateBusiness('business-1', {
            subdomain: reserved,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('refuses a subdomain the column constraint would reject', async () => {
      // Previously this passed the service untouched and failed at the CHECK as
      // SQLSTATE 23514, which nothing maps, so it surfaced as a 500.
      await expect(
        serviceWithCurrent('acme').updateBusiness('business-1', {
          subdomain: '-shop',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('still lets a business already sitting on a reserved subdomain be edited', async () => {
      // The rule applies to a value that is changing. A row that predates it
      // must not lock the administrator out of the other fields.
      const error = await serviceWithCurrent('www')
        .updateBusiness('business-1', { subdomain: 'www', name: 'Renamed' })
        .then(
          () => null,
          (thrown: unknown) => thrown,
        );

      // It gets past the gate and fails later on the stubbed transaction, so
      // the assertion is that the subdomain was never what stopped it.
      expect(error).not.toBeInstanceOf(BadRequestException);
      expect(String((error as Error)?.message)).not.toMatch(/subdomain/i);
    });
  });

  /**
   * `analytics_page_daily.unique_visitors`/`unique_clickers` only mark a
   * visitor's first-ever event, so summing them for a lifetime total would
   * undercount every returning visitor. The per-linktree breakdown needs a
   * true distinct count from the event log instead.
   */
  it("computes each linktree's unique views/clicks from the event log, not the daily rollup sum", async () => {
    let capturedSql = '';
    let capturedValues: unknown[] = [];
    const query = jest.fn((sql: string, values?: unknown[]) => {
      capturedSql = sql;
      capturedValues = values || [];
      return Promise.resolve({ rows: [] });
    });
    const service = buildService(query);

    await service.getBusinessLinktrees('business-1');

    expect(capturedSql).not.toContain('SUM(daily.unique_visitors)');
    expect(capturedSql).not.toContain('SUM(daily.unique_clickers)');
    expect(capturedSql).toContain('unique_views AS (');
    expect(capturedSql).toContain('unique_clicks AS (');
    expect(capturedSql).toContain('COUNT(DISTINCT event.visitor_id)');
    expect(capturedValues[0]).toBe('business-1');
    expect(Array.isArray(capturedValues[1])).toBe(true);
  });

  it('returns bounded business summaries without integration secrets', async () => {
    const sql: string[] = [];
    const query = jest.fn((statement: string) => {
      sql.push(statement);
      if (statement.includes('COUNT(*)::text AS total')) {
        return Promise.resolve({ rows: [{ total: '1' }] });
      }
      if (statement.includes("COUNT(*) FILTER (WHERE status = 'active')")) {
        return Promise.resolve({
          rows: [
            {
              total: 1,
              active: 1,
              suspended: 0,
              pendingApplications: 0,
              totalApplications: 0,
              activeInvitations: 0,
            },
          ],
        });
      }
      return Promise.resolve({
        rows: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Tenant',
          },
        ],
      });
    });
    const service = buildService(query);

    const result = await service.getBusinesses({ page: 1, limit: 20 });

    expect(result.pagination).toMatchObject({ total: 1, totalPages: 1 });
    expect(sql[0]).toContain('LIMIT $3 OFFSET $4');
    expect(sql[0]).not.toContain('business_tiktok');
    expect(sql[0]).not.toContain('events_token');
    expect(sql[0]).not.toContain('default_links');
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('imports a linktree with contiguous PostgreSQL parameters', async () => {
    const clientQuery = jest.fn((statement: string, _values?: unknown[]) => {
      if (
        statement.includes('SELECT id FROM linktrees WHERE business_id') ||
        statement.includes('SELECT business_id FROM linktrees WHERE id')
      ) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });
    const database = {
      query: jest.fn((statement: string) => {
        if (statement.includes('SELECT id FROM businesses')) {
          return Promise.resolve({ rows: [{ id: 'business-1' }] });
        }
        return Promise.resolve({ rows: [] });
      }),
      transaction: jest.fn(
        (
          callback: (client: { query: typeof clientQuery }) => Promise<unknown>,
        ) => callback({ query: clientQuery }),
      ),
    } as unknown as DatabaseService;
    const redis = {
      del: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const storage = {
      claimBusinessAssets: jest.fn().mockResolvedValue(undefined),
      deleteUnreferencedFromValues: jest.fn().mockResolvedValue(0),
    } as unknown as StorageService;
    const advertising = {
      invalidatePublicCacheForBusiness: jest.fn().mockResolvedValue(undefined),
    } as unknown as AdvertisingService;
    const service = new BusinessAdministrationService(
      database,
      redis,
      storage,
      advertising,
    );

    await service.importBusinessLinktrees('business-1', {
      format: 'sponsor-krd-linktrees',
      version: 1,
      linktrees: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          uid: 'lt-example',
          seo_name: 'example',
          name: 'Example',
          description: 'Imported description',
          links: [],
          whatsapp_questions: [],
        },
      ],
      assets: {},
    });

    const insertCall = clientQuery.mock.calls.find(([statement]) =>
      statement.includes('INSERT INTO linktrees'),
    );
    expect(insertCall).toBeDefined();
    if (!insertCall) throw new Error('Linktree insert was not executed');
    const [statement, values = []] = insertCall;
    const placeholders = [...statement.matchAll(/\$(\d+)/g)].map((match) =>
      Number(match[1]),
    );
    expect([...new Set(placeholders)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 23 }, (_, index) => index + 1),
    );
    expect(values).toHaveLength(23);
    expect(values[5]).toBe('Imported description');
    expect(
      clientQuery.mock.calls.some(([statement]) =>
        /DELETE FROM analytics_(events|page_daily|action_daily)/.test(
          statement,
        ),
      ),
    ).toBe(false);
  });

  it('restores a complete business backup in one database transaction', async () => {
    const clientQuery = jest.fn((statement: string) => {
      if (statement.includes('FROM billing_subscription_plans sp')) {
        return Promise.resolve({
          rows: [
            {
              subscription_plan_id: '90000000-0000-4000-8000-000000000001',
              plan_id: '90000000-0000-4000-8000-000000000002',
              plan_configuration_id: '90000000-0000-4000-8000-000000000003',
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    const database = {
      transaction: jest.fn(
        (
          callback: (client: { query: typeof clientQuery }) => Promise<unknown>,
        ) => callback({ query: clientQuery }),
      ),
    } as unknown as DatabaseService;
    const redis = {
      del: jest.fn().mockResolvedValue(undefined),
      clearBusinessSessions: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const storage = {
      restoreUploadedAsset: jest.fn().mockResolvedValue(undefined),
      claimBusinessAssets: jest.fn().mockResolvedValue(undefined),
    } as unknown as StorageService;
    const advertising = {
      invalidatePublicCacheForBusiness: jest.fn().mockResolvedValue(undefined),
    } as unknown as AdvertisingService;
    const service = new BusinessAdministrationService(
      database,
      redis,
      storage,
      advertising,
    );

    const result = await service.importBusiness({
      format: 'sponsor-krd-business',
      version: 1,
      business: {
        id: '10000000-0000-4000-8000-000000000001',
        username: 'acme',
        name: 'Acme',
        email: 'owner@example.com',
        subdomain: 'acme',
      },
      owner: {
        id: '20000000-0000-4000-8000-000000000001',
        email: 'owner@example.com',
        display_name: 'Owner',
      },
      membership: {
        id: '30000000-0000-4000-8000-000000000001',
        role: 'owner',
        status: 'active',
      },
      identity: {
        id: '40000000-0000-4000-8000-000000000001',
        provider: 'google',
        provider_subject: 'google-subject',
        provider_email: 'owner@example.com',
        email_verified: true,
      },
      branding: {},
      defaults: {},
      subscription: {
        id: '50000000-0000-4000-8000-000000000001',
        plan_code: 'basic',
      },
      linktrees: [
        {
          id: '60000000-0000-4000-8000-000000000001',
          name: 'Acme',
          seo_name: 'acme',
          uid: 'acme',
          is_default: true,
          links: [
            {
              id: '70000000-0000-4000-8000-000000000001',
              platform: 'website',
              url: 'https://example.com',
            },
          ],
          whatsapp_questions: [
            {
              id: '80000000-0000-4000-8000-000000000001',
              question_text: 'Question',
              message: 'Message',
            },
          ],
        },
      ],
      assets: {},
    });

    expect(result).toMatchObject({
      business_id: '10000000-0000-4000-8000-000000000001',
      imported_linktrees: 1,
      imported_links: 1,
    });
    for (const table of [
      'businesses',
      'users',
      'user_identities',
      'business_memberships',
      'business_branding',
      'business_defaults',
      'business_subscriptions',
      'linktrees',
      'links',
      'whatsapp_questions',
    ]) {
      expect(
        clientQuery.mock.calls.some(([statement]) =>
          statement.includes(`INSERT INTO ${table}`),
        ),
      ).toBe(true);
    }
    expect(database.transaction).toHaveBeenCalledTimes(1);
  });

  it('never overwrites an existing business during full import', async () => {
    const clientQuery = jest.fn((_statement: string) =>
      Promise.resolve({ rows: [{ '?column?': 1 }] }),
    );
    const database = {
      transaction: jest.fn(
        (
          callback: (client: { query: typeof clientQuery }) => Promise<unknown>,
        ) => callback({ query: clientQuery }),
      ),
    } as unknown as DatabaseService;
    const service = new BusinessAdministrationService(
      database,
      {} as RedisService,
      {} as StorageService,
      {} as AdvertisingService,
    );

    await expect(
      service.importBusiness({
        format: 'sponsor-krd-business',
        version: 1,
        business: {
          id: '10000000-0000-4000-8000-000000000001',
          username: 'acme',
          name: 'Acme',
          subdomain: 'acme',
        },
        subscription: { plan_code: 'basic' },
        linktrees: [
          {
            id: '60000000-0000-4000-8000-000000000001',
            name: 'Acme',
            seo_name: 'acme',
            uid: 'acme',
            is_default: true,
            links: [],
            whatsapp_questions: [],
          },
        ],
        assets: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      clientQuery.mock.calls.some(([statement]) =>
        statement.includes('INSERT INTO businesses'),
      ),
    ).toBe(false);
  });

  it('exports and reimports the page-header businesses collection format', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        { id: '10000000-0000-4000-8000-000000000001' },
        { id: '10000000-0000-4000-8000-000000000002' },
      ],
    });
    const service = buildService(query);
    const exportSpy = jest
      .spyOn(service, 'exportBusiness')
      .mockImplementation(async (id) => ({
        format: 'sponsor-krd-business' as const,
        version: 1 as const,
        exported_at: new Date(0).toISOString(),
        business: { id, username: id, subdomain: id },
        owner: null,
        identity: {},
        membership: null,
        branding: {},
        defaults: {},
        subscription: {},
        linktrees: [],
        assets: {},
      }));

    const exported = await service.exportBusinesses();

    expect(exported.format).toBe('sponsor-krd-businesses');
    expect(exported.businesses).toHaveLength(2);
    expect(exportSpy).toHaveBeenCalledTimes(2);

    query.mockResolvedValueOnce({ rows: [] });
    const importSpy = jest
      .spyOn(service, 'importBusiness')
      .mockImplementation(async (document) => ({
        business_id: (document.business as { id: string }).id,
        imported_linktrees: 1,
        imported_links: 0,
      }));
    const imported = await service.importBusinesses({
      format: 'sponsor-krd-businesses',
      version: 1,
      businesses: exported.businesses.map((document, index) => ({
        ...document,
        business: {
          id: `10000000-0000-4000-8000-00000000000${index + 1}`,
          username: `business-${index + 1}`,
          subdomain: `business-${index + 1}`,
        },
      })),
    });

    expect(imported.imported_businesses).toBe(2);
    expect(importSpy).toHaveBeenCalledTimes(2);
  });
});
