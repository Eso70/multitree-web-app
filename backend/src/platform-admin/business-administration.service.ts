import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { AdvertisingService } from '../advertising/advertising.service';
import {
  DEFAULT_LINKTREE_BACKGROUND_COLOR,
  DEFAULT_LINKTREE_TEMPLATE_KEY,
} from '../common/linktree-defaults';
import { DatabaseService } from '../database/database.service';
import { describeError } from '../common/describe-error';
import {
  BUSINESS_FAVICON_PLACEHOLDER,
  BUSINESS_LOGO_PLACEHOLDER,
  DEFAULT_AVATAR,
} from '../common/brand-assets';
import { toText } from '../common/coerce';
import type { LinkRow } from '../links/link.types';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { normalizeBusinessSubdomain } from '../common/business-subdomain';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { createHash, randomUUID } from 'crypto';
import { SecretCryptoService } from '../auth/secret-crypto.service';
import type { PoolClient } from 'pg';
import {
  pageMetadata,
  type BusinessListQueryDto,
} from '../common/dto/admin-list-query.dto';
import { BusinessAdministrationRepository } from './business-administration.repository';
import { AnalyticsReadRepository } from '../analytics/analytics-read.repository';

/**
 * Row shapes for the platform business-administration queries.
 *
 * Type aliases rather than interfaces: pg constrains the row generic to
 * `QueryResultRow`, and only aliases pick up the implicit index signature.
 */
type BusinessRow = {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  email: string | null;
  subdomain: string | null;
  status: string;
  created_at?: Date;
  updated_at?: Date;
};

type BrandingRow = {
  logo: string | null;
  favicon: string | null;
  default_avatar: string | null;
  website_color: string | null;
};

type BusinessDefaultsRow = {
  default_footer_text: string | null;
  default_footer_phone: string | null;
  default_template: string | null;
  default_background_color: string | null;
  default_footer_hidden: boolean | null;
  default_whatsapp_enabled: boolean | null;
};

type DefaultLinkRow = {
  id?: string;
  platform?: string;
  url?: string;
  display_name?: string | null;
  display_order?: number;
  metadata?: Record<string, unknown>;
};

/** The full business record the platform console lists and edits. */
type BusinessDetailRow = BusinessRow &
  BrandingRow &
  BusinessDefaultsRow & {
    ownerName: string | null;
    ownerEmail: string | null;
    plan: string | null;
    planName: string | null;
    subscriptionPlanId: string | null;
    max_linktrees: number | null;
    default_links: DefaultLinkRow[] | null;
  };

type ExportedLinktreeRow = {
  id: string;
  name: string;
  subtitle: string | null;
  subtitle_color: string | null;
  description: string | null;
  seo_name: string;
  uid: string;
  image: string | null;
  background_color: string | null;
  footer_text: string | null;
  footer_phone: string | null;
  footer_hidden: boolean | null;
  template_key: string | null;
  template_config: unknown;
  whatsapp_modal_enabled: boolean | null;
  status: string;
  is_default?: boolean;
  is_campaign_active?: boolean;
  is_archived?: boolean;
  archived_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
};

type ExportedWhatsappQuestionRow = {
  id: string;
  question_text: string;
  message: string | null;
  display_order: number;
  created_at?: Date;
  updated_at?: Date;
};

type ExportedPage = ExportedLinktreeRow & {
  links: LinkRow[];
  whatsapp_questions: ExportedWhatsappQuestionRow[];
};

/**
 * A Sponsor.krd backup document as uploaded by an administrator. Everything is
 * unvalidated, so the fields stay `unknown` until the import checks them.
 */
export type LinktreeBackup = {
  format?: unknown;
  version?: unknown;
  linktrees?: unknown;
  assets?: unknown;
};

/** A complete, portable business backup. Secrets and ephemeral records are excluded. */
export type BusinessBackup = {
  format?: unknown;
  version?: unknown;
  business?: unknown;
  owner?: unknown;
  identity?: unknown;
  membership?: unknown;
  branding?: unknown;
  defaults?: unknown;
  subscription?: unknown;
  linktrees?: unknown;
  assets?: unknown;
};

export type BusinessesBackup = {
  format?: unknown;
  version?: unknown;
  businesses?: unknown;
};

type BackupPage = {
  id?: unknown;
  uid?: unknown;
  name?: unknown;
  seo_name?: unknown;
  subtitle?: unknown;
  subtitle_color?: unknown;
  description?: unknown;
  image?: unknown;
  background_color?: unknown;
  footer_text?: unknown;
  footer_phone?: unknown;
  footer_hidden?: unknown;
  template_key?: unknown;
  template_config?: unknown;
  whatsapp_modal_enabled?: unknown;
  status?: unknown;
  is_default?: unknown;
  is_campaign_active?: unknown;
  is_archived?: unknown;
  archived_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  links?: unknown;
  whatsapp_questions?: unknown;
};

/** A link or question entry inside a backup page. */
type BackupChild = { id?: unknown } & Record<string, unknown>;

/** Backup collections are unvalidated; treat a non-array as empty. */
function asArray(value: unknown): BackupChild[] {
  return Array.isArray(value) ? (value as BackupChild[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BusinessLinktreeStatsRow = {
  id: string;
  uid: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  seo_name: string;
  image: string | null;
  background_color: string | null;
  status: string;
  is_campaign_active?: boolean;
  is_archived?: boolean;
  archived_at?: Date | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
  unique_views: string | number;
  unique_clicks: string | number;
  total_clicks: string | number;
};

type SubscriptionPlanLookupRow = {
  subscription_plan_id: string;
  plan_id: string;
  plan_configuration_id: string | null;
};

/** `SELECT 1 ...` existence probes; pg labels the column `?column?`. */
type ExistsProbeRow = { '?column?': number };

@Injectable()
export class BusinessAdministrationService {
  private readonly logger = new Logger(BusinessAdministrationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly storageService: StorageService,
    // Ahead of the optional parameters, and not `@Optional()` itself: an
    // unresolved provider would turn the plan-change cache invalidation into a
    // silent no-op, which is what it exists to stop.
    private readonly advertising: AdvertisingService,
    private readonly repository: BusinessAdministrationRepository = new BusinessAdministrationRepository(
      databaseService,
    ),
    private readonly analyticsRead: AnalyticsReadRepository = new AnalyticsReadRepository(
      databaseService,
    ),
    @Optional() private readonly secretCrypto?: SecretCryptoService,
  ) {}

  private normalizeStatus(status?: string) {
    return status?.toLowerCase() === 'suspended' ? 'suspended' : 'active';
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase();
  }

  private normalizeRequiredText(value: string | undefined, fallback: string) {
    const trimmed = value?.trim();
    return trimmed || fallback;
  }

  private defaultTemplateConfig(templateKey?: string | null) {
    return {
      templateKey: templateKey || 'spectrum',
      type: 'simple',
      buttonStyle: 'pill',
      buttonGradient: true,
      whatsapp_modal: { enabled: false, questions: [] },
    };
  }

  /**
   * Produces a valid PostgreSQL UUID whose first group identifies the owning
   * business. The fingerprint comes from the full immutable business UUID, never a
   * potentially similar username/name. The remaining 96 random bits keep IDs
   * unique between pages, links, questions, and repeated imports.
   */
  private businessScopedUuid(businessId: string): string {
    const businessFingerprint = createHash('sha256')
      .update(businessId)
      .digest('hex')
      .slice(0, 8);
    const randomPart = randomUUID();
    return `${businessFingerprint}-${randomPart.slice(9)}`;
  }

  private normalizeTikTokConfigs(data: {
    pixel_id?: string | null;
    events_token?: string | null;
    tiktok_configs?: Array<{
      pixel_id?: string | null;
      events_token?: string | null;
    }>;
  }) {
    const source =
      Array.isArray(data.tiktok_configs) && data.tiktok_configs.length > 0
        ? data.tiktok_configs
        : [{ pixel_id: data.pixel_id, events_token: data.events_token }];

    return source
      .slice(0, 3)
      .map((item) => ({
        pixel_id: item?.pixel_id?.trim() || '',
        events_token: item?.events_token?.trim() || '',
      }))
      .filter((item) => item.pixel_id);
  }

  private primaryTikTokConfig(
    configs: Array<{ pixel_id: string; events_token?: string }>,
  ) {
    return configs[0] || { pixel_id: '', events_token: '' };
  }

  private async replaceNormalizedTikTok(
    client: Pick<PoolClient, 'query'>,
    businessId: string,
    configs: Array<{ pixel_id: string; events_token?: string }>,
  ): Promise<void> {
    if (!this.secretCrypto) return;
    await client.query(
      `DELETE FROM business_tiktok_pixels WHERE business_id=$1::uuid`,
      [businessId],
    );
    for (const [index, config] of configs.entries()) {
      const eventsToken = config.events_token || '';
      await client.query(
        `INSERT INTO business_tiktok_pixels
          (business_id,pixel_id,encrypted_events_token,token_last_four,display_order)
         VALUES ($1::uuid,$2,$3,$4,$5)`,
        [
          businessId,
          config.pixel_id,
          eventsToken
            ? this.secretCrypto.encryptJson({ events_token: eventsToken })
            : null,
          eventsToken ? eventsToken.slice(-4) : null,
          index,
        ],
      );
    }
  }

  private async seedBusinessCommunications(
    client: Pick<PoolClient, 'query'>,
    business: { id: string; name: string; status: string },
  ): Promise<void> {
    const admin = await client.query<{ id: string }>(
      `SELECT id::text FROM platform_admins ORDER BY created_at ASC, id ASC LIMIT 1`,
    );
    const adminId = admin.rows[0]?.id;
    if (!adminId) return;
    if (!this.secretCrypto) {
      throw new Error('Communication encryption is unavailable');
    }
    const welcomeMessage = `سڵاو ${business.name}، بەخێربێیت بۆ Sponsor.krd. هیوادارین ئەزموونێکی خۆشت هەبێت.`;
    const encryptedSubject = this.secretCrypto.encryptText(
      'بەخێربێیت بۆ Sponsor.krd',
    );
    const encryptedMessage = this.secretCrypto.encryptText(welcomeMessage);
    const encryptedNotification = this.secretCrypto.encryptJson({
      title: 'بەخێربێیت بۆ Sponsor.krd',
      body: welcomeMessage,
    });

    const conversation = await client.query<{ id: string }>(
      `INSERT INTO communication_conversations
        (business_id, subject, encrypted_subject, category, priority, status, sponsor_krd_key,
         assigned_admin_id, created_by_type, platform_last_read_at)
       SELECT $1::uuid, '[encrypted]', $3, 'account', 'normal',
              'waiting_business', 'business_welcome', $2::uuid, 'platform-admin', NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM communication_conversations
         WHERE business_id=$1::uuid AND sponsor_krd_key='business_welcome'
       )
       RETURNING id::text`,
      [business.id, adminId, encryptedSubject],
    );
    const conversationId = conversation.rows[0]?.id;
    if (conversationId) {
      await client.query(
        `INSERT INTO communication_messages
          (conversation_id, sender_type, sender_admin_id, body, encrypted_body)
         VALUES ($1::uuid, 'platform-admin', $2::uuid, '[encrypted]', $3)`,
        [conversationId, adminId, encryptedMessage],
      );
      await client.query(
        `INSERT INTO communication_notifications
          (recipient_type, business_id, kind, priority, title, body,
           encrypted_content, source_type, source_id, action_url)
         VALUES ('business', $1::uuid, 'platform_reply', 'important',
                 '[encrypted]', '[encrypted]', $2, 'conversation', $3::uuid,
                 '/business?communication=' || $3::text)`,
        [business.id, encryptedNotification, conversationId],
      );
    }

    if (business.status !== 'active') return;
    await client.query(
      `INSERT INTO communication_announcement_deliveries
        (announcement_id, business_id, status)
       SELECT a.id, $1::uuid, 'delivered'
       FROM communication_announcements a
       LEFT JOIN business_subscriptions bs ON bs.business_id=$1::uuid
       LEFT JOIN billing_subscription_plans sp ON sp.id=bs.subscription_plan_id
       WHERE a.status='published'
         AND (a.expires_at IS NULL OR a.expires_at > NOW())
         AND (a.channels && ARRAY['business_bell', 'dashboard_banner']::text[])
         AND (
           a.audience_type='all'
           OR (a.audience_type='plans' AND COALESCE(a.audience_filter->'values', '[]'::jsonb) ? LOWER(sp.code))
           OR (a.audience_type='businesses' AND COALESCE(a.audience_filter->'values', '[]'::jsonb) ? $1::text)
         )
       ON CONFLICT (announcement_id, business_id) DO NOTHING`,
      [business.id],
    );
    const pendingNotifications = await client.query<{
      id: string;
      title: string;
      message: string;
      encryptedContent: Buffer | null;
      priority: string;
      actionUrl: string;
    }>(
      `SELECT a.id::text, a.title, a.message,
              a.encrypted_content AS "encryptedContent", a.priority,
              COALESCE(a.cta_url, '/business') AS "actionUrl"
       FROM communication_announcement_deliveries d
       JOIN communication_announcements a ON a.id=d.announcement_id
       WHERE d.business_id=$1::uuid
         AND a.channels @> ARRAY['business_bell']::text[]
         AND NOT EXISTS (
           SELECT 1 FROM communication_notifications n
           WHERE n.recipient_type='business' AND n.business_id=$1::uuid
             AND n.source_type='announcement' AND n.source_id=a.id
         )`,
      [business.id],
    );
    for (const item of pendingNotifications.rows) {
      const decrypted = item.encryptedContent
        ? this.secretCrypto.decryptJson(item.encryptedContent)
        : {};
      const title =
        typeof decrypted.title === 'string' ? decrypted.title : item.title;
      const body =
        typeof decrypted.body === 'string' ? decrypted.body : item.message;
      const encrypted = this.secretCrypto.encryptJson({ title, body });
      await client.query(
        `INSERT INTO communication_notifications
          (recipient_type, business_id, kind, priority, title, body,
           encrypted_content, source_type, source_id, action_url)
         VALUES ('business', $1::uuid, 'announcement', $2,
                 '[encrypted]', '[encrypted]', $3,
                 'announcement', $4::uuid, $5)`,
        [business.id, item.priority, encrypted, item.id, item.actionUrl],
      );
    }
  }

  /**
   * A business's pixels, from the one table that holds them.
   *
   * `business_tiktok_pixels` is the only source. A single-row `business_tiktok`
   * mirror used to be written beside it and read here as a fallback, which
   * meant two places could disagree about a business's own advertising
   * configuration and the reader picked one arbitrarily.
   */
  private async loadTikTokConfigs(
    businessId: string,
  ): Promise<Array<{ pixel_id: string; events_token: string }>> {
    const result = await this.databaseService.query<{
      pixel_id: string;
      encrypted_events_token: Buffer | string;
      token_last_four: string | null;
    }>(
      `SELECT pixel_id, encrypted_events_token, token_last_four
       FROM business_tiktok_pixels
       WHERE business_id = $1::uuid AND status='active'
       ORDER BY display_order ASC`,
      [businessId],
    );

    return result.rows
      .map((row) => {
        let eventsToken = '';
        if (this.secretCrypto) {
          try {
            const encrypted = Buffer.isBuffer(row.encrypted_events_token)
              ? row.encrypted_events_token
              : Buffer.from(row.encrypted_events_token);
            const decrypted = this.secretCrypto.decryptJson(encrypted);
            const token = decrypted.events_token;
            if (typeof token === 'string') {
              eventsToken = token;
            }
          } catch {
            // An undecryptable token is shown masked rather than blank, so the
            // operator can tell "configured but unreadable" from "not set".
            eventsToken = row.token_last_four
              ? `••••${row.token_last_four}`
              : '';
          }
        }

        return {
          pixel_id: row.pixel_id || '',
          events_token: eventsToken,
        };
      })
      .filter((item) => item.pixel_id);
  }

  private async clearBusinessPublicLinktreeCache(
    businessId: string,
    subdomain?: string | null,
  ) {
    const cleanSubdomain = subdomain?.trim().toLowerCase();
    if (!cleanSubdomain) return;

    const res = await this.databaseService.query<{
      uid: string;
      seo_name: string;
    }>('SELECT uid, seo_name FROM linktrees WHERE business_id = $1', [
      businessId,
    ]);

    const keys = new Set<string>();
    for (const row of res.rows || []) {
      if (row.uid)
        keys.add(`cache:linktree:uid:${row.uid}:sub:${cleanSubdomain}`);
      if (row.seo_name)
        keys.add(`cache:linktree:uid:${row.seo_name}:sub:${cleanSubdomain}`);
    }
    keys.add(`cache:linktree:uid:id:sub:${cleanSubdomain}`);

    await Promise.all(
      [...keys].map((key) => this.redisService.del(key).catch(() => undefined)),
    );
  }

  private async refreshBusinessRuntimeState(businessId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(`entitlements:business:${businessId}`),
      this.redisService.del(`authorization:business-policy:${businessId}`),
      this.redisService.del(`templates:business:${businessId}`),
      // Keep the database sessions active, but remove their cached identity so
      // the next request immediately reloads the latest business record.
      this.redisService.clearBusinessSessions(businessId),
      // The published advertising payload is cached by subdomain and its
      // entitlement check lives inside the query that cache short-circuits, so
      // a plan change here would otherwise keep serving a paid public page
      // until the TTL lapsed.
      this.advertising
        .invalidatePublicCacheForBusiness(businessId)
        .catch(() => undefined),
    ]);
  }

  async getBusinesses(query: BusinessListQueryDto) {
    const result = await this.repository.list(query);
    return {
      items: result.rows,
      pagination: pageMetadata(query.page, query.limit, result.total),
      summary: result.summary,
    };
  }

  async getBusiness(id: string) {
    const res = await this.databaseService.query<BusinessDetailRow>(
      `SELECT
         a.id, a.username, a.name, a.phone, a.email, a.subdomain, a.status,
         COALESCE(owner_account.display_name, a.name) AS "ownerName",
         COALESCE(owner_account.email, a.email) AS "ownerEmail",
         COALESCE(subscription_plan.code, a.plan) AS plan,
         COALESCE(subscription_plan.name, INITCAP(a.plan)) AS "planName",
         subscription_plan.id::text AS "subscriptionPlanId",
         a.max_linktrees,
         b.logo, b.favicon, b.default_avatar, b.website_color,
         d.footer_text AS default_footer_text,
         d.footer_phone AS default_footer_phone,
         d.template_key AS default_template,
         d.background_color AS default_background_color,
         d.footer_hidden AS default_footer_hidden,
         d.whatsapp_enabled AS default_whatsapp_enabled,
         COALESCE(dl.default_links, '[]'::json) AS default_links,
         a.created_at, a.updated_at
       FROM businesses a
       LEFT JOIN business_branding b ON b.business_id = a.id
       LEFT JOIN business_defaults d ON d.business_id = a.id
       LEFT JOIN LATERAL (
         SELECT users.display_name, users.email
         FROM business_memberships membership
         JOIN users ON users.id = membership.user_id
         WHERE membership.business_id = a.id
           AND membership.role = 'owner'
           AND membership.status = 'active'
         ORDER BY membership.created_at ASC
         LIMIT 1
       ) owner_account ON true
       LEFT JOIN LATERAL (
         SELECT subscription_plan_id
         FROM business_subscriptions
         WHERE business_id = a.id
         ORDER BY created_at DESC LIMIT 1
       ) bs ON true
       LEFT JOIN billing_subscription_plans subscription_plan
         ON subscription_plan.id = bs.subscription_plan_id
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
           'platform', l.platform,
           'url', l.url,
           'display_name', l.display_name,
           'display_order', l.display_order,
           'metadata', json_build_object(
             'original_input', l.original_input,
             'country_code', l.country_code,
             'gps_lat', l.gps_lat,
             'gps_lng', l.gps_lng,
             'custom_color', l.custom_color,
             'custom_icon', l.custom_icon
           )
         ) ORDER BY l.display_order ASC) AS default_links
         FROM linktrees lt
         LEFT JOIN links l ON l.linktree_id = lt.id
         WHERE lt.business_id = a.id AND lt.is_default = true
       ) dl ON true
       WHERE a.id = $1 AND a.account_type = 'business'`,
      [id],
    );
    const business = res.rows[0];
    if (!business) throw new NotFoundException('Business not found');
    const tiktokConfigs = await this.loadTikTokConfigs(business.id);
    const primary = this.primaryTikTokConfig(tiktokConfigs);
    return {
      ...business,
      default_links: Array.isArray(business.default_links)
        ? business.default_links.filter((link) => link.platform)
        : [],
      pixel_id: primary.pixel_id || null,
      events_token: primary.events_token || null,
      tiktok_configs: tiktokConfigs,
    };
  }

  async getBusinessOptions(query: BusinessListQueryDto) {
    const search = query.search?.trim() || '';
    const result = await this.databaseService.query<{
      id: string;
      name: string;
      username: string;
      status: string;
    }>(
      `SELECT id::text, name, username, status
       FROM businesses
       WHERE ($1 = '' OR name ILIKE $1 OR username ILIKE $1)
         AND ($2::text IS NULL OR status = $2)
         AND account_type = 'business'
       ORDER BY name
       LIMIT $3`,
      [`%${search}%`, query.status || null, query.limit],
    );
    return result.rows;
  }

  async updateBusiness(id: string, data: UpdateBusinessDto) {
    const businessRes = await this.databaseService.query<BusinessDetailRow>(
      `SELECT a.username, a.name, a.phone, a.email, a.subdomain, a.status,
              b.logo, b.favicon, b.default_avatar, b.website_color,
              d.footer_text AS default_footer_text, d.footer_phone AS default_footer_phone,
              d.template_key AS default_template, d.background_color AS default_background_color,
              d.footer_hidden AS default_footer_hidden, d.whatsapp_enabled AS default_whatsapp_enabled
       FROM businesses a
       LEFT JOIN business_branding b ON b.business_id = a.id
       LEFT JOIN business_defaults d ON d.business_id = a.id
       WHERE a.id = $1 AND a.account_type = 'business'`,
      [id],
    );
    if (!businessRes.rows || businessRes.rows.length === 0) {
      throw new NotFoundException('Business not found');
    }
    const current = businessRes.rows[0];
    const currentTikTokConfigs = await this.loadTikTokConfigs(id);

    const nextUsername =
      data.username !== undefined
        ? this.normalizeUsername(data.username)
        : current.username;
    if (data.username && nextUsername !== current.username) {
      const check = await this.databaseService.query<ExistsProbeRow>(
        'SELECT 1 FROM businesses WHERE username = $1 AND id != $2',
        [nextUsername, id],
      );
      if (check.rows.length > 0)
        throw new ConflictException('Username is already in use');
    }

    // The rule is applied only to a value that is actually changing. Signup
    // provisioning is the other writer of this column and has always applied
    // it, but a row that predates the shared rule — or one seeded around it —
    // must not lock an administrator out of editing the business's other
    // fields.
    let subdomain = current.subdomain;
    if (data.subdomain !== undefined) {
      subdomain =
        data.subdomain.trim().toLowerCase() === current.subdomain
          ? current.subdomain
          : normalizeBusinessSubdomain(data.subdomain);
    }
    if (subdomain && subdomain !== current.subdomain) {
      const check = await this.databaseService.query<ExistsProbeRow>(
        'SELECT 1 FROM businesses WHERE subdomain = $1 AND id != $2',
        [subdomain, id],
      );
      if (check.rows.length > 0)
        throw new ConflictException('Subdomain is already in use');
    }

    const resolved = {
      username: nextUsername,
      name: data.name !== undefined ? data.name.trim() : current.name,
      phone: data.phone !== undefined ? data.phone.trim() : current.phone,
      email:
        data.email !== undefined ? data.email?.trim() || null : current.email,
      subdomain,
      status:
        data.status !== undefined
          ? this.normalizeStatus(data.status)
          : current.status,
      logo:
        data.logo !== undefined
          ? this.normalizeRequiredText(data.logo, BUSINESS_LOGO_PLACEHOLDER)
          : current.logo,
      favicon:
        data.favicon !== undefined
          ? this.normalizeRequiredText(
              data.favicon,
              BUSINESS_FAVICON_PLACEHOLDER,
            )
          : current.favicon,
      default_avatar:
        data.default_avatar !== undefined
          ? this.normalizeRequiredText(data.default_avatar, DEFAULT_AVATAR)
          : current.default_avatar,
      website_color:
        data.website_color !== undefined
          ? data.website_color
          : current.website_color,
      default_footer_text:
        data.default_footer_text !== undefined
          ? data.default_footer_text
          : current.default_footer_text,
      default_footer_phone:
        data.default_footer_phone !== undefined
          ? data.default_footer_phone
          : current.default_footer_phone,
      default_template:
        data.default_template !== undefined
          ? data.default_template.trim() || DEFAULT_LINKTREE_TEMPLATE_KEY
          : current.default_template,
      default_background_color:
        data.default_background_color !== undefined
          ? data.default_background_color.trim() ||
            DEFAULT_LINKTREE_BACKGROUND_COLOR
          : current.default_background_color,
      default_footer_hidden:
        data.default_footer_hidden !== undefined
          ? data.default_footer_hidden
          : current.default_footer_hidden,
      default_whatsapp_enabled:
        data.default_whatsapp_enabled !== undefined
          ? data.default_whatsapp_enabled
          : current.default_whatsapp_enabled,
      tiktok_configs:
        data.tiktok_configs !== undefined
          ? this.normalizeTikTokConfigs(data)
          : currentTikTokConfigs,
    };
    const primaryTikTok = this.primaryTikTokConfig(resolved.tiktok_configs);

    const result = await this.databaseService.transaction(async (client) => {
      const businessUpdate = await client.query<BusinessRow>(
        `UPDATE businesses SET username = $1, name = $2, phone = $3, email = $4, subdomain = $5, status = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING id, username, name, phone, email, subdomain, status, plan, max_linktrees, created_at, updated_at`,
        [
          resolved.username,
          resolved.name,
          resolved.phone,
          resolved.email,
          resolved.subdomain,
          resolved.status,
          id,
        ],
      );

      const brandingUpdate = await client.query<BrandingRow>(
        `INSERT INTO business_branding (business_id, logo, favicon, default_avatar, website_color)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (business_id) DO UPDATE SET
           logo = EXCLUDED.logo, favicon = EXCLUDED.favicon,
           default_avatar = EXCLUDED.default_avatar, website_color = EXCLUDED.website_color,
           updated_at = NOW()
         RETURNING logo, favicon, default_avatar, website_color`,
        [
          id,
          resolved.logo,
          resolved.favicon,
          resolved.default_avatar,
          resolved.website_color,
        ],
      );

      const defaultsUpdate = await client.query<BusinessDefaultsRow>(
        `INSERT INTO business_defaults (business_id, footer_text, footer_phone, template_key, background_color, footer_hidden, whatsapp_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (business_id) DO UPDATE SET
           footer_text = EXCLUDED.footer_text, footer_phone = EXCLUDED.footer_phone,
           template_key = EXCLUDED.template_key, background_color = EXCLUDED.background_color,
           footer_hidden = EXCLUDED.footer_hidden, whatsapp_enabled = EXCLUDED.whatsapp_enabled,
           updated_at = NOW()
         RETURNING footer_text AS default_footer_text, footer_phone AS default_footer_phone,
                   template_key AS default_template, background_color AS default_background_color,
                   footer_hidden AS default_footer_hidden, whatsapp_enabled AS default_whatsapp_enabled`,
        [
          id,
          resolved.default_footer_text,
          resolved.default_footer_phone,
          resolved.default_template,
          resolved.default_background_color,
          resolved.default_footer_hidden,
          resolved.default_whatsapp_enabled,
        ],
      );

      await this.replaceNormalizedTikTok(client, id, resolved.tiktok_configs);

      const templateConfig = this.defaultTemplateConfig(
        resolved.default_template,
      );
      templateConfig.whatsapp_modal.enabled =
        resolved.default_whatsapp_enabled ?? false;

      await client.query(
        `UPDATE linktrees
         SET name = COALESCE($1, name), image = $2, background_color = $3,
             template_key = $4, template_config = $5::jsonb,
             whatsapp_modal_enabled = $6, footer_text = $7, footer_phone = $8,
             footer_hidden = $9, updated_at = NOW()
         WHERE business_id = $10 AND is_default = true`,
        [
          resolved.name,
          resolved.logo || null,
          resolved.default_background_color ||
            resolved.website_color ||
            '#0f121d',
          resolved.default_template || 'spectrum',
          JSON.stringify(templateConfig),
          resolved.default_whatsapp_enabled ?? false,
          resolved.default_footer_text || null,
          resolved.default_footer_phone || null,
          resolved.default_footer_hidden ?? false,
          id,
        ],
      );

      if (data.links && Array.isArray(data.links)) {
        const ltRes = await client.query<{ id: string }>(
          `SELECT id FROM linktrees WHERE business_id = $1 AND is_default = true LIMIT 1`,
          [id],
        );
        if (ltRes.rows.length > 0) {
          const linktreeId = ltRes.rows[0].id;
          await client.query(`DELETE FROM links WHERE linktree_id = $1`, [
            linktreeId,
          ]);
          for (let i = 0; i < data.links.length; i++) {
            const link = data.links[i];
            await client.query(
              `INSERT INTO links (
                 linktree_id, business_id, platform, url, display_name, display_order,
                 original_input, country_code, gps_lat, gps_lng, custom_color, custom_icon
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                linktreeId,
                id,
                link.platform,
                link.url,
                link.display_name || null,
                i,
                link.metadata?.original_input || null,
                link.metadata?.country_code || null,
                link.metadata?.gps_lat !== undefined
                  ? Number(link.metadata.gps_lat)
                  : null,
                link.metadata?.gps_lng !== undefined
                  ? Number(link.metadata.gps_lng)
                  : null,
                link.metadata?.custom_color || null,
                link.metadata?.custom_icon || null,
              ],
            );
          }
        }
      }

      if (data.subscriptionPlanId) {
        const planRes = await client.query<SubscriptionPlanLookupRow>(
          `SELECT sp.id AS subscription_plan_id, sp.permission_profile_id AS plan_id,
                  pc.id AS plan_configuration_id
           FROM billing_subscription_plans sp
           LEFT JOIN billing_plan_configurations pc ON pc.plan_id = sp.permission_profile_id
           WHERE sp.id = $1::uuid AND sp.status = 'active'`,
          [data.subscriptionPlanId],
        );
        if (planRes.rows.length > 0) {
          const p = planRes.rows[0];
          await client.query(
            `INSERT INTO business_subscriptions
                (business_id, subscription_plan_id, plan_id, plan_configuration_id, status, current_period_start, current_period_end)
              VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'active', NOW(), NOW() + INTERVAL '1 year')
              ON CONFLICT (business_id) DO UPDATE SET
                subscription_plan_id = EXCLUDED.subscription_plan_id,
                plan_id = EXCLUDED.plan_id,
                plan_configuration_id = EXCLUDED.plan_configuration_id,
                status = EXCLUDED.status,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                ended_at = NULL`,
            [id, p.subscription_plan_id, p.plan_id, p.plan_configuration_id],
          );
        }
      }

      return {
        ...businessUpdate.rows[0],
        ...brandingUpdate.rows[0],
        ...defaultsUpdate.rows[0],
        pixel_id: primaryTikTok.pixel_id || null,
        events_token: primaryTikTok.events_token || null,
        tiktok_configs: resolved.tiktok_configs,
      };
    });

    await this.storageService.claimBusinessAssets(id, resolved);
    await this.storageService.deleteUnreferencedFromValues(
      current.logo,
      current.favicon,
      current.default_avatar,
    );

    try {
      await this.clearBusinessPublicLinktreeCache(id, current.subdomain);
      await this.clearBusinessPublicLinktreeCache(id, subdomain);
    } catch (error) {
      this.logger.warn(
        `Failed to clear public linktree cache after updating business ${id}: ${describeError(error)}`,
      );
    }
    await this.refreshBusinessRuntimeState(id);

    return result;
  }

  async deleteBusiness(id: string) {
    const businessRes = await this.databaseService.query<{
      logo: string | null;
      favicon: string | null;
      default_avatar: string | null;
      subdomain: string | null;
    }>(
      `SELECT b.logo, b.favicon, b.default_avatar, a.subdomain
       FROM businesses a
       LEFT JOIN business_branding b ON b.business_id = a.id
       WHERE a.id = $1 AND a.account_type = 'business'`,
      [id],
    );
    if (!businessRes.rows || businessRes.rows.length === 0) {
      throw new NotFoundException('Business not found');
    }
    const business = businessRes.rows[0];

    const ltRes = await this.databaseService.query<{ image: string | null }>(
      `SELECT image FROM linktrees WHERE business_id = $1 AND image IS NOT NULL`,
      [id],
    );
    const linktreeImages = ltRes.rows
      .map((r) => r.image)
      .filter(Boolean) as string[];
    const ownedAssets = await this.storageService.getBusinessAssetUrls(id);

    await this.redisService.clearBusinessSessions(id);

    const res = await this.databaseService.query(
      `DELETE FROM businesses WHERE id = $1 AND account_type = 'business'`,
      [id],
    );
    if (res.rowCount === 0) throw new NotFoundException('Business not found');

    if (business.subdomain) {
      try {
        await this.redisService.del(
          `cache:linktree:uid:id:sub:${business.subdomain.toLowerCase()}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to clear subdomain cache after deleting business ${id}: ${describeError(error)}`,
        );
      }
    }

    const filesToDelete: string[] = [
      business.logo,
      business.favicon,
      business.default_avatar,
      ...linktreeImages,
      ...ownedAssets,
    ].filter((p): p is string => !!(p && p.startsWith('/images/upload/')));

    await this.storageService.deleteUnreferencedFromValues(filesToDelete);
    return { success: true };
  }

  async getBusinessLinktrees(id: string) {
    // The per-linktree totals are the same question the business's own pages
    // list asks, so both go through `AnalyticsReadRepository` rather than
    // keeping two copies of the aggregate in step by hand.
    const [linktreesRes, totals] = await Promise.all([
      this.databaseService.query<BusinessLinktreeStatsRow>(
        `SELECT lt.id, lt.uid, lt.name, lt.subtitle, lt.description, lt.seo_name,
                lt.image, lt.background_color, lt.status, lt.is_campaign_active, lt.is_archived, lt.archived_at, lt.is_default,
                lt.created_at, lt.updated_at
           FROM linktrees lt
          WHERE lt.business_id = $1
          ORDER BY lt.is_default DESC, lt.is_campaign_active DESC, lt.created_at DESC`,
        [id],
      ),
      this.analyticsRead.linktreeTotalsForBusiness(id),
    ]);

    return (linktreesRes.rows || []).map((row) => {
      const rowTotals = totals.get(row.id);
      return {
        id: row.id,
        uid: row.uid,
        name: row.name,
        subtitle: row.subtitle,
        description: row.description,
        seo_name: row.seo_name,
        image: row.image,
        background_color: row.background_color,
        status: row.status,
        is_campaign_active: row.is_campaign_active,
        is_archived: row.is_archived,
        archived_at: row.archived_at,
        is_default: row.is_default,
        created_at: row.created_at,
        updated_at: row.updated_at,
        unique_views: rowTotals?.unique_views ?? 0,
        unique_clicks: rowTotals?.unique_clicks ?? 0,
        total_clicks: rowTotals?.total_clicks ?? 0,
      };
    });
  }

  async updateTikTokConfig(
    id: string,
    pixelId?: string,
    eventsToken?: string,
    tiktokConfigs?: Array<{ pixel_id?: string; events_token?: string }>,
  ) {
    const check = await this.databaseService.query<{ subdomain: string }>(
      `SELECT subdomain FROM businesses
       WHERE id = $1 AND account_type = 'business'`,
      [id],
    );
    if (!check.rows || check.rows.length === 0)
      throw new NotFoundException('Business not found');

    const configs = this.normalizeTikTokConfigs({
      pixel_id: pixelId,
      events_token: eventsToken,
      tiktok_configs: tiktokConfigs,
    });
    await this.databaseService.transaction(async (client) => {
      await this.replaceNormalizedTikTok(client, id, configs);
    });

    await this.clearBusinessPublicLinktreeCache(id, check.rows[0].subdomain);

    // Read back rather than echoing what was submitted: the stored token is
    // encrypted, and this is what every other reader of this business will
    // see.
    const refreshed = await this.loadTikTokConfigs(id);
    return {
      id,
      pixel_id: refreshed[0]?.pixel_id || null,
      events_token: refreshed[0]?.events_token || null,
      tiktok_configs: refreshed,
    };
  }

  private collectUploadUrls(
    value: unknown,
    urls = new Set<string>(),
  ): Set<string> {
    if (typeof value === 'string' && value.startsWith('/images/upload/'))
      urls.add(value);
    else if (Array.isArray(value))
      value.forEach((item) => this.collectUploadUrls(item, urls));
    else if (value && typeof value === 'object')
      Object.values(value).forEach((item) =>
        this.collectUploadUrls(item, urls),
      );
    return urls;
  }

  private async exportLinktreePages(id: string, includeDefault: boolean) {
    const pagesRes = await this.databaseService.query<ExportedLinktreeRow>(
      `SELECT id, name, subtitle, subtitle_color, description, seo_name, uid, image,
              background_color, footer_text, footer_phone, footer_hidden, template_key,
              template_config, whatsapp_modal_enabled, status, is_default,
              is_campaign_active, is_archived, archived_at, created_at, updated_at
       FROM linktrees
       WHERE business_id = $1 AND ($2::boolean OR is_default = false)
       ORDER BY is_default DESC, created_at ASC`,
      [id, includeDefault],
    );
    const pages: ExportedPage[] = [];
    for (const page of pagesRes.rows) {
      const [linksRes, questionsRes] = await Promise.all([
        this.databaseService.query<LinkRow>(
          `SELECT id, platform, url, display_name, description, default_message, display_order,
                  original_input, country_code, gps_lat, gps_lng, custom_color, custom_icon, created_at, updated_at
           FROM links WHERE linktree_id = $1 ORDER BY display_order ASC`,
          [page.id],
        ),
        this.databaseService.query<ExportedWhatsappQuestionRow>(
          `SELECT id, question_text, message, display_order, created_at, updated_at
           FROM whatsapp_questions WHERE linktree_id = $1 ORDER BY display_order ASC`,
          [page.id],
        ),
      ]);
      pages.push({
        ...page,
        links: linksRes.rows,
        whatsapp_questions: questionsRes.rows,
      });
    }
    return pages;
  }

  private validateBackupPages(value: unknown, allowDefault: boolean) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('Backup linktrees must be an array');
    }
    const pages = value as BackupPage[];
    if (!allowDefault && pages.some((page) => page.is_default === true)) {
      throw new BadRequestException('Default linktrees cannot be imported');
    }
    if (
      allowDefault &&
      pages.filter((page) => page.is_default === true).length !== 1
    ) {
      throw new BadRequestException(
        'A business backup must contain exactly one default linktree',
      );
    }
    const ids: unknown[] = pages.flatMap((page) => [
      page.id,
      ...asArray(page.links).map((link) => link.id),
      ...asArray(page.whatsapp_questions).map((question) => question.id),
    ]);
    if (
      ids.some(
        (value) => typeof value !== 'string' || !UUID_PATTERN.test(value),
      )
    ) {
      throw new BadRequestException('Backup contains invalid UUIDs');
    }
    for (const page of pages) {
      if (
        typeof page.name !== 'string' ||
        typeof page.seo_name !== 'string' ||
        typeof page.uid !== 'string' ||
        !page.name.trim() ||
        !page.seo_name.trim() ||
        !page.uid.trim()
      ) {
        throw new BadRequestException('Backup contains an incomplete linktree');
      }
      for (const link of asArray(page.links)) {
        if (typeof link.platform !== 'string' || typeof link.url !== 'string') {
          throw new BadRequestException('Backup contains an incomplete link');
        }
      }
      for (const question of asArray(page.whatsapp_questions)) {
        if (
          typeof question.question_text !== 'string' ||
          typeof question.message !== 'string'
        ) {
          throw new BadRequestException(
            'Backup contains an incomplete WhatsApp question',
          );
        }
      }
    }
    return pages;
  }

  private async importLinktreePages(
    client: Pick<PoolClient, 'query'>,
    businessId: string,
    pages: BackupPage[],
    allowDefault: boolean,
  ) {
    let importedLinks = 0;
    for (const page of pages) {
      const destinationMatches = await client.query<{ id: string }>(
        `SELECT id FROM linktrees WHERE business_id = $1 AND (seo_name = $2 OR uid = $3)`,
        [businessId, page.seo_name, page.uid],
      );
      if (destinationMatches.rows.length > 1) {
        throw new ConflictException(
          `UID and slug belong to different destination pages: ${toText(page.name)}`,
        );
      }
      let targetPageId = destinationMatches.rows[0]?.id;
      if (!targetPageId) {
        const uuidOwner = await client.query<{ business_id: string }>(
          'SELECT business_id FROM linktrees WHERE id = $1',
          [page.id],
        );
        targetPageId =
          uuidOwner.rows.length === 0 ||
          uuidOwner.rows[0].business_id === businessId
            ? (page.id as string)
            : this.businessScopedUuid(businessId);
      }
      const isDefault = allowDefault && page.is_default === true;
      await client.query(
        `INSERT INTO linktrees (
           id, business_id, name, subtitle, subtitle_color, description, seo_name, uid,
           image, background_color, footer_text, footer_phone, footer_hidden, template_key,
           template_config, whatsapp_modal_enabled, status, is_default, is_campaign_active,
           is_archived, archived_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19,$20,$21,$22,$23)
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, subtitle=EXCLUDED.subtitle, subtitle_color=EXCLUDED.subtitle_color,
           description=EXCLUDED.description, seo_name=EXCLUDED.seo_name, uid=EXCLUDED.uid,
           image=EXCLUDED.image, background_color=EXCLUDED.background_color,
           footer_text=EXCLUDED.footer_text, footer_phone=EXCLUDED.footer_phone,
           footer_hidden=EXCLUDED.footer_hidden, template_key=EXCLUDED.template_key,
           template_config=EXCLUDED.template_config,
           whatsapp_modal_enabled=EXCLUDED.whatsapp_modal_enabled, status=EXCLUDED.status,
           is_default=EXCLUDED.is_default, is_campaign_active=EXCLUDED.is_campaign_active,
           is_archived=EXCLUDED.is_archived, archived_at=EXCLUDED.archived_at,
           updated_at=EXCLUDED.updated_at`,
        [
          targetPageId,
          businessId,
          page.name,
          toText(page.subtitle) || null,
          toText(page.subtitle_color) || null,
          toText(page.description) || null,
          page.seo_name,
          page.uid,
          toText(page.image) || null,
          toText(page.background_color) || '#000000',
          toText(page.footer_text) || null,
          toText(page.footer_phone) || null,
          page.footer_hidden === true,
          toText(page.template_key) || 'spectrum',
          JSON.stringify(asRecord(page.template_config)),
          page.whatsapp_modal_enabled === true,
          page.status === 'inactive' ? 'inactive' : 'active',
          isDefault,
          !isDefault && page.is_campaign_active === true,
          !isDefault && page.is_archived === true,
          !isDefault && page.is_archived === true
            ? page.archived_at || new Date()
            : null,
          page.created_at || new Date(),
          page.updated_at || new Date(),
        ],
      );
      await client.query(
        'DELETE FROM whatsapp_questions WHERE linktree_id = $1',
        [targetPageId],
      );
      await client.query('DELETE FROM links WHERE linktree_id = $1', [
        targetPageId,
      ]);
      for (const question of asArray(page.whatsapp_questions)) {
        const owner = await client.query<ExistsProbeRow>(
          'SELECT 1 FROM whatsapp_questions WHERE id = $1',
          [question.id],
        );
        await client.query(
          `INSERT INTO whatsapp_questions
             (id, linktree_id, question_text, message, display_order, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            owner.rows.length
              ? this.businessScopedUuid(businessId)
              : question.id,
            targetPageId,
            question.question_text,
            question.message,
            Number(question.display_order) || 0,
            question.created_at || new Date(),
            question.updated_at || new Date(),
          ],
        );
      }
      for (const link of asArray(page.links)) {
        const owner = await client.query<ExistsProbeRow>(
          'SELECT 1 FROM links WHERE id = $1',
          [link.id],
        );
        await client.query(
          `INSERT INTO links (
             id, linktree_id, business_id, platform, url, display_name, description,
             default_message, display_order, original_input, country_code, gps_lat,
             gps_lng, custom_color, custom_icon, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [
            owner.rows.length ? this.businessScopedUuid(businessId) : link.id,
            targetPageId,
            businessId,
            link.platform,
            link.url,
            toText(link.display_name) || null,
            toText(link.description) || null,
            toText(link.default_message) || null,
            Number(link.display_order) || 0,
            toText(link.original_input) || null,
            toText(link.country_code) || null,
            link.gps_lat ?? null,
            link.gps_lng ?? null,
            toText(link.custom_color) || null,
            toText(link.custom_icon) || null,
            link.created_at || new Date(),
            link.updated_at || new Date(),
          ],
        );
        importedLinks++;
      }
    }
    return { imported_linktrees: pages.length, imported_links: importedLinks };
  }

  private async restoreBackupAssets(
    businessId: string,
    backup: { linktrees?: unknown; assets?: unknown },
  ) {
    const assets = asRecord(backup.assets);
    for (const [url, base64] of Object.entries(assets)) {
      if (typeof base64 === 'string' && url.startsWith('/images/upload/')) {
        await this.storageService.restoreUploadedAsset(
          url,
          Buffer.from(base64, 'base64'),
        );
      }
    }
    await this.storageService.claimBusinessAssets(
      businessId,
      backup.linktrees,
      backup.assets,
    );
  }

  async exportBusinessLinktrees(id: string) {
    const businessRes = await this.databaseService.query<
      Pick<BusinessRow, 'id' | 'username' | 'name' | 'subdomain'>
    >(
      `SELECT id, username, name, subdomain FROM businesses
       WHERE id = $1 AND account_type = 'business'`,
      [id],
    );
    if (!businessRes.rows.length)
      throw new NotFoundException('Business not found');
    const pages = await this.exportLinktreePages(id, false);
    const assets: Record<string, string> = {};
    for (const url of this.collectUploadUrls(pages)) {
      const buffer = await this.storageService.readUploadedAsset(url);
      if (buffer) assets[url] = buffer.toString('base64');
    }
    return {
      format: 'sponsor-krd-linktrees',
      version: 1,
      exported_at: new Date().toISOString(),
      business: businessRes.rows[0],
      linktrees: pages,
      assets,
    };
  }

  async importBusinessLinktrees(id: string, backup: LinktreeBackup) {
    if (
      !backup ||
      backup.format !== 'sponsor-krd-linktrees' ||
      backup.version !== 1 ||
      !Array.isArray(backup.linktrees)
    ) {
      throw new BadRequestException(
        'Invalid or unsupported Sponsor.krd backup',
      );
    }
    const businessRes = await this.databaseService.query<{ id: string }>(
      `SELECT id FROM businesses
       WHERE id = $1 AND account_type = 'business'`,
      [id],
    );
    if (!businessRes.rows.length)
      throw new NotFoundException('Business not found');
    const backupPages = this.validateBackupPages(backup.linktrees, false);

    const previousPageAssets = await this.databaseService.query<{
      image: string | null;
      template_config: unknown;
    }>(
      `SELECT image,template_config FROM linktrees
       WHERE business_id=$1 AND is_default=FALSE`,
      [id],
    );

    const result = await this.databaseService.transaction((client) =>
      this.importLinktreePages(client, id, backupPages, false),
    );
    await this.restoreBackupAssets(id, backup);
    await this.storageService.deleteUnreferencedFromValues(
      previousPageAssets.rows,
    );
    for (const page of backupPages) {
      const uid = toText(page.uid);
      try {
        await this.redisService.del(`cache:linktree:uid:${uid}`);
      } catch (error) {
        this.logger.warn(
          `Failed to clear cache for restored linktree ${uid}: ${describeError(error)}`,
        );
      }
    }
    return result;
  }

  async exportBusiness(id: string) {
    const businessRes = await this.databaseService.query<
      Record<string, unknown>
    >(
      `SELECT id::text, username, name, email, phone, subdomain, status, plan,
              max_linktrees, last_login_at, profile_changed_at,
              onboarding_step, onboarding_version,
              onboarding_completed_at, created_at, updated_at
       FROM businesses WHERE id=$1::uuid AND account_type='business'`,
      [id],
    );
    if (!businessRes.rows.length) {
      throw new NotFoundException('Business not found');
    }
    const [ownerRes, brandingRes, defaultsRes, subscriptionRes, pages] =
      await Promise.all([
        this.databaseService.query<Record<string, unknown>>(
          `SELECT u.id::text, u.email, u.display_name, u.avatar_url, u.status, u.last_login_at,
                  u.created_at, u.updated_at,
                  m.id::text AS membership_id, m.role AS membership_role,
                  m.status AS membership_status, m.created_at AS membership_created_at,
                  m.updated_at AS membership_updated_at
           FROM business_memberships m
           JOIN users u ON u.id=m.user_id
           WHERE m.business_id=$1::uuid AND m.role='owner' AND m.status='active'
           ORDER BY m.created_at ASC LIMIT 1`,
          [id],
        ),
        this.databaseService.query<Record<string, unknown>>(
          `SELECT logo, favicon, default_avatar, website_color, updated_at
           FROM business_branding WHERE business_id=$1::uuid`,
          [id],
        ),
        this.databaseService.query<Record<string, unknown>>(
          `SELECT footer_text, footer_phone, footer_hidden, template_key,
                  background_color, whatsapp_enabled, updated_at
           FROM business_defaults WHERE business_id=$1::uuid`,
          [id],
        ),
        this.databaseService.query<Record<string, unknown>>(
          `SELECT bs.id::text, sp.code AS plan_code, bs.status, bs.billing_cycle,
                  bs.starts_at, bs.current_period_start, bs.current_period_end,
                  bs.cancels_at, bs.ended_at, bs.metadata, bs.created_at, bs.updated_at
           FROM business_subscriptions bs
           JOIN billing_subscription_plans sp ON sp.id=bs.subscription_plan_id
           WHERE bs.business_id=$1::uuid`,
          [id],
        ),
        this.exportLinktreePages(id, true),
      ]);
    const ownerRow = ownerRes.rows[0];
    const identityRes = ownerRow
      ? await this.databaseService.query<Record<string, unknown>>(
          `SELECT id::text, provider, provider_subject, provider_email,
                  email_verified, profile, last_authenticated_at, created_at, updated_at
           FROM user_identities WHERE user_id=$1::uuid
           ORDER BY created_at ASC LIMIT 1`,
          [ownerRow.id],
        )
      : { rows: [] as Record<string, unknown>[] };
    const owner = ownerRow
      ? {
          id: ownerRow.id,
          email: ownerRow.email,
          display_name: ownerRow.display_name,
          avatar_url: ownerRow.avatar_url,
          status: ownerRow.status,
          last_login_at: ownerRow.last_login_at,
          created_at: ownerRow.created_at,
          updated_at: ownerRow.updated_at,
        }
      : null;
    const membership = ownerRow
      ? {
          id: ownerRow.membership_id,
          role: ownerRow.membership_role,
          status: ownerRow.membership_status,
          created_at: ownerRow.membership_created_at,
          updated_at: ownerRow.membership_updated_at,
        }
      : null;
    const document = {
      format: 'sponsor-krd-business',
      version: 1,
      exported_at: new Date().toISOString(),
      business: businessRes.rows[0],
      owner,
      identity: identityRes.rows[0] || null,
      membership,
      branding: brandingRes.rows[0] || null,
      defaults: defaultsRes.rows[0] || null,
      subscription: subscriptionRes.rows[0] || null,
      linktrees: pages,
    };
    const assets: Record<string, string> = {};
    for (const url of this.collectUploadUrls(document)) {
      const buffer = await this.storageService.readUploadedAsset(url);
      if (buffer) assets[url] = buffer.toString('base64');
    }
    return { ...document, assets };
  }

  async exportBusinesses() {
    const result = await this.databaseService.query<{ id: string }>(
      `SELECT id::text FROM businesses
       WHERE account_type='business' ORDER BY created_at ASC, id ASC`,
    );
    const businesses = [];
    for (const row of result.rows) {
      businesses.push(await this.exportBusiness(row.id));
    }
    return {
      format: 'sponsor-krd-businesses',
      version: 1,
      exported_at: new Date().toISOString(),
      businesses,
    };
  }

  async importBusinesses(backup: BusinessesBackup) {
    if (
      !backup ||
      backup.format !== 'sponsor-krd-businesses' ||
      backup.version !== 1 ||
      !Array.isArray(backup.businesses) ||
      backup.businesses.length === 0
    ) {
      throw new BadRequestException(
        'Invalid or unsupported Sponsor.krd businesses backup',
      );
    }
    const documents = backup.businesses as BusinessBackup[];
    const identities = documents.map((document) => {
      if (
        document.format !== 'sponsor-krd-business' ||
        document.version !== 1
      ) {
        throw new BadRequestException(
          'Businesses backup contains an invalid business document',
        );
      }
      const business = asRecord(document.business);
      return {
        id: toText(business.id),
        username: toText(business.username).trim().toLowerCase(),
        subdomain: toText(business.subdomain).trim().toLowerCase(),
      };
    });
    for (const key of ['id', 'username', 'subdomain'] as const) {
      const values = identities.map((identity) => identity[key]);
      if (
        values.some((value) => !value) ||
        new Set(values).size !== values.length
      ) {
        throw new BadRequestException(
          `Businesses backup contains duplicate or missing ${key} values`,
        );
      }
    }
    if (identities.some((identity) => !UUID_PATTERN.test(identity.id))) {
      throw new BadRequestException('Businesses backup contains invalid IDs');
    }
    const conflicts = await this.databaseService.query<ExistsProbeRow>(
      `SELECT 1 FROM businesses
       WHERE id=ANY($1::uuid[]) OR username=ANY($2::text[]) OR subdomain=ANY($3::text[])
       LIMIT 1`,
      [
        identities.map((identity) => identity.id),
        identities.map((identity) => identity.username),
        identities.map((identity) => identity.subdomain),
      ],
    );
    if (conflicts.rows.length) {
      throw new ConflictException(
        'One or more businesses in this backup already exist',
      );
    }
    const imported = [];
    for (const document of documents) {
      imported.push(await this.importBusiness(document));
    }
    return { imported_businesses: imported.length, businesses: imported };
  }

  async importBusiness(backup: BusinessBackup) {
    if (
      !backup ||
      backup.format !== 'sponsor-krd-business' ||
      backup.version !== 1
    ) {
      throw new BadRequestException(
        'Invalid or unsupported Sponsor.krd business backup',
      );
    }
    const business = asRecord(backup.business);
    const owner = asRecord(backup.owner);
    const identity = asRecord(backup.identity);
    const membership = asRecord(backup.membership);
    const branding = asRecord(backup.branding);
    const defaults = asRecord(backup.defaults);
    const subscription = asRecord(backup.subscription);
    const requiredBusinessFields = ['id', 'username', 'name', 'subdomain'];
    if (
      requiredBusinessFields.some(
        (key) =>
          typeof business[key] !== 'string' || !toText(business[key]).trim(),
      ) ||
      !UUID_PATTERN.test(toText(business.id))
    ) {
      throw new BadRequestException('Business backup is incomplete');
    }
    const hasOwner = Object.keys(owner).length > 0;
    if (
      hasOwner &&
      (!UUID_PATTERN.test(toText(owner.id)) ||
        !UUID_PATTERN.test(toText(membership.id)) ||
        typeof owner.email !== 'string' ||
        typeof owner.display_name !== 'string')
    ) {
      throw new BadRequestException('Business owner backup is incomplete');
    }
    const hasIdentity = Object.keys(identity).length > 0;
    if (
      hasIdentity &&
      (!hasOwner ||
        !UUID_PATTERN.test(toText(identity.id)) ||
        identity.provider !== 'google' ||
        typeof identity.provider_subject !== 'string' ||
        typeof identity.provider_email !== 'string')
    ) {
      throw new BadRequestException('Business identity backup is incomplete');
    }
    const pages = this.validateBackupPages(backup.linktrees, true);
    const businessId = toText(business.id);

    const result = await this.databaseService.transaction(async (client) => {
      const conflict = await client.query<ExistsProbeRow>(
        `SELECT 1 FROM businesses
         WHERE id=$1::uuid OR username=$2 OR subdomain=$3 LIMIT 1`,
        [businessId, toText(business.username), toText(business.subdomain)],
      );
      if (conflict.rows.length) {
        throw new ConflictException(
          'A business with this ID, username, or subdomain already exists',
        );
      }
      if (hasOwner) {
        const ownerConflict = await client.query<ExistsProbeRow>(
          `SELECT 1 FROM users WHERE id=$1::uuid OR email=$2 LIMIT 1`,
          [owner.id, toText(owner.email).trim().toLowerCase()],
        );
        if (ownerConflict.rows.length) {
          throw new ConflictException(
            'A user with this ID or email already exists',
          );
        }
      }
      if (hasIdentity) {
        const identityConflict = await client.query<ExistsProbeRow>(
          `SELECT 1 FROM user_identities
           WHERE id=$1::uuid OR (provider=$2 AND provider_subject=$3) LIMIT 1`,
          [identity.id, identity.provider, identity.provider_subject],
        );
        if (identityConflict.rows.length) {
          throw new ConflictException('This login identity already exists');
        }
      }
      const plan = await client.query<SubscriptionPlanLookupRow>(
        `SELECT sp.id AS subscription_plan_id, sp.permission_profile_id AS plan_id,
                pc.id AS plan_configuration_id
         FROM billing_subscription_plans sp
         JOIN billing_plan_configurations pc ON pc.plan_id=sp.permission_profile_id
         WHERE sp.code=$1 AND sp.status='active' LIMIT 1`,
        [toText(subscription.plan_code)],
      );
      if (!plan.rows.length) {
        throw new BadRequestException(
          `Subscription plan is unavailable: ${toText(subscription.plan_code)}`,
        );
      }

      await client.query(
        `INSERT INTO businesses (
           id, username, name, email, phone, subdomain, status, plan, max_linktrees,
           last_login_at, profile_changed_at,
           onboarding_step, onboarding_version, onboarding_completed_at,
           account_type, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'business',$15,$16)`,
        [
          businessId,
          toText(business.username).trim().toLowerCase(),
          toText(business.name).trim(),
          toText(business.email).trim() || null,
          toText(business.phone).trim() || null,
          toText(business.subdomain).trim().toLowerCase(),
          business.status === 'suspended' ? 'suspended' : 'active',
          ['trial', 'premium', 'enterprise'].includes(toText(business.plan))
            ? business.plan
            : 'trial',
          Number(business.max_linktrees) > 0
            ? Number(business.max_linktrees)
            : 5,
          business.last_login_at || null,
          business.profile_changed_at || null,
          [1, 2, 3].includes(Number(business.onboarding_step))
            ? Number(business.onboarding_step)
            : 3,
          toText(business.onboarding_version) || '2026-08',
          business.onboarding_completed_at || null,
          business.created_at || new Date(),
          business.updated_at || new Date(),
        ],
      );
      // The insert trigger creates the current default plan; replace that row
      // with the exported subscription below.
      await client.query(
        'DELETE FROM business_subscriptions WHERE business_id=$1::uuid',
        [businessId],
      );
      if (hasOwner) {
        await client.query(
          `INSERT INTO users
             (id,email,display_name,avatar_url,status,last_login_at,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            owner.id,
            toText(owner.email).trim().toLowerCase(),
            owner.display_name,
            toText(owner.avatar_url) || null,
            owner.status === 'suspended' ? 'suspended' : 'active',
            owner.last_login_at || null,
            owner.created_at || new Date(),
            owner.updated_at || new Date(),
          ],
        );
        if (hasIdentity) {
          await client.query(
            `INSERT INTO user_identities (
               id,user_id,provider,provider_subject,provider_email,email_verified,
               profile,last_authenticated_at,created_at,updated_at)
             VALUES ($1,$2,'google',$3,$4,$5,$6::jsonb,$7,$8,$9)`,
            [
              identity.id,
              owner.id,
              identity.provider_subject,
              toText(identity.provider_email).trim().toLowerCase(),
              identity.email_verified === true,
              JSON.stringify(asRecord(identity.profile)),
              identity.last_authenticated_at || new Date(),
              identity.created_at || new Date(),
              identity.updated_at || new Date(),
            ],
          );
        }
        await client.query(
          `INSERT INTO business_memberships
             (id,business_id,user_id,role,status,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            membership.id,
            businessId,
            owner.id,
            ['owner', 'admin', 'member'].includes(toText(membership.role))
              ? membership.role
              : 'owner',
            membership.status === 'suspended' ? 'suspended' : 'active',
            membership.created_at || new Date(),
            membership.updated_at || new Date(),
          ],
        );
      }
      await client.query(
        `INSERT INTO business_branding
           (business_id,logo,favicon,default_avatar,website_color,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          businessId,
          toText(branding.logo) || BUSINESS_LOGO_PLACEHOLDER,
          toText(branding.favicon) || BUSINESS_FAVICON_PLACEHOLDER,
          toText(branding.default_avatar) || DEFAULT_AVATAR,
          toText(branding.website_color) || null,
          branding.updated_at || new Date(),
        ],
      );
      await client.query(
        `INSERT INTO business_defaults (
           business_id,footer_text,footer_phone,footer_hidden,template_key,
           background_color,whatsapp_enabled,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          businessId,
          toText(defaults.footer_text) || null,
          toText(defaults.footer_phone) || null,
          defaults.footer_hidden !== false,
          toText(defaults.template_key) || DEFAULT_LINKTREE_TEMPLATE_KEY,
          toText(defaults.background_color) ||
            DEFAULT_LINKTREE_BACKGROUND_COLOR,
          defaults.whatsapp_enabled === true,
          defaults.updated_at || new Date(),
        ],
      );
      const resolvedPlan = plan.rows[0];
      await client.query(
        `INSERT INTO business_subscriptions (
           id,business_id,subscription_plan_id,plan_id,plan_configuration_id,
           status,billing_cycle,starts_at,current_period_start,current_period_end,
           cancels_at,ended_at,metadata,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15)`,
        [
          UUID_PATTERN.test(toText(subscription.id))
            ? subscription.id
            : randomUUID(),
          businessId,
          resolvedPlan.subscription_plan_id,
          resolvedPlan.plan_id,
          resolvedPlan.plan_configuration_id,
          [
            'trialing',
            'active',
            'past_due',
            'grace_period',
            'paused',
            'canceled',
            'expired',
            'incomplete',
          ].includes(toText(subscription.status))
            ? subscription.status
            : 'active',
          ['free', 'monthly', 'yearly', 'custom'].includes(
            toText(subscription.billing_cycle),
          )
            ? subscription.billing_cycle
            : 'free',
          subscription.starts_at || new Date(),
          subscription.current_period_start || new Date(),
          subscription.current_period_end || null,
          subscription.cancels_at || null,
          subscription.ended_at || null,
          JSON.stringify(asRecord(subscription.metadata)),
          subscription.created_at || new Date(),
          subscription.updated_at || new Date(),
        ],
      );
      const imported = await this.importLinktreePages(
        client,
        businessId,
        pages,
        true,
      );
      return { business_id: businessId, ...imported };
    });
    await this.restoreBackupAssets(businessId, backup);
    await this.refreshBusinessRuntimeState(businessId);
    return result;
  }
}
