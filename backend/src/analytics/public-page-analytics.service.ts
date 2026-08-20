import { Injectable } from '@nestjs/common';
import type {
  PublicPageAnalytics,
  PublicPageTikTokEvent,
} from '@linktree/types';
import { DatabaseService } from '../database/database.service';
import { ENTITLEMENT, entitledSql } from '../billing/entitlement-sql';

/**
 * The tracking block a public page is served with.
 *
 * All approved public marketing surfaces resolve through this service. Pixel
 * ownership follows the page owner: customer pages use that customer's group,
 * while MultiTree-owned pages use the internal platform workspace group.
 *
 * Two facts are resolved together because they are useless apart. A pixel id
 * with no registered actions can only report a page view, and an action with no
 * pixel has nothing to report to.
 */
@Injectable()
export class PublicPageAnalyticsService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Pixel ids for a business, or none when the plan does not carry
   * `feature.tiktok`.
   *
   * Re-checked on every read rather than trusted from whenever the pixel was
   * saved: `business_tiktok_pixels` has no expiry, so a downgraded business
   * would otherwise keep injecting a pixel it no longer pays for.
   */
  private async pixelIds(businessId: string): Promise<string[]> {
    const result = await this.database.query<{ pixel_id: string }>(
      `SELECT pixel.pixel_id
         FROM public.business_tiktok_pixels pixel
         JOIN public.businesses business ON business.id = pixel.business_id
        WHERE pixel.business_id = $1
          AND pixel.status = 'active'
          AND (
            business.account_type = 'platform'
            OR (
              business.account_type = 'business'
              AND ${entitledSql(ENTITLEMENT.tiktok)}
            )
          )
        ORDER BY pixel.display_order, pixel.created_at`,
      [businessId],
    );
    return result.rows.map((row) => row.pixel_id);
  }

  /**
   * The page's registered actions, keyed the way the renderer addresses them.
   *
   * `tiktok_event` travels with the id on purpose. The browser and the Events
   * API must send the same event name for the same `event_id` or TikTok records
   * the pair as two conversions instead of one, and the only way to guarantee
   * that is for the browser to be told the name rather than deriving its own.
   */
  private async actions(
    publicPageId: string,
  ): Promise<PublicPageAnalytics['actions']> {
    const result = await this.database.query<{
      id: string;
      action_key: string;
      tiktok_event: string;
    }>(
      `SELECT id, action_key, tiktok_event
         FROM public.public_page_actions
        WHERE public_page_id = $1 AND status = 'active'`,
      [publicPageId],
    );
    return Object.fromEntries(
      result.rows.map((row) => [
        row.action_key,
        {
          id: row.id,
          pixelEvent: row.tiktok_event as PublicPageTikTokEvent,
        },
      ]),
    );
  }

  /** Resolves both halves for a page that is already known to be published. */
  async forPublicPage(
    businessId: string,
    publicPageId: string,
  ): Promise<PublicPageAnalytics> {
    const [pixelIds, actions] = await Promise.all([
      this.pixelIds(businessId),
      this.actions(publicPageId),
    ]);
    return { pixelIds, actions };
  }

  /** Resolves by source record for a specialized public content model. */
  async forSource(
    source: 'linktree' | 'mini_website' | 'advertising',
    sourceId: string,
  ): Promise<PublicPageAnalytics> {
    const column = {
      linktree: 'source_linktree_id',
      mini_website: 'source_mini_website_id',
      advertising: 'source_advertising_page_id',
    }[source];
    const page = await this.database.query<{
      id: string;
      business_id: string;
    }>(`SELECT id, business_id FROM public.public_pages WHERE ${column} = $1`, [
      sourceId,
    ]);
    const row = page.rows[0];
    // A page with no identity row cannot be reported against, so it is served
    // without tracking rather than with a pixel that has nothing to attach to.
    if (!row) return { pixelIds: [], actions: {} };
    return this.forPublicPage(row.business_id, row.id);
  }
}
