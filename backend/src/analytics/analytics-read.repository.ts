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

export interface AnalyticsDateRange {
  from?: string;
  to?: string;
}

@Injectable()
export class AnalyticsReadRepository {
  constructor(private readonly database: DatabaseService) {}

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
