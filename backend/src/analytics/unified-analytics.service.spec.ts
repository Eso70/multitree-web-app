import { mockArg } from '../common/test-utils';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import {
  UnifiedAnalyticsService,
  forwardsToTikTok,
  isAnalyticsBotUserAgent,
} from './unified-analytics.service';

/**
 * The event name the outbox records for a browser-dispatched event.
 *
 * TikTok collapses a browser event and a server event into one only when the
 * event *name* and the event id both match. Our own mapping can legitimately
 * reach a different name than the page did — a service click is `Contact` in
 * the page and `ClickButton` here — so when the pixel already fired, the name
 * it used has to win or the conversion is counted twice.
 */
describe('deduplication pairing', () => {
  function outboxEventName(input: {
    browserDispatched?: boolean;
    browserEventName?: string;
    derived: string;
  }): string {
    return (input.browserDispatched && input.browserEventName) || input.derived;
  }

  it('reports the name the browser already fired', () => {
    expect(
      outboxEventName({
        browserDispatched: true,
        browserEventName: 'Contact',
        derived: 'ClickButton',
      }),
    ).toBe('Contact');
  });

  it('falls back to our own mapping when no pixel fired', () => {
    expect(
      outboxEventName({
        browserDispatched: false,
        browserEventName: 'Contact',
        derived: 'ClickButton',
      }),
    ).toBe('ClickButton');
  });

  it('ignores a claimed name that arrives without a dispatch', () => {
    expect(outboxEventName({ derived: 'Lead' })).toBe('Lead');
  });
});

/**
 * Which events are allowed to reach TikTok at all.
 *
 * `trackEngagement` reports a section opening or a scroll-depth milestone with
 * no registered action, which is what stops the browser firing a pixel for it.
 * The server had no matching rule and forwarded them anyway, so engagement
 * arrived as a server-only `ClickButton` with no browser event to deduplicate
 * against — and `form_view` arrived as a second `ViewContent` on top of the
 * page's own. See docs/tracking.md.
 */
describe('forwardsToTikTok', () => {
  it('forwards an approved advertising public page', () => {
    expect(
      forwardsToTikTok({
        pageType: 'advertising',
        eventName: 'whatsapp_click',
        hasAction: true,
      }),
    ).toBe(true);
  });

  it('forwards an explicitly registered fixed public route', () => {
    expect(
      forwardsToTikTok({
        pageType: 'route',
        eventName: 'page_view',
        hasAction: false,
      }),
    ).toBe(true);
  });

  it('forwards a conversion that resolved to a registered action', () => {
    expect(
      forwardsToTikTok({
        pageType: 'mini_website',
        eventName: 'whatsapp_click',
        hasAction: true,
      }),
    ).toBe(true);
  });

  it('drops engagement that fired no pixel', () => {
    for (const eventName of [
      'engaged_view',
      'action_open',
      'form_view',
    ] as const) {
      expect(
        forwardsToTikTok({
          pageType: 'mini_website',
          eventName,
          hasAction: false,
        }),
      ).toBe(false);
    }
  });

  it('still forwards an engagement-named event that is a registered action', () => {
    // The browser fires the pixel whenever the key resolves to a registered
    // action, so dropping the server half here would break the pair.
    expect(
      forwardsToTikTok({
        pageType: 'mini_website',
        eventName: 'action_open',
        hasAction: true,
      }),
    ).toBe(true);
  });

  it('keeps forwarding a share, which is also what a vcard download infers', () => {
    // `mini:share` and `mini:vcard` both infer `share`, and saving a contact
    // card is a conversion — so `share` must stay out of the engagement set.
    expect(
      forwardsToTikTok({
        pageType: 'mini_website',
        eventName: 'share',
        hasAction: false,
      }),
    ).toBe(true);
  });

  it('forwards a server-recorded lead that has no action row', () => {
    // The mini-website lead form ingests `form_submit` with no `actionId`. It
    // is the conversion the page exists for, so it must not be filtered out.
    expect(
      forwardsToTikTok({
        pageType: 'mini_website',
        eventName: 'form_submit',
        hasAction: false,
      }),
    ).toBe(true);
  });

  it('forwards the page view that pairs with the pixel ViewContent', () => {
    expect(
      forwardsToTikTok({
        pageType: 'linktree',
        eventName: 'page_view',
        hasAction: false,
      }),
    ).toBe(true);
  });
});

describe('analytics bot detection', () => {
  it('does not classify CUBOT Android phones as bots', () => {
    expect(
      isAnalyticsBotUserAgent(
        'Mozilla/5.0 (Linux; Android 10; CUBOT_NOTE_20 Build/QP1A)',
      ),
    ).toBe(false);
  });

  it('still classifies known crawlers and generic bot tokens', () => {
    expect(isAnalyticsBotUserAgent('facebookexternalhit/1.1')).toBe(true);
    expect(isAnalyticsBotUserAgent('Example-Bot/1.0')).toBe(true);
  });
});

describe('action resolution', () => {
  it('accepts an archived action that still belongs to the page', async () => {
    const service = buildService();
    const action = {
      id: 'action-id',
      label: 'Old button',
      action_type: 'button',
      tiktok_event: 'ClickButton',
    };
    const client = { query: jest.fn().mockResolvedValue({ rows: [action] }) };

    const result = await (
      service as unknown as {
        resolveAction: (
          client: unknown,
          pageId: string,
          actionId: string,
        ) => Promise<unknown>;
      }
    ).resolveAction(client, 'page-id', 'action-id');

    expect(result).toEqual(action);
    expect(mockArg<string>(client.query, 0, 0)).not.toContain(
      "status = 'active'",
    );
  });

  it('keeps an unknown or cross-page action detached from action rollups', async () => {
    const service = buildService();
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };

    await expect(
      (
        service as unknown as {
          resolveAction: (
            client: unknown,
            pageId: string,
            actionId: string,
          ) => Promise<unknown>;
        }
      ).resolveAction(client, 'page-id', 'other-action-id'),
    ).resolves.toBeNull();
  });
});

function buildService(database: unknown = {}) {
  const config = { get: () => 'x'.repeat(32) };
  return new UnifiedAnalyticsService(
    database as DatabaseService,
    config as unknown as ConfigService,
  );
}

describe('tracked redirect destinations', () => {
  it('resolves only the registered HTTP destination', async () => {
    const database = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{ destination: 'https://wa.me/9647500000000' }],
      }),
    };
    const service = buildService(database);

    await expect(
      service.resolveRedirectDestination('page-id', 'action-id'),
    ).resolves.toBe('https://wa.me/9647500000000');

    const query = mockArg<string>(database.query, 0, 0);
    expect(query).toContain('action.id = $2::uuid');
    expect(query).toContain('page.source_linktree_id = $1::uuid');
    expect(query).toContain('page.source_mini_website_id = $1::uuid');
    expect(query).not.toContain('destination = $');
  });

  it('refuses a stored non-http destination', async () => {
    const database = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{ destination: 'javascript:alert(1)' }],
      }),
    };
    const service = buildService(database);

    await expect(
      service.resolveRedirectDestination('page-id', 'action-id'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('preserves a WhatsApp preset without allowing the target to change', async () => {
    const database = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{ destination: 'https://wa.me/9647500000000' }],
      }),
    };
    const service = buildService(database);

    await expect(
      service.resolveRedirectDestination(
        'page-id',
        'action-id',
        'I want the holiday offer',
      ),
    ).resolves.toBe(
      'https://wa.me/9647500000000?text=I+want+the+holiday+offer',
    );
  });
});

describe('analytics rollups', () => {
  it('writes only additive totals and leaves exact uniques to the event log', async () => {
    const service = buildService();
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await (
      service as unknown as {
        updateRollups: (
          client: unknown,
          input: {
            page: {
              id: string;
              business_id: string;
              page_type: 'linktree' | 'mini_website';
              timezone: string;
              name: string;
              slug: string;
            };
            action: null;
            eventName: 'page_view';
            occurredAt: string;
            conversionValue: number;
          },
        ) => Promise<void>;
      }
    ).updateRollups(client, {
      page: {
        id: 'page-1',
        business_id: 'business-1',
        page_type: 'linktree',
        timezone: 'Asia/Baghdad',
        name: 'Page',
        slug: 'page',
      },
      action: null,
      eventName: 'page_view',
      occurredAt: '2026-07-31T00:00:00.000Z',
      conversionValue: 0,
    });

    expect(client.query).toHaveBeenCalledTimes(1);
    const pageDailyInsert = mockArg<string>(client.query, 0, 0);
    expect(pageDailyInsert).not.toContain('new_visitors');
    expect(pageDailyInsert).not.toContain('new_clickers');
    expect(pageDailyInsert).not.toContain('unique_visitors');
    expect(pageDailyInsert).not.toContain('unique_clickers');
  });
});

describe('getSummary uniques', () => {
  it('reads unique views/clickers from analytics_events, not the daily rollup', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              total_views: '100',
              total_clicks: '40',
              conversions: '5',
              conversion_value: '250',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ unique_views: '37', unique_clickers: '12' }],
        }),
    };
    const service = buildService(database);

    const summary = await service.getSummary('business-1', {});

    expect(summary.total_views).toBe(100);
    expect(summary.unique_views).toBe(37);
    expect(summary.unique_visitors).toBe(37);
    expect(summary.unique_clicks).toBe(12);
    expect(summary.unique_clickers).toBe(12);

    const uniquenessQuery = mockArg<string>(database.query, 1, 0);
    expect(uniquenessQuery).toContain('analytics_events');
    expect(uniquenessQuery).toMatch(/COUNT\(DISTINCT/);
  });
});

describe('getDaily uniques', () => {
  /**
   * A per-day trend point needs "how many distinct people were active that
   * day", computed live per day from the event log.
   */
  it('computes getDaily uniques from the event log, not the daily rollup', async () => {
    const database = {
      query: jest.fn().mockResolvedValueOnce({ rows: [] }),
    };
    const service = buildService(database);

    await service.getDaily('business-1', 'page-1', 30);

    const query = mockArg<string>(database.query, 0, 0);
    expect(query).not.toContain('daily.unique_visitors');
    expect(query).not.toContain('daily.unique_clickers');
    expect(query).toContain('day_uniques AS');
    expect(query).toContain('COUNT(DISTINCT event.visitor_id)');
    expect(query).toContain('AT TIME ZONE page.timezone');
    expect(query).toContain('target.local_today');
  });
});
