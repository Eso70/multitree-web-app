import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { BillingManagementService } from './billing-management.service';
import { BillingRepository } from './billing.repository';
import { AdvertisingService } from '../advertising/advertising.service';

describe('BillingManagementService overview', () => {
  it('loads a bounded business/subscription projection', async () => {
    const statements: string[] = [];
    const query = jest.fn((sql: string) => {
      statements.push(sql);
      return Promise.resolve({ rows: [] });
    });
    const database = { query } as unknown as DatabaseService;
    const service = new BillingManagementService(
      database,
      {} as RedisService,
      new BillingRepository(database),
      {
        invalidatePublicCacheForBusiness: () => Promise.resolve(),
      } as unknown as AdvertisingService,
    );

    const result = await service.getOverview({ page: 2, limit: 10 });

    const listSql = statements.find((sql) => sql.includes('LEFT JOIN LATERAL'));
    expect(listSql).toContain('LIMIT $4 OFFSET $5');
    expect(query).toHaveBeenCalledTimes(5);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 0,
      totalPages: 1,
    });
  });
});
