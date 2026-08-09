import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import type {
  AuditActorType,
  AuditLogEntry,
  AuditLogFilterOptions,
  AuditLogKind,
  AuditLogPage,
  AuditLogSummary,
  AuditOutcome,
  RequestSource,
} from '@linktree/types';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';

interface AuditRow {
  id: string;
  record_kind: AuditLogKind;
  actor_type: AuditActorType;
  actor_id: string | null;
  actor_label: string | null;
  business_id: string | null;
  business_label: string | null;
  linktree_id: string | null;
  linktree_label: string | null;
  event_type: string;
  outcome: AuditOutcome;
  resource_type: string | null;
  resource_id: string | null;
  resource_label: string | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  http_method: string | null;
  request_path: string | null;
  status_code: number | null;
  duration_ms: number | null;
  source: RequestSource | null;
  pixel_triggered: boolean;
  created_at: Date | string;
  sort_id: string;
}

interface SummaryRow {
  total: string | number;
  successful: string | number;
  failed: string | number;
  denied: string | number;
  last_24_hours: string | number;
}

const UNIFIED_SELECT = `
  SELECT
    'audit:' || e.id::text AS id,
    'audit'::text AS record_kind,
    e.actor_type,
    e.actor_id::text AS actor_id,
    COALESCE(
      e.actor_label,
      CASE
        WHEN e.actor_type = 'platform-admin' THEN pa.name
        WHEN e.actor_type = 'business' THEN actor_business.name
        WHEN e.actor_type = 'multitree' THEN 'MultiTree'
        ELSE 'Anonymous'
      END,
      'Unknown'
    ) AS actor_label,
    e.business_id::text AS business_id,
    target_business.name AS business_label,
    NULL::text AS linktree_id,
    NULL::varchar AS linktree_label,
    e.event_type,
    e.outcome,
    e.resource_type,
    e.resource_id,
    COALESCE(
      e.resource_label,
      CASE WHEN e.resource_type = 'business' THEN target_business.name END
    ) AS resource_label,
    e.request_id,
    host(e.ip_address) AS ip_address,
    e.user_agent,
    e.metadata,
    NULL::varchar AS http_method,
    NULL::varchar AS request_path,
    NULL::smallint AS status_code,
    NULL::integer AS duration_ms,
    NULL::varchar AS source,
    FALSE AS pixel_triggered,
    COALESCE(e.event_type, '') || ' ' ||
      COALESCE(e.actor_label, '') || ' ' ||
      COALESCE(e.resource_label, '') || ' ' ||
      COALESCE(e.resource_id, '') || ' ' ||
      COALESCE(host(e.ip_address), '') || ' ' ||
      COALESCE(e.request_id, '') AS search_text,
    e.created_at,
    e.id::text AS sort_id
  FROM security_audit_events e
  LEFT JOIN platform_admins pa
    ON e.actor_type = 'platform-admin' AND pa.id = e.actor_id
  LEFT JOIN businesses actor_business
    ON e.actor_type = 'business' AND actor_business.id = e.actor_id
  LEFT JOIN businesses target_business
    ON target_business.id = e.business_id

  UNION ALL

  SELECT
    'request:' || r.id::text AS id,
    'request'::text AS record_kind,
    r.actor_type,
    r.actor_id::text AS actor_id,
    COALESCE(r.actor_label, 'Anonymous') AS actor_label,
    COALESCE(r.business_id, request_lt.business_id)::text AS business_id,
    b.name AS business_label,
    request_lt.id::text AS linktree_id,
    request_lt.name AS linktree_label,
    'http.' || lower(r.method) AS event_type,
    CASE
      WHEN r.status_code IN (401, 403) THEN 'denied'
      WHEN r.status_code >= 400 THEN 'failure'
      ELSE 'success'
    END AS outcome,
    'http-request'::varchar AS resource_type,
    COALESCE(r.route_pattern, r.request_path) AS resource_id,
    r.method || ' ' || COALESCE(r.route_pattern, r.request_path) AS resource_label,
    r.request_id,
    host(r.ip_address) AS ip_address,
    r.user_agent,
    jsonb_strip_nulls(jsonb_build_object(
      'method', r.method,
      'path', r.request_path,
      'route', r.route_pattern,
      'statusCode', r.status_code,
      'durationMs', r.duration_ms,
      'source', r.source,
      'subdomain', r.subdomain
    )) AS metadata,
    r.method AS http_method,
    r.request_path,
    r.status_code,
    r.duration_ms,
    r.source,
    FALSE AS pixel_triggered,
    COALESCE('http.' || lower(r.method), '') || ' ' ||
      COALESCE(r.actor_label, '') || ' ' ||
      COALESCE(r.route_pattern, '') || ' ' ||
      COALESCE(r.request_path, '') || ' ' ||
      COALESCE(host(r.ip_address), '') || ' ' ||
      COALESCE(r.request_id, '') AS search_text,
    r.created_at,
    r.id::text AS sort_id
  FROM http_request_events r
  LEFT JOIN linktrees request_lt
    ON r.source = 'frontend' AND r.request_path = '/' || request_lt.uid
  LEFT JOIN businesses b
    ON b.id = COALESCE(r.business_id, request_lt.business_id)

  UNION ALL

  SELECT
    'analytics:' || ae.id::text AS id,
    CASE WHEN ae.event_name = 'page_view' THEN 'view' ELSE 'click' END::text AS record_kind,
    'anonymous'::varchar AS actor_type,
    NULL::text AS actor_id,
    'Visitor'::varchar AS actor_label,
    ae.business_id::text AS business_id,
    b.name AS business_label,
    COALESCE(pp.source_linktree_id, pp.source_mini_website_id)::text AS linktree_id,
    pp.name AS linktree_label,
    CASE
      WHEN ae.event_name = 'page_view' THEN 'analytics.page_view'
      ELSE 'analytics.link_click'
    END::varchar AS event_type,
    'success'::varchar AS outcome,
    CASE WHEN ae.public_page_action_id IS NULL THEN 'public-page' ELSE 'public-page-action' END::varchar AS resource_type,
    COALESCE(ae.public_page_action_id, ae.public_page_id)::text AS resource_id,
    COALESCE(ae.action_label_snapshot, pp.name) AS resource_label,
    ae.event_id::text AS request_id,
    host(ae.ip_address) AS ip_address,
    ae.user_agent,
    jsonb_strip_nulls(jsonb_build_object(
      'pageType', pp.page_type,
      'slug', pp.slug,
      'eventName', ae.event_name,
      'actionType', ae.action_type_snapshot,
      'referer', ae.referrer,
      'device', ae.device_type,
      'browser', ae.browser,
      'os', ae.operating_system,
      'country', ae.country_code,
      'city', ae.city,
      'utmSource', ae.utm_source,
      'utmCampaign', ae.utm_campaign,
      'isConversion', ae.is_conversion
    )) AS metadata,
    NULL::varchar AS http_method,
    CASE
      WHEN pp.page_type = 'linktree' THEN '/linktree/' || pp.slug
      ELSE '/bio/' || pp.slug
    END AS request_path,
    NULL::smallint AS status_code,
    NULL::integer AS duration_ms,
    'frontend'::varchar AS source,
    EXISTS (
      SELECT 1 FROM marketing_event_outbox outbox
      WHERE outbox.analytics_event_id = ae.id
        AND outbox.browser_dispatched = true
    ) AS pixel_triggered,
    COALESCE(b.name, '') || ' ' || COALESCE(pp.name, '') || ' ' ||
      COALESCE(pp.slug, '') || ' ' || COALESCE(ae.action_label_snapshot, '') || ' ' ||
      COALESCE(ae.event_name, '') || ' ' || COALESCE(host(ae.ip_address), '') || ' ' ||
      ae.event_id::text AS search_text,
    ae.occurred_at AS created_at,
    ae.id::text AS sort_id
  FROM analytics_events ae
  INNER JOIN public_pages pp ON pp.id = ae.public_page_id
  INNER JOIN businesses b ON b.id = ae.business_id

  UNION ALL

  SELECT
    'integration:' || attempt.id::text AS id,
    'integration'::text AS record_kind,
    'multitree'::varchar AS actor_type,
    NULL::text AS actor_id,
    'TikTok Events API'::varchar AS actor_label,
    outbox.business_id::text AS business_id,
    b.name AS business_label,
    COALESCE(page.source_linktree_id, page.source_mini_website_id)::text AS linktree_id,
    page.name AS linktree_label,
    'integration.tiktok.events_api.' || lower(outbox.event_name) AS event_type,
    CASE WHEN attempt.outcome='success' THEN 'success' ELSE 'failure' END::varchar AS outcome,
    'integration-delivery'::varchar AS resource_type,
    outbox.external_event_id::text AS resource_id,
    outbox.event_name AS resource_label,
    outbox.external_event_id::text AS request_id,
    NULL::text AS ip_address,
    NULL::text AS user_agent,
    jsonb_strip_nulls(jsonb_build_object(
      'provider', outbox.provider,
      'attempt', attempt.attempt_number,
      'destinationId', outbox.destination_id,
      'statusCode', attempt.status_code,
      'durationMs', attempt.duration_ms,
      'error', attempt.response_summary,
      'providerRequestId', attempt.provider_request_id
    )) AS metadata,
    'POST'::varchar AS http_method,
    'TikTok Events API'::varchar AS request_path,
    attempt.status_code,
    attempt.duration_ms,
    'backend'::varchar AS source,
    FALSE AS pixel_triggered,
    COALESCE(b.name, '') || ' ' || COALESCE(page.name, '') || ' ' ||
      COALESCE(outbox.event_name, '') || ' ' || outbox.external_event_id::text ||
      ' TikTok Events API' AS search_text,
    attempt.created_at,
    attempt.id::text AS sort_id
  FROM marketing_delivery_attempts attempt
  JOIN marketing_event_outbox outbox ON outbox.id=attempt.outbox_id
  JOIN analytics_events event ON event.id=outbox.analytics_event_id
  JOIN public_pages page ON page.id=event.public_page_id
  LEFT JOIN businesses b ON b.id=outbox.business_id
`;

@Injectable()
export class AuditLogService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async getPage(query: AuditLogQueryDto): Promise<AuditLogPage> {
    const params: unknown[] = [];
    const where = this.buildWhere(query, params);
    const page = query.page || 1;
    const pageSize = query.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const orderBy = this.buildOrderBy(query.sort);

    const [itemsResult, summary, eventTypes] = await Promise.all([
      this.databaseService.query<AuditRow>(
        `WITH unified AS (${UNIFIED_SELECT})
         SELECT * FROM unified u
         ${where}
         ORDER BY ${orderBy}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset],
      ),
      this.getSummary(where, params, query),
      this.getEventTypes(),
    ]);

    return {
      items: itemsResult.rows.map((row) => this.mapRow(row)),
      summary,
      eventTypes,
      pagination: {
        page,
        pageSize,
        totalItems: summary.total,
        totalPages: Math.max(1, Math.ceil(summary.total / pageSize)),
      },
    };
  }

  private async getSummary(
    where: string,
    params: unknown[],
    query: AuditLogQueryDto,
  ): Promise<AuditLogSummary> {
    const cacheKey = `platform:audit:summary:${this.cacheHash(where, params)}`;
    const cached = await this.redisService?.get<AuditLogSummary>(cacheKey);
    if (cached) return cached;

    let summary: AuditLogSummary;
    if (
      !query.search &&
      !query.eventType &&
      !query.from &&
      !query.to &&
      !query.businessId &&
      !query.linktreeId &&
      query.kind !== 'tiktok-pixel'
    ) {
      try {
        summary = await this.getSummaryFromRollups(query);
      } catch {
        summary = await this.getExactSummary(where, params);
      }
    } else {
      summary = await this.getExactSummary(where, params);
    }
    await this.redisService?.set(cacheKey, summary, 10);
    return summary;
  }

  private async getExactSummary(
    where: string,
    params: unknown[],
  ): Promise<AuditLogSummary> {
    const result = await this.databaseService.query<SummaryRow>(
      `WITH unified AS (${UNIFIED_SELECT})
       SELECT
         COUNT(*)::bigint AS total,
         COUNT(*) FILTER (WHERE u.outcome = 'success')::bigint AS successful,
         COUNT(*) FILTER (WHERE u.outcome = 'failure')::bigint AS failed,
         COUNT(*) FILTER (WHERE u.outcome = 'denied')::bigint AS denied,
         COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '24 hours')::bigint AS last_24_hours
       FROM unified u ${where}`,
      params,
    );
    return this.mapSummary(result.rows[0]);
  }

  private async getSummaryFromRollups(
    query: AuditLogQueryDto,
  ): Promise<AuditLogSummary> {
    const includeRequests = !query.kind || query.kind === 'request';
    const includeAudits =
      (!query.kind || query.kind === 'audit') &&
      !query.source &&
      !query.httpMethod;
    const includeViews =
      (!query.kind || query.kind === 'view') &&
      (!query.source || query.source === 'frontend') &&
      !query.httpMethod &&
      (!query.actorType || query.actorType === 'anonymous') &&
      (!query.outcome || query.outcome === 'success');
    const includeClicks =
      (!query.kind || query.kind === 'click') &&
      (!query.source || query.source === 'frontend') &&
      !query.httpMethod &&
      (!query.actorType || query.actorType === 'anonymous') &&
      (!query.outcome || query.outcome === 'success');
    const includeIntegrations =
      (!query.kind ||
        query.kind === 'integration' ||
        query.kind === 'tiktok-events-api') &&
      (!query.source || query.source === 'backend') &&
      (!query.httpMethod || query.httpMethod === 'POST') &&
      (!query.actorType || query.actorType === 'multitree');

    const requestParams: unknown[] = [];
    const requestClauses: string[] = [];
    const addRequest = (column: string, value?: string) => {
      if (!value) return;
      requestParams.push(value);
      requestClauses.push(`${column} = $${requestParams.length}`);
    };
    addRequest('source', query.source);
    addRequest('method', query.httpMethod);
    addRequest('actor_type', query.actorType);
    addRequest('outcome', query.outcome);
    const requestWhere = requestClauses.length
      ? `WHERE ${requestClauses.join(' AND ')}`
      : '';

    const auditParams: unknown[] = [];
    const auditClauses: string[] = [];
    const addAudit = (column: string, value?: string) => {
      if (!value) return;
      auditParams.push(value);
      auditClauses.push(`${column} = $${auditParams.length}`);
    };
    addAudit('actor_type', query.actorType);
    addAudit('outcome', query.outcome);
    const auditWhere = auditClauses.length
      ? `AND ${auditClauses.join(' AND ')}`
      : '';

    const empty: SummaryRow = {
      total: 0,
      successful: 0,
      failed: 0,
      denied: 0,
      last_24_hours: 0,
    };
    const [
      requestTotals,
      requestRecent,
      auditTotals,
      analyticsTotals,
      analyticsRecent,
      integrationTotals,
    ] = await Promise.all([
      includeRequests
        ? this.databaseService.query<SummaryRow>(
            `SELECT
               COALESCE(SUM(total), 0)::bigint AS total,
               COALESCE(SUM(total) FILTER (WHERE outcome = 'success'), 0)::bigint AS successful,
               COALESCE(SUM(total) FILTER (WHERE outcome = 'failure'), 0)::bigint AS failed,
               COALESCE(SUM(total) FILTER (WHERE outcome = 'denied'), 0)::bigint AS denied,
               0::bigint AS last_24_hours
             FROM http_request_event_daily_stats
             ${requestWhere}`,
            requestParams,
          )
        : Promise.resolve({ rows: [empty] }),
      includeRequests
        ? this.databaseService.query<{ total: number }>(
            `SELECT COUNT(*)::bigint AS total
             FROM http_request_events
             WHERE created_at >= NOW() - INTERVAL '24 hours'
             ${requestClauses.length ? `AND ${requestClauses.map((clause) => clause.replace('outcome', `(CASE WHEN status_code IN (401, 403) THEN 'denied' WHEN status_code >= 400 THEN 'failure' ELSE 'success' END)`)).join(' AND ')}` : ''}`,
            requestParams,
          )
        : Promise.resolve({ rows: [{ total: 0 }] }),
      includeAudits
        ? this.databaseService.query<SummaryRow>(
            `SELECT
               COUNT(*)::bigint AS total,
               COUNT(*) FILTER (WHERE outcome = 'success')::bigint AS successful,
               COUNT(*) FILTER (WHERE outcome = 'failure')::bigint AS failed,
               COUNT(*) FILTER (WHERE outcome = 'denied')::bigint AS denied,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::bigint AS last_24_hours
             FROM security_audit_events
             WHERE TRUE ${auditWhere}`,
            auditParams,
          )
        : Promise.resolve({ rows: [empty] }),
      includeViews || includeClicks
        ? this.databaseService.query<{
            views: string | number;
            clicks: string | number;
          }>(
            `SELECT
               COALESCE(SUM(total_views), 0)::bigint AS views,
               COALESCE(SUM(total_clicks), 0)::bigint AS clicks
             FROM analytics_page_daily`,
          )
        : Promise.resolve({ rows: [{ views: 0, clicks: 0 }] }),
      includeViews || includeClicks
        ? this.databaseService.query<{
            views: string | number;
            clicks: string | number;
          }>(
            `SELECT
               COUNT(*) FILTER (
                 WHERE event_name='page_view'
               )::bigint AS views,
               COUNT(*) FILTER (
                 WHERE event_name<>'page_view'
               )::bigint AS clicks
             FROM analytics_events
             WHERE occurred_at >= NOW() - INTERVAL '24 hours'
               AND is_bot=false`,
          )
        : Promise.resolve({ rows: [{ views: 0, clicks: 0 }] }),
      includeIntegrations
        ? this.databaseService.query<SummaryRow>(
            `SELECT
               COUNT(*)::bigint AS total,
               COUNT(*) FILTER (WHERE attempt.outcome = 'success')::bigint AS successful,
               COUNT(*) FILTER (WHERE attempt.outcome <> 'success')::bigint AS failed,
               0::bigint AS denied,
               COUNT(*) FILTER (WHERE attempt.created_at >= NOW() - INTERVAL '24 hours')::bigint AS last_24_hours
             FROM marketing_delivery_attempts attempt
             ${query.outcome ? `WHERE (CASE WHEN attempt.outcome='success' THEN 'success' ELSE 'failure' END) = $1` : ''}`,
            query.outcome ? [query.outcome] : [],
          )
        : Promise.resolve({ rows: [empty] }),
    ]);

    const request = this.mapSummary(requestTotals.rows[0]);
    const audit = this.mapSummary(auditTotals.rows[0]);
    const integration = this.mapSummary(integrationTotals.rows[0]);
    const analytics = analyticsTotals.rows[0];
    const recentAnalytics = analyticsRecent.rows[0];
    const viewTotal = includeViews ? this.toNumber(analytics?.views) : 0;
    const clickTotal = includeClicks ? this.toNumber(analytics?.clicks) : 0;
    const recentViews = includeViews
      ? this.toNumber(recentAnalytics?.views)
      : 0;
    const recentClicks = includeClicks
      ? this.toNumber(recentAnalytics?.clicks)
      : 0;
    return {
      total:
        request.total +
        audit.total +
        integration.total +
        viewTotal +
        clickTotal,
      successful:
        request.successful +
        audit.successful +
        integration.successful +
        viewTotal +
        clickTotal,
      failed: request.failed + audit.failed + integration.failed,
      denied: request.denied + audit.denied + integration.denied,
      last24Hours:
        this.toNumber(requestRecent.rows[0]?.total) +
        audit.last24Hours +
        integration.last24Hours +
        recentViews +
        recentClicks,
    };
  }

  private async getEventTypes(): Promise<
    Array<{ value: string; count: number }>
  > {
    const cacheKey = 'platform:audit:event-types:v1';
    const cached =
      await this.redisService?.get<Array<{ value: string; count: number }>>(
        cacheKey,
      );
    if (cached) return cached;

    const result = await this.databaseService.query<{
      value: string;
      count: string | number;
    }>(
      `WITH facets AS (
         SELECT event_type AS value, COUNT(*)::bigint AS count
         FROM security_audit_events
         WHERE created_at >= NOW() - INTERVAL '90 days'
         GROUP BY event_type
         UNION ALL
         SELECT 'http.' || lower(method), SUM(total)::bigint
         FROM http_request_event_daily_stats
         WHERE event_day >= CURRENT_DATE - 90
         GROUP BY method
         UNION ALL
         SELECT 'analytics.page_view', COALESCE(SUM(total_views), 0)::bigint
         FROM analytics_page_daily
         UNION ALL
         SELECT 'analytics.link_click', COALESCE(SUM(total_clicks), 0)::bigint
         FROM analytics_page_daily
         UNION ALL
         SELECT 'integration.tiktok.events_api.' || lower(outbox.event_name), COUNT(*)::bigint
         FROM marketing_delivery_attempts attempt
         JOIN marketing_event_outbox outbox ON outbox.id=attempt.outbox_id
         WHERE attempt.created_at >= NOW() - INTERVAL '90 days'
         GROUP BY outbox.event_name
       )
       SELECT value, SUM(count)::bigint AS count
       FROM facets
       GROUP BY value
       ORDER BY count DESC, value ASC
       LIMIT 100`,
    );
    const eventTypes = result.rows.map((row) => ({
      value: row.value,
      count: this.toNumber(row.count),
    }));
    await this.redisService?.set(cacheKey, eventTypes, 60);
    return eventTypes;
  }

  private cacheHash(where: string, params: unknown[]): string {
    return createHash('sha256')
      .update(JSON.stringify([where, params]))
      .digest('hex')
      .slice(0, 24);
  }

  async getFilterOptions(businessId?: string): Promise<AuditLogFilterOptions> {
    const [businessesResult, linktreesResult] = await Promise.all([
      this.databaseService.query<{ id: string; name: string }>(
        `SELECT id::text, name
         FROM businesses
         ORDER BY name ASC, id ASC
         LIMIT 1000`,
      ),
      businessId
        ? this.databaseService.query<{
            id: string;
            business_id: string;
            name: string;
            uid: string;
          }>(
            `SELECT id::text, business_id::text, name, uid
             FROM linktrees
             WHERE business_id = $1::uuid
             ORDER BY name ASC, id ASC
             LIMIT 1000`,
            [businessId],
          )
        : // Same row shape as the query above so the union does not widen to `any`.
          Promise.resolve({
            rows: [] as Array<{
              id: string;
              business_id: string;
              name: string;
              uid: string;
            }>,
          }),
    ]);

    return {
      businesses: businessesResult.rows.map((row) => ({
        id: row.id,
        label: row.name,
      })),
      linktrees: linktreesResult.rows.map((row) => ({
        id: row.id,
        businessId: row.business_id,
        label: row.name,
        uid: row.uid,
      })),
    };
  }

  async getOne(id: string): Promise<AuditLogEntry> {
    if (
      !/^(audit|request|integration):\d+$/.test(id) &&
      !/^(view|click):[0-9a-f-]{36}$/i.test(id)
    ) {
      throw new NotFoundException('Activity event not found');
    }
    const [kind, sourceId] = id.split(':');
    const result = await this.databaseService.query<AuditRow>(
      `WITH unified AS (${UNIFIED_SELECT})
       SELECT * FROM unified u
       WHERE u.record_kind = $1 AND u.sort_id = $2
       LIMIT 1`,
      [kind, sourceId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Activity event not found');
    return this.mapRow(row);
  }

  async getExportRows(query: AuditLogQueryDto): Promise<AuditLogEntry[]> {
    const params: unknown[] = [];
    const where = this.buildWhere(query, params);
    const result = await this.databaseService.query<AuditRow>(
      `WITH unified AS (${UNIFIED_SELECT})
       SELECT * FROM unified u
       ${where}
       ORDER BY ${this.buildOrderBy(query.sort)}
       LIMIT 5000`,
      params,
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  private buildWhere(query: AuditLogQueryDto, params: unknown[]): string {
    const clauses: string[] = [];
    const add = (value: unknown, sql: (parameter: string) => string) => {
      params.push(value);
      clauses.push(sql(`$${params.length}`));
    };

    const search = query.search?.trim();
    if (search) {
      const escapedSearch = search.replace(/[\\%_]/g, '\\$&');
      add(
        `%${escapedSearch}%`,
        (parameter) => `u.search_text ILIKE ${parameter} ESCAPE '\\'`,
      );
    }
    if (query.actorType) add(query.actorType, (p) => `u.actor_type = ${p}`);
    if (query.outcome) add(query.outcome, (p) => `u.outcome = ${p}`);
    if (query.kind === 'tiktok-pixel') {
      clauses.push('u.pixel_triggered = TRUE');
    } else if (query.kind === 'tiktok-events-api') {
      clauses.push(`u.record_kind = 'integration'`);
    } else if (query.kind) {
      add(query.kind, (p) => `u.record_kind = ${p}`);
    }
    if (query.businessId) add(query.businessId, (p) => `u.business_id = ${p}`);
    if (query.linktreeId) add(query.linktreeId, (p) => `u.linktree_id = ${p}`);
    if (query.source) add(query.source, (p) => `u.source = ${p}`);
    if (query.httpMethod) add(query.httpMethod, (p) => `u.http_method = ${p}`);
    if (query.eventType) add(query.eventType, (p) => `u.event_type = ${p}`);
    if (query.from) add(query.from, (p) => `u.created_at >= ${p}::timestamptz`);
    if (query.to) add(query.to, (p) => `u.created_at <= ${p}::timestamptz`);
    return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  }

  private buildOrderBy(sort?: string): string {
    if (sort === 'oldest') {
      return 'u.created_at ASC, u.record_kind, u.sort_id ASC';
    }
    if (sort === 'business-first') {
      return `CASE WHEN u.business_id IS NOT NULL THEN 0 ELSE 1 END,
        u.created_at DESC, u.record_kind, u.sort_id DESC`;
    }
    if (sort === 'views-first') {
      return `CASE WHEN u.record_kind = 'view' THEN 0 ELSE 1 END,
        u.created_at DESC, u.record_kind, u.sort_id DESC`;
    }
    if (sort === 'clicks-first') {
      return `CASE WHEN u.record_kind = 'click' THEN 0 ELSE 1 END,
        u.created_at DESC, u.record_kind, u.sort_id DESC`;
    }
    if (sort === 'requests-first') {
      return `CASE WHEN u.record_kind = 'request' THEN 0 ELSE 1 END,
        u.created_at DESC, u.record_kind, u.sort_id DESC`;
    }
    if (sort === 'integrations-first') {
      return `CASE WHEN u.record_kind = 'integration' THEN 0 ELSE 1 END,
        u.created_at DESC, u.record_kind, u.sort_id DESC`;
    }
    if (sort === 'slowest-first') {
      return 'u.duration_ms DESC NULLS LAST, u.created_at DESC, u.record_kind, u.sort_id DESC';
    }
    const outcome = {
      'failure-first': 'failure',
      'denied-first': 'denied',
      'success-first': 'success',
    }[sort || 'newest'];
    const priority = outcome
      ? `CASE WHEN u.outcome = '${outcome}' THEN 0 ELSE 1 END, `
      : '';
    return `${priority}u.created_at DESC, u.record_kind, u.sort_id DESC`;
  }

  private mapRow(row: AuditRow): AuditLogEntry {
    return {
      id: String(row.id),
      kind: row.record_kind,
      actorType: row.actor_type,
      actorId: row.actor_id,
      actorLabel: row.actor_label || 'Unknown',
      businessId: row.business_id,
      businessLabel: row.business_label,
      linktreeId: row.linktree_id,
      linktreeLabel: row.linktree_label,
      eventType: row.event_type,
      outcome: row.outcome,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      resourceLabel: row.resource_label,
      requestId: row.request_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata:
        row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
      httpMethod: row.http_method,
      requestPath: row.request_path,
      statusCode: row.status_code === null ? null : Number(row.status_code),
      durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
      source: row.source,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(row.created_at).toISOString(),
    };
  }

  private mapSummary(row?: SummaryRow): AuditLogSummary {
    return {
      total: this.toNumber(row?.total),
      successful: this.toNumber(row?.successful),
      failed: this.toNumber(row?.failed),
      denied: this.toNumber(row?.denied),
      last24Hours: this.toNumber(row?.last_24_hours),
    };
  }

  private toNumber(value: string | number | undefined): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
