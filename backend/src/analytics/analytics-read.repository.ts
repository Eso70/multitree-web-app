import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CLICK_EVENTS } from './unified-analytics.service';

export type AnalyticsPageRow = {
  id: string;
  source_id: string;
  type: 'linktree' | 'mini_website';
  name: string;
  slug: string;
  status: string;
  views: string;
  unique_visitors: string;
  clicks: string;
  unique_clickers: string;
  conversions: string;
  updated_at: string;
};

/** Lifetime totals for one linktree, keyed by the linktree's own id. */
export interface LinktreeAnalyticsTotals {
  unique_views: number;
  unique_clicks: number;
  total_clicks: number;
}

export interface AnalyticsDateRange {
  from?: string;
  to?: string;
}

@Injectable()
export class AnalyticsReadRepository {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Lifetime view and click totals per linktree for one business.
   *
   * Unique counts come from the event log rather than
   * `analytics_page_daily.new_visitors`: that column marks only a visitor's
   * first-ever event, so a returning visitor would be undercounted in a
   * lifetime total. `total_clicks` does come from the rollup, which is what it
   * is for.
   *
   * Shared by the business dashboard's page list and the platform admin's
   * business analytics modal, which asked the same question with two copies of
   * this SQL.
   */
  async linktreeTotalsForBusiness(
    businessId: string,
  ): Promise<Map<string, LinktreeAnalyticsTotals>> {
    const result = await this.database.query<{
      linktree_id: string;
      unique_views: string;
      unique_clicks: string;
      total_clicks: string;
    }>(
      `WITH pages AS (
         -- Driven from the business's own pages rather than from the event
         -- log: filtering events by event_name first makes the planner read
         -- every matching event for every tenant and discard the rest on the
         -- join. Starting from this small, business-scoped set lets each CTE
         -- reach analytics_events through
         -- idx_analytics_events_page_visitor_name (public_page_id,
         -- visitor_id, event_name), which is exactly the shape they need.
         SELECT id, source_linktree_id
           FROM public_pages
          WHERE business_id = $1
            AND source_linktree_id IS NOT NULL
            AND deleted_at IS NULL
       ),
       unique_views AS (
         SELECT page.source_linktree_id AS linktree_id,
                COUNT(DISTINCT event.visitor_id)::bigint AS unique_views
           FROM pages page
           JOIN analytics_events event
             ON event.public_page_id = page.id
            AND event.event_name = 'page_view'
          GROUP BY page.source_linktree_id
       ),
       unique_clicks AS (
         SELECT page.source_linktree_id AS linktree_id,
                COUNT(DISTINCT event.visitor_id)::bigint AS unique_clicks
           FROM pages page
           JOIN analytics_events event
             ON event.public_page_id = page.id
            AND event.event_name = ANY($2::varchar[])
          GROUP BY page.source_linktree_id
       )
       SELECT lt.id AS linktree_id,
              COALESCE(uv.unique_views, 0)::bigint AS unique_views,
              COALESCE(uc.unique_clicks, 0)::bigint AS unique_clicks,
              COALESCE(SUM(daily.total_clicks), 0)::bigint AS total_clicks
         FROM linktrees lt
         LEFT JOIN pages page ON page.source_linktree_id = lt.id
         LEFT JOIN analytics_page_daily daily ON daily.public_page_id = page.id
         LEFT JOIN unique_views uv ON uv.linktree_id = lt.id
         LEFT JOIN unique_clicks uc ON uc.linktree_id = lt.id
        WHERE lt.business_id = $1
        GROUP BY lt.id, uv.unique_views, uc.unique_clicks`,
      [businessId, [...CLICK_EVENTS]],
    );

    return new Map(
      result.rows.map((row) => [
        row.linktree_id,
        {
          unique_views: Number(row.unique_views) || 0,
          unique_clicks: Number(row.unique_clicks) || 0,
          total_clicks: Number(row.total_clicks) || 0,
        },
      ]),
    );
  }

  async pagesForBusiness(
    businessId: string,
    range: AnalyticsDateRange = {},
  ): Promise<AnalyticsPageRow[]> {
    const result = await this.database.query<AnalyticsPageRow>(
      `WITH unique_views AS (
         SELECT event.public_page_id,
                COUNT(DISTINCT event.visitor_id)::bigint AS unique_visitors
         FROM analytics_events event
         WHERE event.business_id = $1 AND event.event_name = 'page_view'
           AND ($3::date IS NULL OR event.occurred_at >= $3::date)
           AND ($4::date IS NULL OR event.occurred_at < $4::date + interval '1 day')
         GROUP BY event.public_page_id
       ), unique_clicks AS (
         SELECT event.public_page_id,
                COUNT(DISTINCT event.visitor_id)::bigint AS unique_clickers
         FROM analytics_events event
         WHERE event.business_id = $1
           AND event.event_name = ANY($2::varchar[])
           AND ($3::date IS NULL OR event.occurred_at >= $3::date)
           AND ($4::date IS NULL OR event.occurred_at < $4::date + interval '1 day')
         GROUP BY event.public_page_id
       )
       SELECT page.id,
         CASE WHEN page.page_type = 'linktree' THEN page.source_linktree_id
              ELSE page.source_mini_website_id END AS source_id,
         page.page_type AS type, page.name, page.slug, page.status,
         COALESCE(SUM(daily.total_views), 0)::bigint AS views,
         COALESCE(uv.unique_visitors, 0)::bigint AS unique_visitors,
         COALESCE(SUM(daily.total_clicks), 0)::bigint AS clicks,
         COALESCE(uc.unique_clickers, 0)::bigint AS unique_clickers,
         COALESCE(SUM(daily.conversions), 0)::bigint AS conversions,
         page.updated_at
       FROM public_pages page
       LEFT JOIN analytics_page_daily daily
         ON daily.public_page_id = page.id
        AND ($3::date IS NULL OR daily.day >= $3::date)
        AND ($4::date IS NULL OR daily.day <= $4::date)
       LEFT JOIN unique_views uv ON uv.public_page_id = page.id
       LEFT JOIN unique_clicks uc ON uc.public_page_id = page.id
       WHERE page.business_id = $1 AND page.deleted_at IS NULL
       GROUP BY page.id, uv.unique_visitors, uc.unique_clickers
       ORDER BY page.updated_at DESC`,
      [businessId, [...CLICK_EVENTS], range.from || null, range.to || null],
    );
    return result.rows;
  }
}
