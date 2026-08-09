import { SecretCryptoService } from '../auth/secret-crypto.service';
import { DatabaseService } from '../database/database.service';
import { AnalyticsReadService } from './analytics-read.service';

describe('AnalyticsReadService', () => {
  it('qualifies CRM status and value columns when joining public pages', async () => {
    let capturedSql = '';
    const query = jest.fn((sql: string) => {
      capturedSql = sql;
      return Promise.resolve({
        rows: [
          { status: 'new', total: '2', total_value: '25.5' },
          { status: 'won', total: '1', total_value: '50' },
        ],
      });
    });
    const database = { query } as unknown as DatabaseService;
    const secrets = {} as SecretCryptoService;
    const service = new AnalyticsReadService(database, secrets);

    const result = await service.getCrmSummary(
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
      '17fdf0e8-d6b4-449a-b3cf-c760160c3f21',
    );

    expect(capturedSql).toContain('SELECT lead.status');
    expect(capturedSql).toContain('SUM(lead.value)');
    expect(capturedSql).toContain('GROUP BY lead.status');
    expect(result).toEqual({
      statuses: {
        new: 2,
        contacted: 0,
        qualified: 0,
        won: 1,
        lost: 0,
      },
      total: 3,
      totalValue: 75.5,
    });
  });

  it('aggregates CRM status across every page owned by the business', async () => {
    let capturedValues: unknown[] = [];
    const query = jest.fn((_sql: string, values: unknown[]) => {
      capturedValues = values;
      return Promise.resolve({
        rows: [{ status: 'contacted', total: '4', total_value: '0' }],
      });
    });
    const database = { query } as unknown as DatabaseService;
    const service = new AnalyticsReadService(
      database,
      {} as SecretCryptoService,
    );

    const result = await service.getCrmSummary(
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
      undefined,
      { from: '2026-08-01', to: '2026-08-09' },
    );

    expect(capturedValues).toEqual([
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
      null,
      '2026-08-01',
      '2026-08-09',
    ]);
    expect(result.total).toBe(4);
    expect(result.statuses.contacted).toBe(4);
  });

  it('excludes orphaned Linktree actions from button analytics', async () => {
    let capturedSql = '';
    const query = jest.fn((sql: string) => {
      capturedSql = sql;
      return Promise.resolve({ rows: [] });
    });
    const database = { query } as unknown as DatabaseService;
    const secrets = {} as SecretCryptoService;
    const service = new AnalyticsReadService(database, secrets);

    await service.getActions('373f02f3-0b8b-4e93-ad0b-5f16a640daf4', {
      pageId: '17fdf0e8-d6b4-449a-b3cf-c760160c3f21',
    });

    expect(capturedSql).toContain('action.source_link_id IS NOT NULL');
    expect(capturedSql).toContain("action.action_key NOT LIKE 'link:%'");
  });

  /**
   * `analytics_action_daily.unique_clickers` only marks a visitor's
   * first-ever click, so summing it over a date range would answer "new
   * clickers in range", not "active unique clickers in range" — the
   * per-action breakdown needs the latter, computed straight from the
   * event log.
   */
  it("computes each action's unique clickers from the event log, not the daily rollup sum", async () => {
    let capturedSql = '';
    let capturedValues: unknown[] = [];
    const query = jest.fn((sql: string, values?: unknown[]) => {
      capturedSql = sql;
      capturedValues = values || [];
      return Promise.resolve({ rows: [] });
    });
    const database = { query } as unknown as DatabaseService;
    const secrets = {} as SecretCryptoService;
    const service = new AnalyticsReadService(database, secrets);

    await service.getActions('373f02f3-0b8b-4e93-ad0b-5f16a640daf4', {
      pageId: '17fdf0e8-d6b4-449a-b3cf-c760160c3f21',
      from: '2026-01-01',
      to: '2026-01-31',
    });

    expect(capturedSql).not.toContain('SUM(daily.unique_clickers)');
    expect(capturedSql).toContain('unique_totals AS');
    expect(capturedSql).toContain('COUNT(DISTINCT event.visitor_id)');
    expect(capturedSql).toContain(
      'LEFT JOIN unique_totals ON unique_totals.public_page_action_id = action.id',
    );
    // The click-events set is passed as the last bound param.
    expect(Array.isArray(capturedValues[capturedValues.length - 1])).toBe(true);
  });

  it('loads visitors across all pages with an optional page-type filter', async () => {
    let capturedSql = '';
    let capturedValues: unknown[] = [];
    const query = jest.fn((sql: string, values?: unknown[]) => {
      capturedSql = sql;
      capturedValues = values || [];
      return Promise.resolve({ rows: [] });
    });
    const database = { query } as unknown as DatabaseService;
    const secrets = {} as SecretCryptoService;
    const service = new AnalyticsReadService(database, secrets);

    await service.getVisitors(
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
      { pageType: 'linktree', from: '2026-01-01', to: '2026-01-31' },
      50,
      0,
    );

    expect(capturedSql).toContain('$2::uuid IS NULL');
    expect(capturedSql).toContain('page.page_type = $5');
    expect(capturedValues).toEqual([
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
      null,
      '2026-01-01',
      '2026-01-31',
      'linktree',
      50,
      0,
    ]);
  });

  it('returns automatically captured CRM prospects with behavioral context', async () => {
    let capturedSql = '';
    let capturedValues: unknown[] = [];
    const query = jest.fn((sql: string, values?: unknown[]) => {
      capturedSql = sql;
      capturedValues = values || [];
      return Promise.resolve({
        rows: [
          {
            id: 'lead-1',
            public_page_id: 'page-1',
            page_name: 'Public page',
            page_type: 'linktree',
            status: 'new',
            value: null,
            currency: null,
            channel: 'instagram',
            score: 40,
            created_at: '2026-07-26T10:00:00.000Z',
            updated_at: '2026-07-26T10:05:00.000Z',
            encrypted_name: null,
            encrypted_email: null,
            encrypted_phone: null,
            visitor_id: 'visitor-1',
            session_id: 'session-1',
            metadata: { captureMethod: 'automatic' },
            country_code: 'IQ',
            region: 'Erbil',
            city: 'Erbil',
            ip_address: '192.168.1.24/32',
            device_type: 'mobile',
            browser: 'Chrome',
            operating_system: 'Android',
            referrer: 'https://instagram.com/',
            action_label: 'WhatsApp',
            last_event: 'whatsapp_click',
            last_seen_at: '2026-07-26T10:05:00.000Z',
            event_count: '3',
            click_count: '1',
          },
        ],
      });
    });
    const database = { query } as unknown as DatabaseService;
    const secrets = {
      decryptText: jest.fn((_value: unknown, fallback?: unknown): string =>
        typeof fallback === 'string' ? fallback : '',
      ),
    } as unknown as SecretCryptoService;
    const service = new AnalyticsReadService(database, secrets);

    const result = await service.getCrmLeads(
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
      '17fdf0e8-d6b4-449a-b3cf-c760160c3f21',
    );

    expect(capturedSql).toContain('LEFT JOIN LATERAL');
    expect(capturedSql).toContain('COUNT(*) FILTER');
    expect(capturedSql).toContain('LIMIT $4 OFFSET $5');
    expect(capturedValues).toEqual([
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
      '17fdf0e8-d6b4-449a-b3cf-c760160c3f21',
      null,
      500,
      0,
    ]);
    expect(result[0]).toMatchObject({
      name: 'سەردانکەری نەناسراو',
      hasContactDetails: false,
      captureMethod: 'automatic',
      networkAddress: '192.168.1.xxx',
      countryCode: 'IQ',
      score: 40,
      eventCount: 3,
      clickCount: 1,
      lastAction: 'WhatsApp',
    });
  });

  /**
   * `analytics_page_daily.new_visitors`/`new_clickers` only mark a visitor's
   * first-ever event, so summing them for a lifetime total would undercount
   * every returning visitor. The page list needs a true distinct count from
   * the event log instead.
   */
  it("computes each page's unique views/clickers from the event log, not the daily rollup sum", async () => {
    let capturedSql = '';
    let capturedValues: unknown[] = [];
    const query = jest.fn((sql: string, values?: unknown[]) => {
      capturedSql = sql;
      capturedValues = values || [];
      return Promise.resolve({ rows: [] });
    });
    const database = { query } as unknown as DatabaseService;
    const secrets = {} as SecretCryptoService;
    const service = new AnalyticsReadService(database, secrets);

    await service.getPages('373f02f3-0b8b-4e93-ad0b-5f16a640daf4');

    expect(capturedSql).not.toContain('SUM(daily.unique_visitors)');
    expect(capturedSql).not.toContain('SUM(daily.unique_clickers)');
    expect(capturedSql).toContain('unique_views AS (');
    expect(capturedSql).toContain('unique_clicks AS (');
    expect(capturedSql).toContain('COUNT(DISTINCT event.visitor_id)');
    expect(Array.isArray(capturedValues[1])).toBe(true);
  });

  it("computes a linktree's unique views/clicks from the event log, not the daily rollup sum", async () => {
    // getLinktreeDetails fires several queries concurrently (this summary,
    // getBreakdowns, getActions, a recent-events query) — find the one this
    // test cares about by its distinguishing CTE name rather than assuming
    // call order.
    const query = jest.fn((sql: string) =>
      // The "recent events" query maps each row's visitor_id directly; an
      // empty placeholder row would crash it, so only that one gets no rows.
      Promise.resolve({
        rows: sql.includes('ORDER BY event.occurred_at DESC') ? [] : [{}],
      }),
    );
    const database = { query } as unknown as DatabaseService;
    const secrets = {} as SecretCryptoService;
    const service = new AnalyticsReadService(database, secrets);

    await service.getLinktreeDetails(
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
      '17fdf0e8-d6b4-449a-b3cf-c760160c3f21',
    );

    const summaryCall = query.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('resolved_page AS'),
    );
    expect(summaryCall).toBeDefined();
    const summarySql = summaryCall?.[0] as string;
    expect(summarySql).not.toContain('SUM(daily.unique_visitors)');
    expect(summarySql).not.toContain('SUM(daily.unique_clickers)');
    expect(summarySql).toContain('COUNT(DISTINCT event.visitor_id)');
  });
});
