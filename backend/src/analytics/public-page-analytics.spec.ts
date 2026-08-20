import { readFileSync } from 'fs';
import { join } from 'path';
import { PublicPageAnalyticsService } from './public-page-analytics.service';
import { DatabaseService } from '../database/database.service';

/**
 * Where a business's TikTok pixel is allowed to reach.
 *
 * The frontend has its own guard for where the pixel is *mounted*
 * (`components/analytics/pixel-placement.spec.ts`). This is the server half:
 * which pages are told a pixel id at all, and which page types get forwarded
 * to the Events API. See docs/tracking.md.
 */

function service(rows: Array<Record<string, unknown>>[] = []) {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  for (const result of rows) query.mockResolvedValueOnce({ rows: result });
  const database = { query } as unknown as DatabaseService;
  return { service: new PublicPageAnalyticsService(database), query };
}

describe('PublicPageAnalyticsService', () => {
  it('re-checks the tiktok entitlement on every read', async () => {
    const { service: subject, query } = service();
    await subject.forPublicPage('business-1', 'page-1');

    const [pixelSql] = query.mock.calls[0] as [string];
    // A plan can lapse and nothing rewrites `business_tiktok_pixels`, so
    // trusting the row alone leaves a downgraded business injecting a pixel it
    // no longer pays for.
    expect(pixelSql).toContain('feature.tiktok');
    expect(pixelSql).toContain('business_subscriptions');
  });

  it('carries the action id and the event name the browser must echo', async () => {
    const { service: subject } = service([
      [{ pixel_id: 'PIXEL123' }],
      [
        {
          id: 'action-1',
          action_key: 'mini:whatsapp',
          tiktok_event: 'Contact',
        },
        { id: 'action-2', action_key: 'link:abc', tiktok_event: 'ClickButton' },
      ],
    ]);

    const analytics = await subject.forPublicPage('business-1', 'page-1');

    expect(analytics.pixelIds).toEqual(['PIXEL123']);
    // Keyed by `action_key`, because that is what the renderer holds; the id
    // and the event name travel together so neither side invents one.
    expect(analytics.actions['mini:whatsapp']).toEqual({
      id: 'action-1',
      pixelEvent: 'Contact',
    });
    expect(analytics.actions['link:abc'].pixelEvent).toBe('ClickButton');
  });

  it('serves a page with no identity row without tracking rather than failing', async () => {
    const { service: subject } = service([[]]);

    await expect(subject.forSource('linktree', 'lt-1')).resolves.toEqual({
      pixelIds: [],
      actions: {},
    });
  });
});

describe('TikTok forwarding scope', () => {
  const source = readFileSync(
    join(__dirname, 'unified-analytics.service.ts'),
    'utf8',
  );

  it('forwards every registered public marketing page type', () => {
    const declaration = source.match(
      /TIKTOK_FORWARDED_PAGE_TYPES[\s\S]*?new Set\(\[([^\]]*)\]\)/,
    );

    expect(declaration).not.toBeNull();
    // Internal analytics still records every public page. Only the outbound
    // half is scoped: an advertising page never loaded the pixel, so a server
    // event for it would have no browser counterpart to deduplicate against
    // and would inflate the counts ads optimise on.
    expect(declaration?.[1]).toContain("'linktree'");
    expect(declaration?.[1]).toContain("'mini_website'");
    expect(declaration?.[1]).toContain("'advertising'");
    expect(declaration?.[1]).toContain("'route'");
  });

  it('gates the outbox insert on the same entitlement as the public read', () => {
    const insert = source.match(
      /INSERT INTO marketing_event_outbox[\s\S]*?ON CONFLICT/,
    );

    expect(insert?.[0]).toContain('entitledSql');
  });
});
