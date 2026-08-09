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
});
