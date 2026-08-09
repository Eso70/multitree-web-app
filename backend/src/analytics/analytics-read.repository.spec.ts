import { AnalyticsReadRepository } from './analytics-read.repository';

describe('AnalyticsReadRepository', () => {
  it('scopes page and uniqueness projections to the same business binding', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new AnalyticsReadRepository({ query } as never);

    await repository.pagesForBusiness('business-id', {
      from: '2026-08-01',
      to: '2026-08-09',
    });

    const [sql, values] = query.mock.calls[0] as [string, unknown[]];
    expect((sql.match(/business_id = \$1/g) || []).length).toBeGreaterThan(1);
    expect(sql).toContain('page.business_id = $1');
    expect(sql).toContain('event.occurred_at >= $3::date');
    expect(sql).toContain('daily.day >= $3::date');
    expect(values).toEqual([
      'business-id',
      expect.any(Array),
      '2026-08-01',
      '2026-08-09',
    ]);
  });
});
