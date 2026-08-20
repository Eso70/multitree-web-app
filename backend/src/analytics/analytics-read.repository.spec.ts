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

  describe('linktreeTotalsForBusiness', () => {
    it('scopes every projection to the one business binding', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [] });
      const repository = new AnalyticsReadRepository({ query } as never);

      await repository.linktreeTotalsForBusiness('business-id');

      const [sql, values] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('lt.business_id = $1');
      // The tenant filter lives once, in the `pages` CTE every other part
      // reads from, so no branch can be left unscoped by accident.
      expect(sql).toContain('WHERE business_id = $1');
      expect(sql).toContain('deleted_at IS NULL');
      expect(values[0]).toBe('business-id');
      expect(Array.isArray(values[1])).toBe(true);
    });

    /**
     * `analytics_page_daily.new_visitors` marks only a visitor's first-ever
     * event, so a lifetime unique count has to come from the event log.
     */
    it('counts uniques from the event log, not the daily rollup', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [] });
      const repository = new AnalyticsReadRepository({ query } as never);

      await repository.linktreeTotalsForBusiness('business-id');

      const [sql] = query.mock.calls[0] as [string];
      expect(sql).toContain('COUNT(DISTINCT event.visitor_id)');
      expect(sql).not.toContain('new_visitors');
      expect(sql).toContain('SUM(daily.total_clicks)');
      /*
       * Both CTEs must join from `pages` into the event log, not filter the
       * event log by `event_name` first: that plan reads every matching event
       * for every tenant and discards the rest on the join, and it is what the
       * query planner picks when the page filter arrives late.
       */
      expect(sql).toMatch(
        /FROM pages page\s+JOIN analytics_events event\s+ON event\.public_page_id = page\.id/,
      );
    });

    it('returns totals keyed by linktree id, coerced to numbers', async () => {
      const query = jest.fn().mockResolvedValue({
        rows: [
          {
            linktree_id: 'lt-1',
            unique_views: '12',
            unique_clicks: '3',
            total_clicks: '40',
          },
        ],
      });
      const repository = new AnalyticsReadRepository({ query } as never);

      const totals = await repository.linktreeTotalsForBusiness('business-id');

      expect(totals.get('lt-1')).toEqual({
        unique_views: 12,
        unique_clicks: 3,
        total_clicks: 40,
      });
      expect(totals.get('missing')).toBeUndefined();
    });
  });
});
