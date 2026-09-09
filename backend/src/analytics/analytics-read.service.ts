import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CLICK_EVENTS } from './unified-analytics.service';
import { AnalyticsReadRepository } from './analytics-read.repository';

interface AnalyticsFilters {
  pageId?: string;
  pageType?: 'linktree';
  from?: string;
  to?: string;
}

@Injectable()
export class AnalyticsReadService {
  constructor(
    private readonly database: DatabaseService,
    private readonly repository: AnalyticsReadRepository = new AnalyticsReadRepository(
      database,
    ),
  ) {}

  private values(businessId: string, filters: AnalyticsFilters): unknown[] {
    return [
      businessId,
      filters.pageId || null,
      filters.from || null,
      filters.to || null,
    ];
  }

  private eventPredicate(alias = 'event'): string {
    return `${alias}.business_id = $1
      AND (
        $2::uuid IS NULL
        OR ${alias}.public_page_id IN (
          SELECT page.id
          FROM public_pages page
          WHERE page.business_id = $1
            AND (
              page.id = $2
              OR page.source_linktree_id = $2
            )
        )
      )
      AND ($3::date IS NULL OR ${alias}.occurred_at >= $3::date)
      AND ($4::date IS NULL OR ${alias}.occurred_at < $4::date + interval '1 day')
      AND ${alias}.is_bot = false`;
  }

  async getPages(businessId: string, filters: AnalyticsFilters = {}) {
    const rows = await this.repository.pagesForBusiness(businessId, {
      from: filters.from,
      to: filters.to,
    });
    return rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      type: row.type,
      name: row.name,
      slug: row.slug,
      status: row.status,
      views: Number(row.views),
      uniqueVisitors: Number(row.unique_visitors),
      clicks: Number(row.clicks),
      uniqueClickers: Number(row.unique_clickers),
      conversions: Number(row.conversions),
      updatedAt: row.updated_at,
    }));
  }

  async getActions(businessId: string, filters: AnalyticsFilters) {
    const result = await this.database.query<{
      id: string;
      action_key: string;
      metadata: Record<string, string> | null;
      label: string;
      action_type: string;
      destination: string | null;
      total_clicks: string;
      unique_clickers: string;
      conversions: string;
      conversion_value: string;
      page_views: string;
      page_name: string;
    }>(
      `WITH selected_pages AS (
         SELECT id
         FROM public_pages
         WHERE business_id = $1
           AND (
             $2::uuid IS NULL
             OR id = $2
             OR source_linktree_id = $2
           )
           AND ($5::varchar IS NULL OR page_type = $5)
       ),
       totals AS (
         SELECT daily.public_page_action_id,
                SUM(daily.total_clicks)::bigint AS total_clicks,
                SUM(daily.conversions)::bigint AS conversions,
                SUM(daily.conversion_value)::numeric AS conversion_value
         FROM analytics_action_daily daily
         WHERE daily.business_id = $1
           AND daily.public_page_id IN (SELECT id FROM selected_pages)
           AND ($3::date IS NULL OR daily.day >= $3::date)
           AND ($4::date IS NULL OR daily.day <= $4::date)
         GROUP BY daily.public_page_action_id
       ),
       -- Read straight from the event log rather than the daily rollup:
       -- that log contains the exact event occurrences for every button click
       -- and unique clickers in the requested date range.
       unique_totals AS (
         SELECT event.public_page_action_id,
                COUNT(*)::bigint AS total_clicks,
                COUNT(DISTINCT event.visitor_id)::bigint AS unique_clickers,
                COUNT(*) FILTER (WHERE event.is_conversion)::bigint AS conversions,
                COALESCE(SUM(event.conversion_value) FILTER (WHERE event.is_conversion), 0)::numeric AS conversion_value
         FROM analytics_events event
         WHERE event.public_page_action_id IS NOT NULL
           AND event.public_page_id IN (SELECT id FROM selected_pages)
           AND event.event_name = ANY($6::varchar[])
           AND ($3::date IS NULL OR event.occurred_at >= $3::date)
           AND ($4::date IS NULL OR event.occurred_at < $4::date + interval '1 day')
         GROUP BY event.public_page_action_id
       ),
       page_total AS (
         SELECT daily.public_page_id,
                COALESCE(SUM(daily.total_views), 0)::bigint AS views
         FROM analytics_page_daily daily
         WHERE daily.business_id = $1
           AND daily.public_page_id IN (SELECT id FROM selected_pages)
           AND ($3::date IS NULL OR daily.day >= $3::date)
           AND ($4::date IS NULL OR daily.day <= $4::date)
         GROUP BY daily.public_page_id
       )
       SELECT action.id, action.action_key, action.metadata, action.label, action.action_type, action.destination,
              GREATEST(COALESCE(totals.total_clicks, 0), COALESCE(unique_totals.total_clicks, 0))::bigint AS total_clicks,
              COALESCE(unique_totals.unique_clickers, 0)::bigint AS unique_clickers,
              GREATEST(COALESCE(totals.conversions, 0), COALESCE(unique_totals.conversions, 0))::bigint AS conversions,
              GREATEST(COALESCE(totals.conversion_value, 0), COALESCE(unique_totals.conversion_value, 0))::numeric AS conversion_value,
              COALESCE(page_total.views, 0)::bigint AS page_views,
              page.name AS page_name
       FROM public_page_actions action
       JOIN public_pages page ON page.id = action.public_page_id
       LEFT JOIN page_total ON page_total.public_page_id = action.public_page_id
       LEFT JOIN totals ON totals.public_page_action_id = action.id
       LEFT JOIN unique_totals ON unique_totals.public_page_action_id = action.id
       WHERE action.public_page_id IN (SELECT id FROM selected_pages)
         AND action.status <> 'archived'
         AND (
           action.source_link_id IS NOT NULL
           OR action.action_key NOT LIKE 'link:%'
         )
       ORDER BY total_clicks DESC, action.display_order ASC`,
      [
        businessId,
        filters.pageId || null,
        filters.from || null,
        filters.to || null,
        filters.pageType || null,
        [...CLICK_EVENTS],
      ],
    );
    return result.rows.map((row) => ({
      id: row.id,
      // The stable key the page tags its buttons with. Rich public pages group a
      // long action list by the section encoded in it.
      actionKey: row.action_key,
      // Carries what the row actually is — its section, and the brand it points
      // at when that was known at save time — so a reader never has to guess it
      // back out of a label the business was free to type.
      metadata: row.metadata ?? {},
      label: row.label,
      actionType: row.action_type,
      destination: row.destination,
      pageName: row.page_name,
      totalClicks: Number(row.total_clicks),
      uniqueClickers: Number(row.unique_clickers),
      conversions: Number(row.conversions),
      conversionValue: Number(row.conversion_value),
      ctr:
        Number(row.page_views) > 0
          ? (Number(row.total_clicks) / Number(row.page_views)) * 100
          : 0,
    }));
  }

  async getLinktreeDetails(businessId: string, pageId: string) {
    const [summaryResult, actions] = await Promise.all([
      this.database.query<{
        views: string;
        unique_views: string;
        clicks: string;
        unique_clicks: string;
      }>(
        // Exact unique totals come from the event log. Daily rows intentionally
        // store only additive totals used by the per-page modal.
        `WITH resolved_page AS (
           SELECT page.id
           FROM public_pages page
           WHERE page.business_id=$1
             AND (page.id=$2 OR page.source_linktree_id=$2)
         )
         SELECT
           COALESCE(SUM(daily.total_views),0)::bigint AS views,
           COALESCE((
             SELECT COUNT(DISTINCT event.visitor_id)
             FROM analytics_events event
             WHERE event.public_page_id = (SELECT id FROM resolved_page)
               AND event.event_name = 'page_view'
           ), 0)::bigint AS unique_views,
           COALESCE(SUM(daily.total_clicks),0)::bigint AS clicks,
           COALESCE((
             SELECT COUNT(DISTINCT event.visitor_id)
             FROM analytics_events event
             WHERE event.public_page_id = (SELECT id FROM resolved_page)
               AND event.event_name = ANY($3::varchar[])
           ), 0)::bigint AS unique_clicks
         FROM analytics_page_daily daily
         JOIN public_pages page ON page.id=daily.public_page_id
         WHERE daily.business_id=$1
           AND (page.id=$2 OR page.source_linktree_id=$2)`,
        [businessId, pageId, [...CLICK_EVENTS]],
      ),
      this.getActions(businessId, { pageId }),
    ]);
    const summary = summaryResult.rows[0];
    return {
      unique_views: Number(summary.unique_views),
      unique_clicks: Number(summary.unique_clicks),
      total_views: Number(summary.views),
      total_clicks: Number(summary.clicks),
      conversions: actions.reduce(
        (total, action) => total + action.conversions,
        0,
      ),
      conversion_value: actions.reduce(
        (total, action) => total + action.conversionValue,
        0,
      ),
      clicks_by_platform: Object.fromEntries(
        actions.map((action) => [action.label, action.totalClicks]),
      ),
      top_clicked_links: actions.map((action) => ({
        link_id: action.id,
        platform: action.actionType,
        display_name: action.label,
        click_count: action.totalClicks,
        click_count_raw: action.totalClicks,
      })),
    };
  }

  async getTikTokHealth(businessId: string, filters: AnalyticsFilters) {
    const values = this.values(businessId, filters);
    const result = await this.database.query<{
      connections: string;
      browser_events: string;
      queued_events: string;
      delivered: string;
      retrying: string;
      failed: string;
      last_delivered_at: string | null;
      internal_conversions: string;
      conversion_deliveries: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM business_tiktok_pixels pixel
          WHERE pixel.business_id = $1 AND pixel.status = 'active')::bigint AS connections,
         COUNT(outbox.id) FILTER (WHERE outbox.browser_dispatched)::bigint AS browser_events,
         COUNT(outbox.id)::bigint AS queued_events,
         COUNT(outbox.id) FILTER (WHERE outbox.status = 'delivered')::bigint AS delivered,
         COUNT(outbox.id) FILTER (WHERE outbox.status IN ('pending','processing','retry_scheduled'))::bigint AS retrying,
         COUNT(outbox.id) FILTER (WHERE outbox.status = 'failed_permanently')::bigint AS failed,
         MAX(outbox.delivered_at) AS last_delivered_at,
         (SELECT COUNT(*)::bigint
          FROM analytics_events event
          WHERE ${this.eventPredicate()}
            AND event.is_conversion = true) AS internal_conversions,
         COUNT(outbox.id) FILTER (
           WHERE outbox.status = 'delivered' AND event.is_conversion = true
         )::bigint AS conversion_deliveries
       FROM marketing_event_outbox outbox
       JOIN analytics_events event ON event.id = outbox.analytics_event_id
       WHERE outbox.business_id = $1
         AND (
           $2::uuid IS NULL
           OR event.public_page_id IN (
             SELECT page.id FROM public_pages page
             WHERE page.business_id = $1
               AND (page.id = $2 OR page.source_linktree_id = $2)
           )
         )
         AND ($3::date IS NULL OR outbox.created_at >= $3::date)
         AND ($4::date IS NULL OR outbox.created_at < $4::date + interval '1 day')`,
      values,
    );
    const row = result.rows[0];
    const queued = Number(row.queued_events);
    const delivered = Number(row.delivered);
    return {
      connections: Number(row.connections),
      browserEvents: Number(row.browser_events),
      serverEvents: queued,
      delivered,
      retrying: Number(row.retrying),
      failed: Number(row.failed),
      deliveryRate: queued > 0 ? (delivered / queued) * 100 : 0,
      lastDeliveredAt: row.last_delivered_at,
      reconciliation: {
        internalConversions: Number(row.internal_conversions),
        serverAcceptedConversions: Number(row.conversion_deliveries),
      },
    };
  }

  /**
   * The errors behind a failing TikTok connection, grouped so an owner sees
   * problems rather than a log.
   *
   * `getTikTokHealth` answers "how many failed"; a count alone is unactionable
   * — a wrong Events API token and a malformed payload both read as a number
   * going up. This returns what TikTok actually said, per pixel, so the owner
   * can tell "token rejected" from "this one event was invalid".
   *
   * Grouped by pixel, status code, and message: eight retry attempts across
   * fifty queued events are one problem, and listing them individually buries
   * it. `attempts` and the first/last timestamps carry the scale instead.
   *
   * The summary comes from TikTok's own response body or a network error
   * message; the Events API token travels only as a request header and is
   * never echoed into it. That matters because this text reaches both the
   * business owner and the platform notification centre.
   */
  async getTikTokDeliveryErrors(businessId: string, limit = 20) {
    const result = await this.database.query<{
      pixel_id: string | null;
      destination_id: string;
      status_code: number | null;
      response_summary: string | null;
      outcome: string;
      attempts: string;
      events: string;
      first_seen_at: Date;
      last_seen_at: Date;
      permanently_failed: string;
    }>(
      `SELECT destination.pixel_id,
              outbox.destination_id,
              attempt.status_code,
              attempt.response_summary,
              attempt.outcome,
              COUNT(*)::bigint AS attempts,
              COUNT(DISTINCT outbox.id)::bigint AS events,
              MIN(attempt.created_at) AS first_seen_at,
              MAX(attempt.created_at) AS last_seen_at,
              COUNT(DISTINCT outbox.id) FILTER (
                WHERE outbox.status = 'failed_permanently'
              )::bigint AS permanently_failed
         FROM marketing_delivery_attempts attempt
         JOIN marketing_event_outbox outbox ON outbox.id = attempt.outbox_id
         LEFT JOIN business_tiktok_pixels destination
           ON destination.id = outbox.destination_id
        WHERE outbox.business_id = $1
          AND attempt.outcome <> 'success'
        GROUP BY destination.pixel_id, outbox.destination_id,
                 attempt.status_code, attempt.response_summary, attempt.outcome
        ORDER BY MAX(attempt.created_at) DESC
        LIMIT $2`,
      [businessId, Math.min(Math.max(limit, 1), 50)],
    );

    return {
      items: result.rows.map((row) => ({
        pixelId: row.pixel_id,
        destinationId: row.destination_id,
        statusCode: row.status_code,
        // `outcome` is the honest severity: 'retry' may still succeed on the
        // next pass, 'failure' will not without a configuration change.
        severity: row.outcome === 'failure' ? 'permanent' : 'retrying',
        message: row.response_summary || 'No detail returned by TikTok',
        attempts: Number(row.attempts),
        events: Number(row.events),
        permanentlyFailed: Number(row.permanently_failed),
        firstSeenAt: row.first_seen_at,
        lastSeenAt: row.last_seen_at,
      })),
    };
  }

  async retryFailedTikTokEvents(
    businessId: string,
    pageId?: string,
  ): Promise<number> {
    const result = await this.database.query(
      `UPDATE marketing_event_outbox
       SET status = 'retry_scheduled',
           attempt_count = 0,
           next_attempt_at = now(),
           last_error = NULL,
           locked_at = NULL,
           updated_at = now()
       WHERE business_id = $1
         AND status = 'failed_permanently'
         AND (
           $2::uuid IS NULL
           OR analytics_event_id IN (
             SELECT event.id
             FROM analytics_events event
             JOIN public_pages page ON page.id=event.public_page_id
             WHERE event.business_id=$1
               AND (
                 page.id=$2::uuid
                 OR page.source_linktree_id=$2::uuid
               )
           )
         )`,
      [businessId, pageId || null],
    );
    return result.rowCount || 0;
  }
}
