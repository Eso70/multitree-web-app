import { Injectable, NotFoundException } from '@nestjs/common';
import { SecretCryptoService } from '../auth/secret-crypto.service';
import { DatabaseService } from '../database/database.service';
import type { CrmLeadStatus } from './dto/analytics-crm.dto';
import { CLICK_EVENTS, ENGAGEMENT_EVENTS } from './unified-analytics.service';
import { AnalyticsReadRepository } from './analytics-read.repository';

const REFERRER_HOST_EXPRESSION = `substring(event.referrer from '(?:^[a-zA-Z][a-zA-Z0-9+.-]*://)?([^/]+)')`;

interface AnalyticsFilters {
  pageId?: string;
  pageType?: 'linktree' | 'mini_website';
  from?: string;
  to?: string;
}

interface CrmLeadRow {
  id: string;
  public_page_id: string;
  page_name: string;
  page_type: string;
  status: CrmLeadStatus;
  value: string | null;
  currency: string | null;
  channel: string | null;
  score: number | null;
  created_at: string;
  updated_at: string;
  encrypted_name: Buffer | null;
  encrypted_email: Buffer | null;
  encrypted_phone: Buffer | null;
  visitor_id: string | null;
  session_id: string | null;
  metadata: Record<string, unknown>;
  country_code: string | null;
  region: string | null;
  city: string | null;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  referrer: string | null;
  action_label: string | null;
  last_event: string | null;
  last_seen_at: string | null;
  event_count: string;
  click_count: string;
}

@Injectable()
export class AnalyticsReadService {
  constructor(
    private readonly database: DatabaseService,
    private readonly secrets: SecretCryptoService,
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
              OR page.source_mini_website_id = $2
            )
        )
      )
      AND ($3::date IS NULL OR ${alias}.occurred_at >= $3::date)
      AND ($4::date IS NULL OR ${alias}.occurred_at < $4::date + interval '1 day')
      AND ${alias}.is_bot = false`;
  }

  private maskedNetworkAddress(value: string | null): string | null {
    if (!value) return null;
    const address = value.split('/')[0];
    if (address.includes('.')) {
      const parts = address.split('.');
      return parts.length === 4
        ? `${parts[0]}.${parts[1]}.${parts[2]}.xxx`
        : null;
    }
    const parts = address.split(':').filter(Boolean);
    return parts.length ? `${parts.slice(0, 4).join(':')}::` : null;
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

  async getBreakdowns(businessId: string, filters: AnalyticsFilters) {
    const values = this.values(businessId, filters);
    const predicate = this.eventPredicate();
    const group = async (
      expression: string,
      fallback: string,
      eventNames?: string[],
    ) => {
      const result = await this.database.query<{
        key: string;
        total: string;
      }>(
        `SELECT COALESCE(NULLIF(${expression}, ''), $6) AS key,
                COUNT(*)::bigint AS total
         FROM analytics_events event
         WHERE ${predicate}
           AND ($5::varchar[] IS NULL OR event.event_name = ANY($5::varchar[]))
           AND (
             $7::varchar IS NULL
             OR event.public_page_id IN (
               SELECT page.id FROM public_pages page
               WHERE page.business_id=$1 AND page.page_type=$7
             )
           )
         GROUP BY 1
         ORDER BY total DESC
         LIMIT 20`,
        [
          ...values,
          eventNames?.length ? eventNames : null,
          fallback,
          filters.pageType || null,
        ],
      );
      return result.rows.map((row) => ({
        key: row.key,
        total: Number(row.total),
      }));
    };

    const [
      devices,
      browsers,
      operatingSystems,
      countries,
      cities,
      referrers,
      campaigns,
      utmSources,
      utmMediums,
      channels,
    ] = await Promise.all([
      group('event.device_type', 'Unknown'),
      group('event.browser', 'Unknown'),
      group('event.operating_system', 'Unknown'),
      group('event.country_code', 'Unknown'),
      group('event.city', 'Unknown'),
      group(
        `COALESCE(NULLIF(${REFERRER_HOST_EXPRESSION}, ''), 'Direct')`,
        'Direct',
      ),
      group('event.utm_campaign', 'Unattributed'),
      group('event.utm_source', 'Unattributed'),
      group('event.utm_medium', 'Unattributed'),
      group('event.channel', 'other'),
    ]);
    return {
      devices,
      browsers,
      operatingSystems,
      countries,
      cities,
      referrers,
      campaigns,
      utmSources,
      utmMediums,
      channels,
    };
  }

  async getVisitors(
    businessId: string,
    filters: AnalyticsFilters,
    limit: number,
    offset: number,
  ) {
    const values = this.values(businessId, filters);
    const result = await this.database.query<{
      id: string;
      first_seen_at: string;
      last_seen_at: string;
      events: string;
      sessions: string;
      last_event: string;
      last_event_at: string;
      device_type: string | null;
      browser: string | null;
      operating_system: string | null;
      country_code: string | null;
      region: string | null;
      city: string | null;
      referrer_host: string | null;
      utm_source: string | null;
      utm_campaign: string | null;
    }>(
      `WITH filtered AS (
       SELECT event.*
         FROM analytics_events event
         WHERE ${this.eventPredicate()}
           AND (
             $5::varchar IS NULL
             OR event.public_page_id IN (
               SELECT page.id
               FROM public_pages page
               WHERE page.business_id = $1
                 AND page.page_type = $5
             )
           )
       ),
       visitor_totals AS (
         SELECT visitor_id,
                MIN(occurred_at) AS first_seen_at,
                MAX(occurred_at) AS last_seen_at,
                COUNT(*)::bigint AS events,
                COUNT(DISTINCT session_id)::bigint AS sessions
         FROM filtered
         GROUP BY visitor_id
       )
       SELECT totals.*, visitor.id,
              latest.event_name AS last_event,
              latest.occurred_at AS last_event_at,
              session.device_type, session.browser, session.operating_system,
              session.country_code, session.region, session.city,
              session.referrer_host, session.utm_source, session.utm_campaign
       FROM visitor_totals totals
       JOIN analytics_visitors visitor ON visitor.id = totals.visitor_id
       LEFT JOIN LATERAL (
         SELECT event_name, occurred_at, session_id
         FROM filtered event
         WHERE event.visitor_id = totals.visitor_id
         ORDER BY occurred_at DESC, id DESC
         LIMIT 1
       ) latest ON true
       LEFT JOIN analytics_sessions session ON session.id = latest.session_id
       ORDER BY totals.last_seen_at DESC
       LIMIT $6 OFFSET $7`,
      [
        ...values,
        filters.pageType || null,
        Math.min(Math.max(limit, 1), 100),
        Math.max(offset, 0),
      ],
    );
    return result.rows.map((row) => ({
      id: row.id,
      anonymousId: row.id.slice(0, 8).toUpperCase(),
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      eventCount: Number(row.events),
      sessionCount: Number(row.sessions),
      lastEvent: row.last_event,
      lastEventAt: row.last_event_at,
      deviceType: row.device_type,
      browser: row.browser,
      operatingSystem: row.operating_system,
      countryCode: row.country_code,
      region: row.region,
      city: row.city,
      referrer: row.referrer_host,
      utmSource: row.utm_source,
      utmCampaign: row.utm_campaign,
    }));
  }

  async getVisitorJourney(
    businessId: string,
    pageId: string | undefined,
    visitorId: string,
  ) {
    const result = await this.database.query<{
      id: string;
      event_name: string;
      occurred_at: string;
      action_label_snapshot: string | null;
      action_type_snapshot: string | null;
      page_url: string | null;
      session_id: string;
      is_conversion: boolean;
      conversion_value: string | null;
      currency: string | null;
    }>(
      `SELECT event.id, event.event_name, event.occurred_at,
              event.action_label_snapshot, event.action_type_snapshot,
              event.page_url, event.session_id, event.is_conversion,
              event.conversion_value, event.currency
       FROM analytics_events event
       JOIN public_pages page ON page.id = event.public_page_id
       WHERE event.business_id = $1
         AND event.visitor_id = $2
         AND (
           $3::uuid IS NULL
           OR page.id = $3
           OR page.source_linktree_id = $3
           OR page.source_mini_website_id = $3
         )
         AND event.is_bot = false
       ORDER BY event.occurred_at ASC, event.id ASC
       LIMIT 500`,
      [businessId, visitorId, pageId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      eventName: row.event_name,
      occurredAt: row.occurred_at,
      actionLabel: row.action_label_snapshot,
      actionType: row.action_type_snapshot,
      pageUrl: row.page_url,
      sessionId: row.session_id,
      isConversion: row.is_conversion,
      conversionValue:
        row.conversion_value === null ? null : Number(row.conversion_value),
      currency: row.currency,
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
             OR source_mini_website_id = $2
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
       -- Read straight from the event log rather than the daily rollup's
       -- unique_clickers column: that column only marks a visitor's
       -- first-ever click, so summing it over a date range would answer
       -- "new clickers in range", not "active unique clickers in range"
       -- (see getSummary).
       unique_totals AS (
         SELECT event.public_page_action_id,
                COUNT(DISTINCT event.visitor_id)::bigint AS unique_clickers
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
              COALESCE(totals.total_clicks, 0)::bigint AS total_clicks,
              COALESCE(unique_totals.unique_clickers, 0)::bigint AS unique_clickers,
              COALESCE(totals.conversions, 0)::bigint AS conversions,
              COALESCE(totals.conversion_value, 0)::numeric AS conversion_value,
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
      // The stable key the page tags its buttons with. A mini website groups a
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

  async getFunnel(businessId: string, filters: AnalyticsFilters) {
    const values = this.values(businessId, filters);
    const predicate = this.eventPredicate();
    const result = await this.database.query<{
      viewed: string;
      engaged: string;
      converted: string;
    }>(
      `WITH scoped AS (
         SELECT event.session_id, event.event_name, event.is_conversion
         FROM analytics_events event
         WHERE ${predicate}
           AND (
             $6::varchar IS NULL
             OR event.public_page_id IN (
               SELECT page.id FROM public_pages page
               WHERE page.business_id = $1 AND page.page_type = $6
             )
           )
       ),
       per_session AS (
         SELECT session_id,
                bool_or(event_name = 'page_view') AS viewed,
                bool_or(event_name = ANY($5::varchar[])) AS engaged,
                bool_or(is_conversion) AS converted
         FROM scoped
         GROUP BY session_id
       )
       SELECT
         COUNT(*) FILTER (WHERE viewed)::bigint AS viewed,
         COUNT(*) FILTER (WHERE viewed AND engaged)::bigint AS engaged,
         COUNT(*) FILTER (WHERE viewed AND converted)::bigint AS converted
       FROM per_session`,
      [...values, [...ENGAGEMENT_EVENTS], filters.pageType || null],
    );
    const row = result.rows[0];
    const viewed = Number(row.viewed);
    const engaged = Number(row.engaged);
    const converted = Number(row.converted);
    const steps = [
      { key: 'view', label: 'بینین', count: viewed },
      { key: 'engage', label: 'کارلێک', count: engaged },
      { key: 'convert', label: 'گۆڕانکاری', count: converted },
    ];
    return {
      steps,
      dropoff: [
        {
          fromKey: 'view',
          toKey: 'engage',
          rate: viewed > 0 ? ((viewed - engaged) / viewed) * 100 : 0,
        },
        {
          fromKey: 'engage',
          toKey: 'convert',
          rate: engaged > 0 ? ((engaged - converted) / engaged) * 100 : 0,
        },
      ],
    };
  }

  async getRetention(businessId: string, weeks: number) {
    const boundedWeeks = Math.min(Math.max(weeks, 1), 26);
    const [cohortResult, retainedResult] = await Promise.all([
      this.database.query<{ cohort_week: string; size: string }>(
        `SELECT date_trunc('week', first_seen_at)::date::text AS cohort_week,
                COUNT(*)::bigint AS size
         FROM analytics_visitors
         WHERE business_id = $1
           AND first_seen_at >= now() - ($2::int * interval '1 week')
         GROUP BY 1
         ORDER BY 1`,
        [businessId, boundedWeeks],
      ),
      this.database.query<{
        cohort_week: string;
        week_offset: number;
        retained: string;
      }>(
        `SELECT date_trunc('week', v.first_seen_at)::date::text AS cohort_week,
                FLOOR(EXTRACT(EPOCH FROM (
                  date_trunc('week', s.last_activity_at) - date_trunc('week', v.first_seen_at)
                )) / 604800)::int AS week_offset,
                COUNT(DISTINCT v.id)::bigint AS retained
         FROM analytics_visitors v
         JOIN analytics_sessions s
           ON s.visitor_id = v.id AND s.business_id = v.business_id AND s.is_bot = false
         WHERE v.business_id = $1
           AND v.first_seen_at >= now() - ($2::int * interval '1 week')
         GROUP BY 1, 2
         ORDER BY 1, 2`,
        [businessId, boundedWeeks],
      ),
    ]);

    const sizeByWeek = new Map<string, number>();
    for (const row of cohortResult.rows) {
      sizeByWeek.set(row.cohort_week, Number(row.size));
    }
    const grid = new Map<
      string,
      { cohortWeek: string; size: number; weeks: number[] }
    >();
    for (const [cohortWeek, size] of sizeByWeek) {
      grid.set(cohortWeek, {
        cohortWeek,
        size,
        weeks: Array.from({ length: boundedWeeks }, () => 0),
      });
    }
    for (const row of retainedResult.rows) {
      const entry = grid.get(row.cohort_week);
      if (!entry) continue;
      if (row.week_offset < 0 || row.week_offset >= boundedWeeks) continue;
      entry.weeks[row.week_offset] = Number(row.retained);
    }
    return Array.from(grid.values())
      .sort((a, b) => a.cohortWeek.localeCompare(b.cohortWeek))
      .map((entry) => ({
        cohortWeek: entry.cohortWeek,
        size: entry.size,
        rates: entry.weeks.map((count) =>
          entry.size > 0 ? (count / entry.size) * 100 : 0,
        ),
      }));
  }

  async getRealtime(businessId: string, pageId?: string) {
    const result = await this.database.query<{
      page_id: string;
      name: string;
      count: string;
    }>(
      `SELECT page.id AS page_id, page.name, COUNT(*)::bigint AS count
       FROM analytics_sessions s
       JOIN public_pages page ON page.id = s.landing_public_page_id
       WHERE s.business_id = $1
         AND s.is_bot = false
         AND s.last_activity_at > now() - interval '5 minutes'
         AND (
           $2::uuid IS NULL
           OR page.id = $2 OR page.source_linktree_id = $2 OR page.source_mini_website_id = $2
         )
       GROUP BY page.id, page.name
       ORDER BY count DESC
       LIMIT 10`,
      [businessId, pageId || null],
    );
    const activePages = result.rows.map((row) => ({
      pageId: row.page_id,
      name: row.name,
      count: Number(row.count),
    }));
    return {
      activeVisitors: activePages.reduce((sum, page) => sum + page.count, 0),
      activePages,
    };
  }

  async getLinktreeDetails(businessId: string, pageId: string) {
    const [summaryResult, breakdowns, actions, recent] = await Promise.all([
      this.database.query<{
        views: string;
        unique_views: string;
        clicks: string;
        unique_clicks: string;
      }>(
        // unique_views/unique_clicks read straight from the event log
        // rather than the daily rollup's new_visitors/new_clickers, which
        // only mark a visitor's first-ever event and would undercount a
        // returning visitor across a lifetime total (see getSummary).
        `WITH resolved_page AS (
           SELECT page.id
           FROM public_pages page
           WHERE page.business_id=$1
             AND (page.id=$2 OR page.source_linktree_id=$2 OR page.source_mini_website_id=$2)
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
           AND (page.id=$2 OR page.source_linktree_id=$2 OR page.source_mini_website_id=$2)`,
        [businessId, pageId, [...CLICK_EVENTS]],
      ),
      this.getBreakdowns(businessId, { pageId }),
      this.getActions(businessId, { pageId }),
      this.database.query<{
        id: string;
        visitor_id: string;
        event_name: string;
        occurred_at: string;
        action_label_snapshot: string | null;
      }>(
        `SELECT event.id, event.visitor_id, event.event_name,
                event.occurred_at, event.action_label_snapshot
         FROM analytics_events event
         JOIN public_pages page ON page.id=event.public_page_id
         WHERE event.business_id=$1
           AND (page.id=$2 OR page.source_linktree_id=$2 OR page.source_mini_website_id=$2)
           AND event.is_bot=false
         ORDER BY event.occurred_at DESC
         LIMIT 200`,
        [businessId, pageId],
      ),
    ]);
    const summary = summaryResult.rows[0];
    const object = (items: Array<{ key: string; total: number }>) =>
      Object.fromEntries(items.map((item) => [item.key, item.total]));
    return {
      unique_views: Number(summary.unique_views),
      unique_clicks: Number(summary.unique_clicks),
      total_views: Number(summary.views),
      total_clicks: Number(summary.clicks),
      views_by_device: object(breakdowns.devices),
      clicks_by_platform: Object.fromEntries(
        actions.map((action) => [action.label, action.totalClicks]),
      ),
      views_by_referer: object(breakdowns.referrers),
      clicks_by_referer: object(breakdowns.referrers),
      views_by_os: object(breakdowns.operatingSystems),
      clicks_by_os: object(breakdowns.operatingSystems),
      top_clicked_links: actions.map((action) => ({
        link_id: action.id,
        platform: action.actionType,
        display_name: action.label,
        click_count: action.totalClicks,
        click_count_raw: action.totalClicks,
      })),
      recent_views: recent.rows
        .filter((event) => event.event_name === 'page_view')
        .slice(0, 100)
        .map((event) => ({
          ip_address: `Visitor ${event.visitor_id.slice(0, 8).toUpperCase()}`,
          viewed_at: event.occurred_at,
        })),
      recent_clicks: recent.rows
        .filter((event) => event.event_name !== 'page_view')
        .slice(0, 100)
        .map((event) => ({
          ip_address: `Visitor ${event.visitor_id.slice(0, 8).toUpperCase()}`,
          platform: event.action_label_snapshot || event.event_name,
          clicked_at: event.occurred_at,
        })),
    };
  }

  async getCrmSummary(
    businessId: string,
    pageId?: string,
    filters: AnalyticsFilters = {},
  ) {
    const result = await this.database.query<{
      status: CrmLeadStatus;
      total: string;
      total_value: string;
    }>(
      `SELECT lead.status, COUNT(*)::bigint AS total,
              COALESCE(SUM(lead.value), 0)::numeric AS total_value
       FROM crm_leads lead
       JOIN public_pages page ON page.id = lead.public_page_id
       WHERE lead.business_id = $1
         AND (
           $2::uuid IS NULL
           OR page.id = $2
           OR page.source_linktree_id = $2
           OR page.source_mini_website_id = $2
         )
         AND ($3::date IS NULL OR lead.created_at >= $3::date)
         AND ($4::date IS NULL OR lead.created_at < $4::date + interval '1 day')
       GROUP BY lead.status`,
      [businessId, pageId || null, filters.from || null, filters.to || null],
    );
    const statuses: Record<CrmLeadStatus, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      won: 0,
      lost: 0,
    };
    let totalValue = 0;
    for (const row of result.rows) {
      statuses[row.status] = Number(row.total);
      totalValue += Number(row.total_value);
    }
    return {
      statuses,
      total: Object.values(statuses).reduce((sum, value) => sum + value, 0),
      totalValue,
    };
  }

  async getCrmLeads(
    businessId: string,
    pageId: string,
    status?: CrmLeadStatus,
    limit = 500,
    offset = 0,
  ) {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 500, 1), 1000);
    const safeOffset = Math.max(Math.trunc(offset) || 0, 0);
    const result = await this.database.query<CrmLeadRow>(
      `SELECT lead.id, lead.public_page_id, page.name AS page_name,
              page.page_type, lead.status, lead.value, lead.currency,
              lead.channel, lead.score,
              lead.created_at, lead.updated_at, lead.visitor_id,
              lead.session_id, lead.metadata, contact.encrypted_name,
              contact.encrypted_email, contact.encrypted_phone,
              COALESCE(contact.country_code, activity.country_code) AS country_code,
              COALESCE(contact.region, activity.region) AS region,
              COALESCE(contact.city, activity.city) AS city,
              activity.ip_address, activity.device_type, activity.browser,
              activity.operating_system, activity.referrer,
              activity.action_label_snapshot AS action_label,
              activity.event_name AS last_event,
              activity.occurred_at AS last_seen_at,
              COALESCE(activity.event_count, 0)::text AS event_count,
              COALESCE(activity.click_count, 0)::text AS click_count
       FROM crm_leads lead
       JOIN public_pages page ON page.id = lead.public_page_id
       LEFT JOIN crm_contacts contact ON contact.id = lead.contact_id
       LEFT JOIN LATERAL (
         SELECT event.ip_address::text AS ip_address, event.country_code,
                event.region, event.city, event.device_type, event.browser,
                event.operating_system, event.referrer,
                event.action_label_snapshot, event.event_name,
                event.occurred_at,
                COUNT(*) OVER () AS event_count,
                COUNT(*) FILTER (
                  WHERE event.event_name IN (
                    'button_click','whatsapp_click','call_click','email_click',
                    'social_click','product_click','service_click','form_submit',
                    'booking_started','checkout_started','order_completed','download'
                  )
                ) OVER () AS click_count
         FROM analytics_events event
         WHERE event.business_id = lead.business_id
           AND event.public_page_id = lead.public_page_id
           AND event.visitor_id = lead.visitor_id
           AND event.is_bot = false
         ORDER BY event.occurred_at DESC, event.id DESC
         LIMIT 1
       ) activity ON true
       WHERE lead.business_id = $1
         AND (page.id = $2 OR page.source_linktree_id = $2 OR page.source_mini_website_id = $2)
         AND ($3::varchar IS NULL OR lead.status = $3)
       ORDER BY lead.created_at DESC
       LIMIT $4 OFFSET $5`,
      [businessId, pageId, status || null, safeLimit, safeOffset],
    );
    return result.rows.map((row) => ({
      id: row.id,
      publicPageId: row.public_page_id,
      pageName: row.page_name,
      pageType: row.page_type,
      status: row.status,
      name: this.secrets.decryptText(row.encrypted_name, 'سەردانکەری نەناسراو'),
      email: this.secrets.decryptText(row.encrypted_email),
      phone: this.secrets.decryptText(row.encrypted_phone),
      hasContactDetails: Boolean(
        row.encrypted_name || row.encrypted_email || row.encrypted_phone,
      ),
      value: row.value === null ? null : Number(row.value),
      currency: row.currency,
      channel: row.channel,
      score: row.score || 0,
      captureMethod:
        row.metadata.captureMethod === 'provided' ? 'provided' : 'automatic',
      visitorId: row.visitor_id,
      sessionId: row.session_id,
      metadata: row.metadata,
      networkAddress: this.maskedNetworkAddress(row.ip_address),
      countryCode: row.country_code,
      region: row.region,
      city: row.city,
      deviceType: row.device_type,
      browser: row.browser,
      operatingSystem: row.operating_system,
      referrer: row.referrer,
      lastAction: row.action_label,
      lastEvent: row.last_event,
      lastSeenAt: row.last_seen_at,
      eventCount: Number(row.event_count),
      clickCount: Number(row.click_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updateLeadStatus(
    businessId: string,
    leadId: string,
    status: CrmLeadStatus,
  ) {
    return this.database.transaction(async (client) => {
      const current = await client.query<{ status: CrmLeadStatus }>(
        `SELECT status
         FROM crm_leads
         WHERE id = $1 AND business_id = $2
         FOR UPDATE`,
        [leadId, businessId],
      );
      if (!current.rows[0]) throw new NotFoundException('CRM lead not found');
      if (current.rows[0].status === status) return { id: leadId, status };
      await client.query(
        `UPDATE crm_leads SET status = $3, updated_at = now()
         WHERE id = $1 AND business_id = $2`,
        [leadId, businessId, status],
      );
      await client.query(
        `INSERT INTO crm_lead_status_history (
           lead_id, from_status, to_status
         ) VALUES ($1,$2,$3)`,
        [leadId, current.rows[0].status, status],
      );
      return { id: leadId, status };
    });
  }

  async addLeadNote(businessId: string, leadId: string, body: string) {
    const result = await this.database.query<{
      id: string;
      created_at: string;
    }>(
      `INSERT INTO crm_notes (lead_id, encrypted_body)
       SELECT lead.id, $3
       FROM crm_leads lead
       WHERE lead.id = $1 AND lead.business_id = $2
       RETURNING id, created_at`,
      [leadId, businessId, this.secrets.encryptText(body.trim())],
    );
    if (!result.rows[0]) throw new NotFoundException('CRM lead not found');
    return {
      id: result.rows[0].id,
      body: body.trim(),
      createdAt: result.rows[0].created_at,
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
               AND (page.id = $2 OR page.source_linktree_id = $2 OR page.source_mini_website_id = $2)
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
                 OR page.source_mini_website_id=$2::uuid
               )
           )
         )`,
      [businessId, pageId || null],
    );
    return result.rowCount || 0;
  }
}
