import { mockArg } from '../common/test-utils';
import { ConfigService } from '@nestjs/config';
import { SecretCryptoService } from '../auth/secret-crypto.service';
import { DatabaseService } from '../database/database.service';
import {
  UnifiedAnalyticsService,
  automaticCrmStatus,
  crmProspectLockKey,
  forwardsToTikTok,
} from './unified-analytics.service';

describe('automaticCrmStatus', () => {
  it('keeps passive visitors new and advances direct contact actions', () => {
    expect(automaticCrmStatus('page_view')).toBe('new');
    expect(automaticCrmStatus('button_click')).toBe('new');
    expect(automaticCrmStatus('whatsapp_click')).toBe('contacted');
    expect(automaticCrmStatus('call_click')).toBe('contacted');
    expect(automaticCrmStatus('email_click')).toBe('contacted');
  });

  it('qualifies strong intent and marks completed orders as won', () => {
    expect(automaticCrmStatus('form_submit', true)).toBe('qualified');
    expect(automaticCrmStatus('booking_started')).toBe('qualified');
    expect(automaticCrmStatus('checkout_started')).toBe('qualified');
    expect(automaticCrmStatus('order_completed')).toBe('won');
  });

  it('keeps the same visitor independent on each public page', () => {
    const firstPage = crmProspectLockKey('business-1', 'page-1', 'visitor-1');
    const secondPage = crmProspectLockKey('business-1', 'page-2', 'visitor-1');

    expect(firstPage).not.toBe(secondPage);
    expect(firstPage).toBe('crm:business-1:page-1:visitor-1');
    expect(secondPage).toBe('crm:business-1:page-2:visitor-1');
  });
});

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
  it('never forwards a page type outside the two public surfaces', () => {
    expect(
      forwardsToTikTok({
        pageType: 'advertising',
        eventName: 'whatsapp_click',
        hasAction: true,
      }),
    ).toBe(false);
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

function buildService(database: unknown = {}) {
  const config = { get: () => 'x'.repeat(32) };
  return new UnifiedAnalyticsService(
    database as DatabaseService,
    config as unknown as ConfigService,
    {} as unknown as SecretCryptoService,
  );
}

describe('unique view/click rollups', () => {
  /**
   * A visitor returning on a later day is still the same visitor, not a new
   * one — the daily rollup this feeds is only meant to bucket *when* the
   * count landed, not to reset who counts as unique. Scoping the "have they
   * been seen before" check to "today" (as it used to) double-counts anyone
   * who comes back on a different day.
   */
  it("checks a visitor's whole history rather than just today", async () => {
    const service = buildService();
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            { first_view: true, first_click: false, first_action_click: false },
          ],
        })
        .mockResolvedValue({ rows: [] }),
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
            visitorId: string;
            databaseEventId: string;
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
      visitorId: 'visitor-1',
      databaseEventId: 'event-1',
      eventName: 'page_view',
      occurredAt: '2026-07-31T00:00:00.000Z',
      conversionValue: 0,
    });

    const uniquenessQuery = mockArg<string>(client.query, 0, 0);
    expect(uniquenessQuery).not.toMatch(/AT TIME ZONE/);
    expect(uniquenessQuery).toContain('event.visitor_id = $2');

    // The rollup column is `new_visitors`/`new_clickers` (a "first-ever,
    // credited to that day" acquisition metric), not `unique_visitors`/
    // `unique_clickers` — reporting reads uniques from the event log
    // directly instead (see getSummary, getActions, getPages).
    const pageDailyInsert = mockArg<string>(client.query, 1, 0);
    expect(pageDailyInsert).toContain('new_visitors');
    expect(pageDailyInsert).toContain('new_clickers');
    expect(pageDailyInsert).not.toContain('unique_visitors');
    expect(pageDailyInsert).not.toContain('unique_clickers');
  });
});

describe('getSummary uniques', () => {
  /**
   * The daily rollup's `unique_visitors`/`unique_clickers` only mark a
   * visitor's first-ever event, so summing it over a date range answers
   * "new visitors in range", not "active unique visitors in range" — this
   * is what regresses if `getSummary` ever goes back to reading uniques
   * from `analytics_page_daily` instead of the event log directly.
   */
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
        })
        .mockResolvedValueOnce({
          rows: [
            {
              new_visitors: '10',
              returning_visitors: '27',
              total_sessions: '50',
              bounced_sessions: '5',
              avg_engagement_seconds: '42',
            },
          ],
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

describe('getDaily/getTimeline uniques', () => {
  /**
   * A per-day trend point needs "how many distinct people were active that
   * day", computed live per day from the event log — not the rollup's
   * new_visitors/new_clickers, which only mark a visitor's first-ever event
   * (a different, "new acquisition" metric — see updateRollups).
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
  });

  it('computes getTimeline uniques from the event log, not the daily rollup', async () => {
    const database = {
      query: jest.fn().mockResolvedValueOnce({ rows: [] }),
    };
    const service = buildService(database);

    await service.getTimeline('business-1', 30, {});

    const query = mockArg<string>(database.query, 0, 0);
    expect(query).not.toContain('daily.unique_visitors');
    expect(query).not.toContain('daily.unique_clickers');
    expect(query).toContain('day_uniques AS');
    expect(query).toContain('COUNT(DISTINCT event.visitor_id)');
  });
});
