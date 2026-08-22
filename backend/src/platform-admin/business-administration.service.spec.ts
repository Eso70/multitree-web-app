import { BadRequestException } from '@nestjs/common';
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
      format: 'multitree-linktrees',
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
      Array.from({ length: 18 }, (_, index) => index + 1),
    );
    expect(values).toHaveLength(18);
    expect(values[17]).toBe('Imported description');
  });
});
