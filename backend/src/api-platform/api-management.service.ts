import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { EntitlementService } from '../billing/entitlement.service';
import { SecretCryptoService } from '../auth/secret-crypto.service';
import type { SessionUser } from '../auth/session.service';
import { CommunicationService } from '../communications/communication.service';
import { isUniqueViolation } from '../common/postgres-error';
import { API_SCOPES, isApiScope } from './api-platform.types';
import {
  CreateApiClientDto,
  CreateApiVersionDto,
  CreateWebhookDto,
  UpdateRatePolicyDto,
} from './dto/api-platform.dto';
import { validateWebhookUrl } from './webhook-security';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { pageMetadata } from '../common/dto/admin-list-query.dto';
import type { ApiManagementQueryDto } from './dto/api-management-query.dto';

const WEBHOOK_EVENTS = new Set([
  'linktree.created',
  'linktree.updated',
  'linktree.cloned',
  'linktree.scheduled',
  'linktree.published',
  'linktree.unpublished',
  'linktree.deleted',
  'asset.processed',
  'campaign.expired',
  'analytics.daily_summary',
  'analytics.export_ready',
  'analytics.threshold_reached',
]);

/**
 * Row shapes for the API-management dashboard queries.
 *
 * Type aliases rather than interfaces: pg constrains the row generic to
 * `QueryResultRow`, and only aliases pick up the implicit index signature.
 */
type ApiClientSummaryRow = {
  id: string;
  name: string;
  business: string;
  clientId: string;
  environment: string;
  status: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  lastRotatedAt: Date | null;
  ipRestricted: boolean;
};

type WebhookEndpointSummaryRow = {
  id: string;
  name: string;
  business: string;
  encrypted_url: Buffer | null;
  encrypted_signing_secret: Buffer | null;
  status: string;
  consecutive_failures: number | string;
  lastDeliveryAt: Date | null;
  events: string[];
  successRate: string | number;
};

type ApiVersionRow = {
  id: string;
  version: string;
  status: string;
  releasedAt: Date | null;
  retirementAt: Date | null;
  lastNotifiedAt: Date | null;
  notificationCount: number;
  clients: number;
};

type CatalogGroupRow = {
  id: string;
  name: string;
  description: string | null;
  scope: string | null;
  endpoints: number | null;
  operations: unknown;
  enabled: boolean;
};

type ApiVersionRecordRow = {
  id: string;
  version: string;
  status: string;
  releasedAt: Date | null;
  retirementAt: Date | null;
};

@Injectable()
export class ApiManagementService {
  private readonly pepper: string;
  private readonly rootDomain: string;

  constructor(
    private readonly database: DatabaseService,
    private readonly entitlements: EntitlementService,
    private readonly crypto: SecretCryptoService,
    private readonly deliveries: WebhookDeliveryService,
    private readonly communications: CommunicationService,
    config: ConfigService,
  ) {
    this.pepper =
      config.get<string>('API_KEY_PEPPER') ||
      config.get<string>('SESSION_SECRET') ||
      '';
    this.rootDomain = config.get<string>('ROOT_DOMAIN', 'localhost');
  }

  async getDashboard(query: ApiManagementQueryDto) {
    const search = query.search?.trim() || '';
    const pattern = `%${search}%`;
    const offset = (query.page - 1) * query.limit;
    const [
      businessResult,
      clientSummary,
      webhookSummary,
      policySummary,
      versionResult,
      catalogResult,
    ] = await Promise.all([
      this.database.query<{ id: string; name: string; subdomain: string }>(
        `SELECT id::text,name,subdomain FROM businesses
         WHERE status='active' ORDER BY name LIMIT 100`,
      ),
      this.database.query<{
        active: number;
        expiring: number;
        expiringKeysPercent: number;
        ipRestrictedPercent: number;
        rotatedPercent: number;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE status='active' AND expires_at>now())::int AS active,
           COUNT(*) FILTER (WHERE status='active' AND expires_at>now()
             AND expires_at<=now()+interval '30 days')::int AS expiring,
           COALESCE(ROUND(100.0*COUNT(*) FILTER (WHERE status='active' AND expires_at>now())
             /NULLIF(COUNT(*) FILTER (WHERE status='active'),0)),0)::int AS "expiringKeysPercent",
           COALESCE(ROUND(100.0*COUNT(*) FILTER (WHERE status='active'
             AND cardinality(ip_allowlist)>0)/NULLIF(COUNT(*) FILTER (WHERE status='active'),0)),0)::int
             AS "ipRestrictedPercent",
           COALESCE(ROUND(100.0*COUNT(*) FILTER (WHERE status='active'
             AND last_rotated_at>=now()-interval '90 days')
             /NULLIF(COUNT(*) FILTER (WHERE status='active'),0)),0)::int AS "rotatedPercent"
         FROM api_clients WHERE status<>'revoked'`,
      ),
      this.database.query<{ attention: number; signedPercent: number }>(
        `SELECT
           COUNT(*) FILTER (WHERE status='disabled'
             OR (status='active' AND consecutive_failures>0))::int AS attention,
           COALESCE(ROUND(100.0*COUNT(*) FILTER (WHERE encrypted_signing_secret IS NOT NULL)
             /NULLIF(COUNT(*),0)),0)::int AS "signedPercent"
         FROM api_webhook_endpoints`,
      ),
      this.database.query<{ nearQuota: number }>(
        `${this.policyCte()}
         SELECT COUNT(*) FILTER (WHERE monthly>0
           AND LEAST(100,ROUND(100.0*used/monthly))>=warning_threshold)::int AS "nearQuota"
         FROM policy_rows`,
      ),
      this.database.query<ApiVersionRow>(
        `SELECT version.id::text,version.version,version.status,
                version.released_at AS "releasedAt",version.retirement_at AS "retirementAt",
                version.last_notified_at AS "lastNotifiedAt",version.notification_count AS "notificationCount",
                CASE WHEN version.status='current' THEN (SELECT COUNT(*)::int FROM api_clients WHERE status='active') ELSE 0 END AS clients
         FROM api_versions version ORDER BY version.released_at DESC`,
      ),
      this.database.query<CatalogGroupRow>(
        `SELECT id,name,description,scope_expression AS scope,endpoint_count AS endpoints,
                operations,enabled FROM api_catalog_groups ORDER BY display_order`,
      ),
    ]);
    const clientResult =
      query.section === 'clients'
        ? await this.database.query<ApiClientSummaryRow & { total: string }>(
            `SELECT client.id::text,client.name,business.name AS business,
                    client.client_id AS "clientId",client.environment,
                    CASE WHEN client.expires_at<=now() THEN 'expired' ELSE client.status END AS status,
                    client.scopes,client.last_used_at AS "lastUsedAt",
                    client.expires_at AS "expiresAt",client.last_rotated_at AS "lastRotatedAt",
                    cardinality(client.ip_allowlist)>0 AS "ipRestricted",
                    COUNT(*) OVER()::text AS total
             FROM api_clients client JOIN businesses business ON business.id=client.business_id
             WHERE client.status<>'revoked'
               AND ($1='' OR client.name ILIKE $1 OR client.client_id ILIKE $1 OR business.name ILIKE $1)
               AND ($2::text IS NULL OR CASE WHEN client.expires_at<=now() THEN 'expired' ELSE client.status END=$2)
             ORDER BY client.created_at DESC LIMIT $3 OFFSET $4`,
            [pattern, query.status || null, query.limit, offset],
          )
        : { rows: [] as Array<ApiClientSummaryRow & { total: string }> };
    const webhookResult =
      query.section === 'webhooks'
        ? await this.database.query<
            WebhookEndpointSummaryRow & { total: string }
          >(
            `SELECT endpoint.id::text,endpoint.name,business.name AS business,
                    endpoint.encrypted_url,endpoint.encrypted_signing_secret,endpoint.status,endpoint.consecutive_failures,
                    endpoint.last_delivery_at AS "lastDeliveryAt",
                    COALESCE(array_agg(subscription.event_type ORDER BY subscription.event_type)
                      FILTER(WHERE subscription.event_type IS NOT NULL),'{}') AS events,
                    COALESCE(stats.success_rate,100)::numeric AS "successRate",
                    COUNT(*) OVER()::text AS total
             FROM api_webhook_endpoints endpoint
             JOIN businesses business ON business.id=endpoint.business_id
             LEFT JOIN api_webhook_subscriptions subscription ON subscription.endpoint_id=endpoint.id
             LEFT JOIN LATERAL (
               SELECT ROUND(100.0*COUNT(*) FILTER(WHERE status='delivered')/NULLIF(COUNT(*),0),1) AS success_rate
               FROM api_webhook_deliveries delivery
               WHERE delivery.endpoint_id=endpoint.id AND delivery.created_at>=now()-interval '30 days'
             ) stats ON true
             WHERE ($1='' OR endpoint.name ILIKE $1 OR business.name ILIKE $1)
               AND ($2::text IS NULL OR CASE
                 WHEN endpoint.status='disabled' THEN 'disabled'
                 WHEN endpoint.status='paused' THEN 'paused'
                 WHEN endpoint.status='active' AND endpoint.consecutive_failures=0 THEN 'healthy'
                 ELSE 'attention' END=$2)
             GROUP BY endpoint.id,business.name,stats.success_rate
             ORDER BY endpoint.created_at DESC LIMIT $3 OFFSET $4`,
            [pattern, query.status || null, query.limit, offset],
          )
        : {
            rows: [] as Array<WebhookEndpointSummaryRow & { total: string }>,
          };
    const policyResult =
      query.section === 'policies'
        ? await this.database.query<
            Record<string, unknown> & { total: string }
          >(
            `${this.policyCte()}
             SELECT id,business,plan,"perMinute",monthly,clients,webhooks,
                    "warningThreshold","autoSuspend",
                    CASE WHEN monthly>0 THEN LEAST(100,ROUND(100.0*used/monthly))::int ELSE 0 END AS usage,
                    COUNT(*) OVER()::text AS total
             FROM policy_rows
             WHERE ($1='' OR business ILIKE $1 OR plan ILIKE $1)
             ORDER BY business LIMIT $2 OFFSET $3`,
            [pattern, query.limit, offset],
          )
        : { rows: [] as Array<Record<string, unknown> & { total: string }> };
    const webhooks = webhookResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      business: row.business,
      url: this.crypto.decryptText(row.encrypted_url),
      events: row.events,
      status:
        row.status === 'disabled'
          ? 'disabled'
          : row.status === 'paused'
            ? 'paused'
            : row.status === 'active' && Number(row.consecutive_failures) === 0
              ? 'healthy'
              : 'attention',
      lastDelivery: row.lastDeliveryAt,
      successRate: Number(row.successRate),
    }));
    const clientTotals = clientSummary.rows[0];
    const webhookTotals = webhookSummary.rows[0];
    const paginationTotal = (rows: Array<{ total: string }>) =>
      Number(rows[0]?.total || 0);
    const clients = clientResult.rows.map(({ total: _total, ...item }) => item);
    const policies = policyResult.rows.map(
      ({ total: _total, ...item }) => item,
    );
    return {
      summary: {
        activeClients: clientTotals?.active || 0,
        expiringClients: clientTotals?.expiring || 0,
        webhookAttention: webhookTotals?.attention || 0,
        businessesNearQuota: policySummary.rows[0]?.nearQuota || 0,
      },
      posture: {
        expiringKeys: clientTotals?.expiringKeysPercent || 0,
        ipRestricted: clientTotals?.ipRestrictedPercent || 0,
        signedWebhooks: webhookTotals?.signedPercent || 0,
        rotatedWithin90Days: clientTotals?.rotatedPercent || 0,
      },
      businesses: businessResult.rows,
      clients,
      webhooks,
      policies,
      pagination: {
        clients: pageMetadata(
          query.page,
          query.limit,
          paginationTotal(clientResult.rows),
        ),
        webhooks: pageMetadata(
          query.page,
          query.limit,
          paginationTotal(webhookResult.rows),
        ),
        policies: pageMetadata(
          query.page,
          query.limit,
          paginationTotal(policyResult.rows),
        ),
      },
      versions: versionResult.rows,
      catalog: catalogResult.rows,
      rootDomain: this.rootDomain,
    };
  }

  private policyCte(): string {
    return `WITH current_subscription AS (
      SELECT DISTINCT ON (subscription.business_id)
        subscription.business_id, subscription.plan_configuration_id,
        plan.name AS plan
      FROM business_subscriptions subscription
      JOIN billing_subscription_plans plan ON plan.id=subscription.subscription_plan_id
      WHERE subscription.status IN ('trialing','active','grace_period')
      ORDER BY subscription.business_id, subscription.created_at DESC
    ), entitlement_limits AS (
      SELECT pe.plan_configuration_id,
        MAX((pe.value #>> '{}')::int) FILTER (WHERE entitlement.entitlement_key='limit.api_requests_monthly') AS monthly,
        MAX((pe.value #>> '{}')::int) FILTER (WHERE entitlement.entitlement_key='limit.api_clients') AS clients,
        MAX((pe.value #>> '{}')::int) FILTER (WHERE entitlement.entitlement_key='limit.webhook_endpoints') AS webhooks
      FROM billing_plan_entitlements pe
      JOIN billing_entitlements entitlement ON entitlement.id=pe.entitlement_id
      GROUP BY pe.plan_configuration_id
    ), monthly_usage AS (
      SELECT business_id,COALESCE(SUM(request_count),0)::bigint AS used
      FROM api_usage_daily
      WHERE usage_date>=date_trunc('month',CURRENT_DATE)::date
      GROUP BY business_id
    ), policy_rows AS (
      SELECT business.id::text AS id,business.name AS business,
        COALESCE(subscription.plan,'No plan') AS plan,
        COALESCE(policy.requests_per_minute,60) AS "perMinute",
        COALESCE(policy.requests_monthly,limits.monthly,0) AS monthly,
        COALESCE(policy.api_client_limit,limits.clients,0) AS clients,
        COALESCE(policy.webhook_endpoint_limit,limits.webhooks,0) AS webhooks,
        COALESCE(policy.warning_threshold,80) AS warning_threshold,
        COALESCE(policy.warning_threshold,80) AS "warningThreshold",
        COALESCE(policy.auto_suspend,false) AS "autoSuspend",
        COALESCE(usage.used,0) AS used
      FROM businesses business
      LEFT JOIN current_subscription subscription ON subscription.business_id=business.id
      LEFT JOIN entitlement_limits limits ON limits.plan_configuration_id=subscription.plan_configuration_id
      LEFT JOIN api_rate_limit_policies policy ON policy.business_id=business.id
      LEFT JOIN monthly_usage usage ON usage.business_id=business.id
      WHERE business.status='active'
    )`;
  }

  async createClient(dto: CreateApiClientDto, adminId: string) {
    const scopes = [...new Set(dto.scopes)];
    if (!scopes.length || scopes.some((scope) => !isApiScope(scope))) {
      throw new BadRequestException('One or more API scopes are invalid');
    }
    if (
      !(await this.entitlements.hasFeature(
        dto.businessId,
        'feature.api_access',
      ))
    ) {
      throw new ForbiddenException('Business plan does not include API access');
    }
    const policy = await this.database.query<{
      api_client_limit: number | null;
    }>(
      'SELECT api_client_limit FROM api_rate_limit_policies WHERE business_id=$1',
      [dto.businessId],
    );
    const limit =
      policy.rows[0]?.api_client_limit ??
      (await this.entitlements.getInteger(
        dto.businessId,
        'limit.api_clients',
        0,
      ));
    const count = await this.database.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM api_clients WHERE business_id=$1 AND status IN ('active','suspended')`,
      [dto.businessId],
    );
    if (limit !== -1 && Number(count.rows[0]?.count || 0) >= limit) {
      throw new ForbiddenException('API client limit has been reached');
    }
    const expiresAt = new Date(dto.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new BadRequestException(
        'API client expiration must be in the future',
      );
    }
    const generated = this.generateApiKey(dto.environment);
    const result = await this.database.query<{ id: string; client_id: string }>(
      `INSERT INTO api_clients
        (business_id,name,client_id,key_prefix,key_hash,environment,scopes,ip_allowlist,expires_at,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8::inet[],$9,$10)
       RETURNING id::text,client_id`,
      [
        dto.businessId,
        dto.name.trim(),
        generated.clientId,
        generated.prefix,
        this.hash(generated.secret),
        dto.environment,
        scopes,
        dto.ipAllowlist || [],
        expiresAt.toISOString(),
        adminId,
      ],
    );
    return {
      id: result.rows[0].id,
      clientId: result.rows[0].client_id,
      secret: generated.secret,
    };
  }

  async rotateClient(id: string) {
    const existing = await this.database.query<{
      environment: 'production' | 'sandbox';
    }>(
      `SELECT environment FROM api_clients WHERE id=$1 AND status<>'revoked'`,
      [id],
    );
    if (!existing.rows[0]) throw new NotFoundException('API client not found');
    const generated = this.generateApiKey(existing.rows[0].environment);
    await this.database.query(
      `UPDATE api_clients SET key_prefix=$2,key_hash=$3,last_rotated_at=now(),updated_at=now() WHERE id=$1`,
      [id, generated.prefix, this.hash(generated.secret)],
    );
    return { secret: generated.secret };
  }

  async updateClientStatus(id: string, status: string) {
    const result = await this.database.query(
      `UPDATE api_clients SET status=$2,revoked_at=CASE WHEN $2='revoked' THEN now() ELSE revoked_at END,updated_at=now()
       WHERE id=$1 RETURNING id`,
      [id, status],
    );
    if (!result.rowCount) throw new NotFoundException('API client not found');
  }

  async createWebhook(dto: CreateWebhookDto, adminId: string) {
    if (
      !(await this.entitlements.hasFeature(dto.businessId, 'feature.webhooks'))
    ) {
      throw new ForbiddenException('Business plan does not include webhooks');
    }
    const events = [...new Set(dto.events)];
    if (!events.length || events.some((event) => !WEBHOOK_EVENTS.has(event))) {
      throw new BadRequestException('One or more webhook events are invalid');
    }
    const url = await validateWebhookUrl(dto.url);
    const policy = await this.database.query<{
      webhook_endpoint_limit: number | null;
    }>(
      'SELECT webhook_endpoint_limit FROM api_rate_limit_policies WHERE business_id=$1',
      [dto.businessId],
    );
    const limit =
      policy.rows[0]?.webhook_endpoint_limit ??
      (await this.entitlements.getInteger(
        dto.businessId,
        'limit.webhook_endpoints',
        0,
      ));
    const count = await this.database.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM api_webhook_endpoints WHERE business_id=$1 AND status<>'disabled'`,
      [dto.businessId],
    );
    if (limit !== -1 && Number(count.rows[0]?.count || 0) >= limit) {
      throw new ForbiddenException('Webhook endpoint limit has been reached');
    }
    const secret = `whsec_${randomBytes(32).toString('base64url')}`;
    try {
      const id = await this.database.transaction(async (client) => {
        const endpoint = await client.query<{ id: string }>(
          `INSERT INTO api_webhook_endpoints
             (business_id,name,encrypted_url,url_host,encrypted_signing_secret,signing_secret_prefix,created_by)
           VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id::text`,
          [
            dto.businessId,
            dto.name.trim(),
            this.crypto.encryptText(url.toString()),
            url.hostname,
            this.crypto.encryptText(secret),
            secret.slice(0, 14),
            adminId,
          ],
        );
        for (const event of events) {
          await client.query(
            `INSERT INTO api_webhook_subscriptions(endpoint_id,event_type) VALUES($1,$2)`,
            [endpoint.rows[0].id, event],
          );
        }
        return endpoint.rows[0].id;
      });
      return { id, signingSecret: secret };
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException(
          'Webhook name and host already exist for this business',
        );
      throw error;
    }
  }

  async updateWebhookStatus(id: string, status: string) {
    const result = await this.database.query(
      `UPDATE api_webhook_endpoints SET status=$2,consecutive_failures=CASE WHEN $2='active' THEN 0 ELSE consecutive_failures END,updated_at=now()
       WHERE id=$1 RETURNING id`,
      [id, status],
    );
    if (!result.rowCount)
      throw new NotFoundException('Webhook endpoint not found');
  }

  async rotateWebhookSecret(id: string) {
    const secret = `whsec_${randomBytes(32).toString('base64url')}`;
    const result = await this.database.query(
      `UPDATE api_webhook_endpoints SET encrypted_signing_secret=$2,signing_secret_prefix=$3,updated_at=now()
       WHERE id=$1 RETURNING id`,
      [id, this.crypto.encryptText(secret), secret.slice(0, 14)],
    );
    if (!result.rowCount)
      throw new NotFoundException('Webhook endpoint not found');
    return { signingSecret: secret };
  }

  async testWebhook(id: string) {
    return { eventId: await this.deliveries.enqueueTest(id) };
  }

  async validateWebhookConnection(value: string) {
    const url = await validateWebhookUrl(value);
    const started = Date.now();
    let status: number;
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
        headers: { 'user-agent': 'MultiTree-Webhook-Validator/1.0' },
      });
      status = response.status;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? `Webhook endpoint is unreachable: ${error.message}`
          : 'Webhook endpoint is unreachable',
      );
    }
    return {
      reachable: true,
      host: url.hostname,
      status,
      latencyMs: Date.now() - started,
    };
  }

  async updatePolicy(
    businessId: string,
    dto: UpdateRatePolicyDto,
    adminId: string,
  ) {
    await this.database.query(
      `INSERT INTO api_rate_limit_policies
         (business_id,requests_per_minute,requests_monthly,api_client_limit,webhook_endpoint_limit,warning_threshold,auto_suspend,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(business_id) DO UPDATE SET requests_per_minute=EXCLUDED.requests_per_minute,
         requests_monthly=EXCLUDED.requests_monthly,api_client_limit=EXCLUDED.api_client_limit,
         webhook_endpoint_limit=EXCLUDED.webhook_endpoint_limit,warning_threshold=EXCLUDED.warning_threshold,
         auto_suspend=EXCLUDED.auto_suspend,updated_by=EXCLUDED.updated_by,updated_at=now()`,
      [
        businessId,
        dto.requestsPerMinute,
        dto.requestsMonthly,
        dto.apiClientLimit,
        dto.webhookEndpointLimit,
        dto.warningThreshold || 80,
        dto.autoSuspend || false,
        adminId,
      ],
    );
  }

  async updateCatalog(id: string, enabled: boolean) {
    const result = await this.database.query(
      `UPDATE api_catalog_groups SET enabled=$2,updated_at=now() WHERE id=$1 RETURNING id`,
      [id, enabled],
    );
    if (!result.rowCount)
      throw new NotFoundException('API catalog group not found');
  }

  async createVersion(dto: CreateApiVersionDto) {
    const version = dto.version.trim().toLowerCase();
    if (!/^v[1-9]\d*$/.test(version)) {
      throw new BadRequestException(
        'API version must use the format v1, v2, and so on',
      );
    }
    const releasedAt = new Date(dto.releasedAt);
    const retirementAt = dto.retirementAt ? new Date(dto.retirementAt) : null;
    if (retirementAt && retirementAt <= releasedAt) {
      throw new BadRequestException(
        'Retirement date must be after the release date',
      );
    }
    try {
      return await this.database.transaction(async (client) => {
        if (dto.status === 'current') {
          await client.query(
            `UPDATE api_versions SET status='supported',updated_at=now() WHERE status='current'`,
          );
        }
        const result = await client.query<ApiVersionRecordRow>(
          `INSERT INTO api_versions(version,status,released_at,retirement_at)
           VALUES($1,$2,$3,$4) RETURNING id::text,version,status,released_at AS "releasedAt",retirement_at AS "retirementAt"`,
          [version, dto.status, dto.releasedAt, dto.retirementAt || null],
        );
        return result.rows[0];
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('API version already exists');
      throw error;
    }
  }

  async notifyVersion(id: string, actor: SessionUser) {
    const result = await this.database.query<{
      id: string;
      version: string;
      status: string;
      retirement_at: string | null;
    }>(
      `SELECT id::text,version,status,retirement_at::text FROM api_versions WHERE id=$1::uuid`,
      [id],
    );
    const version = result.rows[0];
    if (!version) throw new NotFoundException('API version not found');
    const retirement = version.retirement_at
      ? ` Support ends on ${new Date(version.retirement_at).toISOString().slice(0, 10)}.`
      : '';
    const announcement = await this.communications.createAnnouncement(
      {
        title: `MultiTree API ${version.version}`,
        message: `API version ${version.version} is ${version.status}.${retirement}`,
        announcementType: 'feature',
        priority: version.status === 'deprecated' ? 'important' : 'normal',
        audienceType: 'all',
        audienceValues: [],
        channels: ['business_bell'],
      },
      actor,
    );
    await this.communications.publishAnnouncement(announcement.id, actor.id);
    await this.database.query(
      `UPDATE api_versions SET last_notified_at=now(),notification_count=notification_count+1,updated_at=now() WHERE id=$1`,
      [id],
    );
    return { announcementId: announcement.id };
  }

  async documentation() {
    const current = await this.database.query<{ version: string }>(
      `SELECT version FROM api_versions WHERE status='current' ORDER BY released_at DESC LIMIT 1`,
    );
    return {
      version: current.rows[0]?.version || 'v1',
      basePath: '/api/v1',
      authentication: 'Authorization: Bearer <API_KEY>',
      idempotencyHeader: 'Idempotency-Key',
      scopes: API_SCOPES,
      webhookEvents: [...WEBHOOK_EVENTS],
      webhookSignature:
        'v1=HMAC_SHA256(signing_secret, timestamp + "." + raw_body)',
      operations: [
        ['GET', '/linktrees', 'linktrees:read'],
        ['POST', '/linktrees', 'linktrees:write'],
        ['GET', '/linktrees/:id', 'linktrees:read'],
        ['PATCH', '/linktrees/:id', 'linktrees:write'],
        ['DELETE', '/linktrees/:id', 'linktrees:delete'],
        ['POST', '/linktrees/:id/publish', 'linktrees:publish'],
        ['POST', '/linktrees/:id/unpublish', 'linktrees:publish'],
        ['POST', '/linktrees/:id/clone', 'linktrees:write + templates:read'],
        ['GET', '/linktrees/slug-availability', 'linktrees:read'],
        ['GET', '/linktrees/:id/preview', 'linktrees:read'],
        ['GET', '/linktrees/:id/links', 'links:read'],
        ['PUT', '/linktrees/:id/links', 'links:manage'],
        ['POST', '/linktrees/:id/schedules', 'schedules:write'],
        ['GET', '/linktrees/:id/schedules', 'schedules:read'],
        ['DELETE', '/schedules/:id', 'schedules:write'],
        ['POST', '/linktrees/bulk', 'bulk:write'],
        ['GET', '/linktrees/:id/analytics', 'analytics:read'],
        ['GET', '/linktrees/:id/analytics/daily', 'analytics:read'],
        ['GET', '/linktrees/:id/analytics/range', 'analytics:read'],
        ['GET', '/linktrees/:id/analytics/export.csv', 'analytics:export'],
        ['GET', '/templates', 'templates:read'],
        ['GET', '/assets', 'assets:read'],
        ['POST', '/assets', 'assets:write'],
        ['DELETE', '/assets/:id', 'assets:write'],
      ].map(([method, path, scope]) => ({ method, path, scope })),
    };
  }

  private generateApiKey(environment: 'production' | 'sandbox') {
    const prefix = `mt_${environment === 'production' ? 'live' : 'test'}_${randomBytes(8).toString('hex')}`;
    return {
      prefix,
      clientId: `client_${randomBytes(10).toString('hex')}`,
      secret: `${prefix}.${randomBytes(32).toString('base64url')}`,
    };
  }

  private hash(value: string) {
    return createHmac('sha256', this.pepper).update(value).digest('hex');
  }
}
