import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import {
  DEFAULT_LINKTREE_BACKGROUND_COLOR,
  DEFAULT_LINKTREE_TEMPLATE_KEY,
} from '../common/linktree-defaults';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import { hashPassword } from './password-hashing';
import * as crypto from 'crypto';
import { SecurityAuditService } from './security-audit.service';
import { EntitlementService } from '../billing/entitlement.service';
import { SecretCryptoService } from './secret-crypto.service';
import { TemplateAccessService } from '../billing/template-access.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
    @Optional() private readonly entitlementService?: EntitlementService,
    @Optional() private readonly secretCrypto?: SecretCryptoService,
    @Optional() private readonly templateAccessService?: TemplateAccessService,
    @Optional() private readonly storageService?: StorageService,
  ) {}

  private async auditLogin(input: {
    actorType: 'anonymous' | 'business' | 'platform-admin';
    actorId?: string;
    actorLabel?: string;
    businessId?: string;
    outcome: 'success' | 'failure' | 'denied';
    clientIp: string;
    userAgent: string;
    requestedSubdomain?: string;
  }): Promise<void> {
    await this.securityAuditService?.record({
      actorType: input.actorType,
      actorId: input.actorId,
      actorLabel: input.actorLabel,
      businessId: input.businessId,
      eventType:
        input.actorType === 'platform-admin'
          ? 'platform_admin.login'
          : 'business.login',
      outcome: input.outcome,
      ipAddress: input.clientIp,
      userAgent: input.userAgent,
      metadata: input.requestedSubdomain
        ? { requestedSubdomain: input.requestedSubdomain }
        : {},
    });
  }

  async getBusinessOnboarding(businessId: string) {
    const result = await this.databaseService.query(
      `SELECT business.onboarding_step AS "step",
              business.onboarding_version AS "version",
              business.onboarding_completed_at AS "completedAt",
              business.name,
              business.phone,
              business.subdomain,
              COALESCE(owner_account.display_name, business.name) AS "ownerName",
              COALESCE(owner_account.email, business.email) AS "ownerEmail",
              COALESCE(branding.logo, '/images/Logo.jpg') AS logo,
              COALESCE(branding.favicon, '/favicon.ico') AS favicon,
              COALESCE(branding.default_avatar, '/images/DefaultAvatar.png') AS "defaultAvatar",
              COALESCE(branding.website_color, '#b6f20d') AS "websiteColor",
              defaults.footer_text AS "footerText",
              defaults.footer_phone AS "footerPhone",
              COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                  'id', pixel.id,
                  'pixel_id', pixel.pixel_id,
                  'events_token', CASE WHEN pixel.token_last_four IS NULL THEN '' ELSE '••••' || pixel.token_last_four END
                ) ORDER BY pixel.display_order)
                FROM business_tiktok_pixels pixel
                WHERE pixel.business_id = business.id AND pixel.status = 'active'
              ), '[]'::jsonb) AS "tiktokConfigs"
       FROM businesses business
       LEFT JOIN business_branding branding ON branding.business_id = business.id
       LEFT JOIN business_defaults defaults ON defaults.business_id = business.id
       LEFT JOIN LATERAL (
         SELECT users.display_name, users.email
         FROM business_memberships membership
         JOIN users ON users.id = membership.user_id
         WHERE membership.business_id = business.id
           AND membership.role = 'owner'
           AND membership.status = 'active'
         ORDER BY membership.created_at ASC
         LIMIT 1
       ) owner_account ON true
       WHERE business.id = $1`,
      [businessId],
    );
    if (!result.rows[0]) throw new BadRequestException('Business not found');
    return result.rows[0];
  }

  async assertBusinessOnboardingPending(businessId: string): Promise<void> {
    const result = await this.databaseService.query(
      `SELECT 1 FROM businesses
       WHERE id = $1 AND onboarding_completed_at IS NULL`,
      [businessId],
    );
    if (!result.rows[0]) {
      throw new BadRequestException('Business onboarding is already complete');
    }
  }

  async updateBusinessOnboarding(
    businessId: string,
    input: {
      step: number;
      logo?: string;
      favicon?: string;
      defaultAvatar?: string;
      websiteColor?: string;
      footerText?: string;
      footerPhone?: string;
      name?: string;
      phone?: string;
      tiktokConfigs?: unknown[];
    },
  ) {
    await this.databaseService.transaction(async (client) => {
      const current = await client.query<{
        onboarding_completed_at: Date | null;
      }>(
        `SELECT onboarding_completed_at FROM businesses
         WHERE id = $1 FOR UPDATE`,
        [businessId],
      );
      if (!current.rows[0]) throw new BadRequestException('Business not found');
      if (current.rows[0].onboarding_completed_at) {
        throw new BadRequestException(
          'Business onboarding is already complete',
        );
      }
      if (input.name || input.phone) {
        await client.query(
          `UPDATE businesses
           SET name = COALESCE(NULLIF(BTRIM($2), ''), name),
               phone = COALESCE(NULLIF(BTRIM($3), ''), phone),
               updated_at = NOW()
           WHERE id = $1`,
          [businessId, input.name ?? '', input.phone ?? ''],
        );
      }
      await client.query(
        `INSERT INTO business_branding
          (business_id, logo, favicon, default_avatar, website_color)
         VALUES ($1, COALESCE($2, '/images/Logo.jpg'),
                 COALESCE($3, '/favicon.ico'),
                 COALESCE($4, '/images/DefaultAvatar.png'),
                 COALESCE($5, '#b6f20d'))
         ON CONFLICT (business_id) DO UPDATE SET
           logo = COALESCE($2, business_branding.logo),
           favicon = COALESCE($3, business_branding.favicon),
           default_avatar = COALESCE($4, business_branding.default_avatar),
           website_color = COALESCE($5, business_branding.website_color),
           updated_at = NOW()`,
        [
          businessId,
          input.logo || null,
          input.favicon || null,
          input.defaultAvatar || null,
          input.websiteColor || null,
        ],
      );
      await client.query(
        `INSERT INTO business_defaults (business_id, footer_text, footer_phone)
         VALUES ($1, NULLIF($2, ''), NULLIF($3, ''))
         ON CONFLICT (business_id) DO UPDATE SET
           footer_text = COALESCE(NULLIF($2, ''), business_defaults.footer_text),
           footer_phone = COALESCE(NULLIF($3, ''), business_defaults.footer_phone),
           updated_at = NOW()`,
        [businessId, input.footerText ?? '', input.footerPhone ?? ''],
      );
      if (input.tiktokConfigs !== undefined) {
        const configs = this.normalizeTikTokConfigs(input.tiktokConfigs);
        const allowedGroups = this.entitlementService
          ? await this.entitlementService.getInteger(
              businessId,
              'limit.tiktok_pixels',
              0,
            )
          : 0;
        if (allowedGroups !== -1 && configs.length > allowedGroups) {
          throw new ForbiddenException(
            'The TikTok pixel limit has been reached',
          );
        }

        const retainedIds: string[] = [];
        for (const [index, config] of configs.entries()) {
          const existing = await client.query<{
            id: string;
            encrypted_events_token: Buffer | null;
            token_last_four: string | null;
          }>(
            `SELECT id, encrypted_events_token, token_last_four
                 FROM business_tiktok_pixels
                 WHERE business_id = $2::uuid
                   AND (($1::uuid IS NOT NULL AND id = $1::uuid) OR pixel_id = $3)
                 FOR UPDATE`,
            [config.id || null, businessId, config.pixel_id],
          );
          const existingRow = existing.rows[0];
          const encryptedToken = config.events_token
            ? this.requireSecretCrypto().encryptJson({
                events_token: config.events_token,
              })
            : config.keep_events_token
              ? existingRow?.encrypted_events_token || null
              : null;
          const tokenLastFour = config.events_token
            ? config.events_token.slice(-4)
            : config.keep_events_token
              ? existingRow?.token_last_four || null
              : null;
          const saved = existingRow
            ? await client.query<{ id: string }>(
                `UPDATE business_tiktok_pixels
                 SET pixel_id = $3, encrypted_events_token = $4,
                     token_last_four = $5, display_order = $6,
                     status = 'active', updated_at = NOW()
                 WHERE id = $1::uuid AND business_id = $2::uuid
                 RETURNING id`,
                [
                  existingRow.id,
                  businessId,
                  config.pixel_id,
                  encryptedToken,
                  tokenLastFour,
                  index,
                ],
              )
            : await client.query<{ id: string }>(
                `INSERT INTO business_tiktok_pixels
                  (business_id, pixel_id, encrypted_events_token, token_last_four, display_order, status)
                 VALUES ($1::uuid, $2, $3, $4, $5, 'active')
                 RETURNING id`,
                [
                  businessId,
                  config.pixel_id,
                  encryptedToken,
                  tokenLastFour,
                  index,
                ],
              );
          retainedIds.push(saved.rows[0].id);
        }
        await client.query(
          `UPDATE business_tiktok_pixels
           SET status = 'inactive', updated_at = NOW()
           WHERE business_id = $1::uuid AND NOT (id = ANY($2::uuid[]))`,
          [businessId, retainedIds],
        );
      }
      await client.query(
        `UPDATE businesses
         SET onboarding_step = GREATEST(onboarding_step, $2), updated_at = NOW()
         WHERE id = $1`,
        [businessId, Math.min(2, Math.max(1, input.step))],
      );
    });
    return this.getBusinessOnboarding(businessId);
  }

  async completeBusinessOnboarding(businessId: string) {
    const result = await this.databaseService.query<{
      completedAt: Date;
    }>(
      `UPDATE businesses
       SET onboarding_step = 3, onboarding_version = '2026-08',
           onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
           updated_at = NOW()
       WHERE id = $1 AND onboarding_step >= 2
       RETURNING onboarding_completed_at AS "completedAt"`,
      [businessId],
    );
    if (!result.rows[0]) {
      throw new BadRequestException('Complete the setup steps first');
    }
    return { completed: true, completedAt: result.rows[0].completedAt };
  }

  async login(
    username: string,
    password: string,
    rememberMe: boolean,
    clientIp: string,
    userAgent: string,
    requestSubdomain: string,
  ) {
    // 1. Find business by username
    const businessRes = await this.databaseService.query<{
      id: string;
      username: string;
      name: string;
      password_hash: string;
      status: string;
      subdomain: string | null;
    }>(
      'SELECT id, username, name, password_hash, status, subdomain FROM businesses WHERE username = $1',
      [username],
    );

    if (!businessRes.rows || businessRes.rows.length === 0) {
      await this.auditLogin({
        actorType: 'anonymous',
        outcome: 'failure',
        clientIp,
        userAgent,
        requestedSubdomain: requestSubdomain,
      });
      throw new UnauthorizedException('Invalid username or password');
    }

    const business = businessRes.rows[0];

    // 2. Check status
    if (business.status !== 'active') {
      await this.auditLogin({
        actorType: 'business',
        actorId: business.id,
        actorLabel: business.name,
        businessId: business.id,
        outcome: 'denied',
        clientIp,
        userAgent,
        requestedSubdomain: requestSubdomain,
      });
      throw new UnauthorizedException('Invalid username or password');
    }

    // 3. Verify password with bcrypt
    const passwordValid = await bcrypt.compare(
      password,
      business.password_hash,
    );
    if (!passwordValid) {
      await this.auditLogin({
        actorType: 'business',
        actorId: business.id,
        actorLabel: business.name,
        businessId: business.id,
        outcome: 'failure',
        clientIp,
        userAgent,
        requestedSubdomain: requestSubdomain,
      });
      throw new UnauthorizedException('Invalid username or password');
    }

    // 4. Subdomain validation
    if (!requestSubdomain) {
      await this.auditLogin({
        actorType: 'business',
        actorId: business.id,
        actorLabel: business.name,
        businessId: business.id,
        outcome: 'denied',
        clientIp,
        userAgent,
      });
      throw new UnauthorizedException('Invalid username or password');
    }
    if (!business.subdomain) {
      await this.auditLogin({
        actorType: 'business',
        actorId: business.id,
        actorLabel: business.name,
        businessId: business.id,
        outcome: 'denied',
        clientIp,
        userAgent,
        requestedSubdomain: requestSubdomain,
      });
      throw new UnauthorizedException('Invalid username or password');
    }
    if (business.subdomain !== requestSubdomain) {
      await this.auditLogin({
        actorType: 'business',
        actorId: business.id,
        actorLabel: business.name,
        businessId: business.id,
        outcome: 'denied',
        clientIp,
        userAgent,
        requestedSubdomain: requestSubdomain,
      });
      throw new UnauthorizedException('Invalid username or password');
    }

    await this.databaseService.query(
      'DELETE FROM business_sessions WHERE session_expires_at < NOW()',
    );

    // 5. Create session
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    const sessionTokenHash = crypto
      .createHash('sha256')
      .update(sessionToken)
      .digest('hex');
    const sessionDuration = rememberMe
      ? 365 * 24 * 60 * 60 * 1000
      : 30 * 60 * 1000;
    const sessionExpiresAt = new Date(Date.now() + sessionDuration);
    const safeIp = normalizeInet(clientIp);

    await this.databaseService.query(
      'DELETE FROM business_sessions WHERE business_id = $1',
      [business.id],
    );
    await this.redisService.clearBusinessSessions(business.id);
    await this.databaseService.query(
      `INSERT INTO business_sessions (business_id, session_token_hash, session_expires_at, ip_address, user_agent, last_used_at)
       VALUES ($1, $2, $3, $4::inet, $5, NOW())
       ON CONFLICT (session_token_hash) DO UPDATE SET session_expires_at = EXCLUDED.session_expires_at, last_used_at = NOW()`,
      [business.id, sessionTokenHash, sessionExpiresAt, safeIp, userAgent],
    );

    // Update last login
    await this.databaseService.query(
      'UPDATE businesses SET last_login_at = NOW(), last_login_ip = $1::inet WHERE id = $2',
      [safeIp, business.id],
    );

    const user = {
      id: business.id,
      username: business.username,
      name: business.name,
      role: 'business' as const,
      subdomain: business.subdomain,
    };

    const ttlSeconds = rememberMe ? 365 * 24 * 60 * 60 : 30 * 60;
    await this.redisService.set(
      `session:${sessionTokenHash}`,
      user,
      ttlSeconds,
    );
    await this.redisService.trackBusinessSession(
      user.id,
      sessionTokenHash,
      ttlSeconds,
    );
    await this.auditLogin({
      actorType: 'business',
      actorId: business.id,
      actorLabel: business.name,
      businessId: business.id,
      outcome: 'success',
      clientIp,
      userAgent,
      requestedSubdomain: requestSubdomain,
    });

    return { sessionToken, user, ttlSeconds };
  }

  private normalizeTikTokConfig(value: unknown): {
    id?: string;
    pixel_id: string;
    events_token?: string;
    keep_events_token: boolean;
  } {
    if (!value || typeof value !== 'object') {
      return { pixel_id: '', keep_events_token: false };
    }
    const config = value as Record<string, unknown>;
    const eventsToken = this.stringValue(config.events_token).trim();
    const id = this.stringValue(config.id).trim();
    return {
      ...(id && /^[0-9a-f-]{36}$/i.test(id) ? { id } : {}),
      pixel_id: this.stringValue(config.pixel_id).trim(),
      ...(eventsToken && !eventsToken.startsWith('••••')
        ? { events_token: eventsToken.slice(0, 4096) }
        : {}),
      keep_events_token:
        config.keep_events_token === true || eventsToken.startsWith('••••'),
    };
  }

  private normalizeTikTokConfigs(value: unknown): Array<{
    id?: string;
    pixel_id: string;
    events_token?: string;
    keep_events_token: boolean;
  }> {
    const source = Array.isArray(value) ? value : [];
    const configs = source.map((item) => this.normalizeTikTokConfig(item));
    if (configs.some((item) => !item.pixel_id)) {
      throw new BadRequestException('Pixel ID is required');
    }
    if (configs.some((item) => !/^[A-Za-z0-9_-]{8,255}$/.test(item.pixel_id))) {
      throw new BadRequestException('Invalid TikTok Pixel ID');
    }
    if (new Set(configs.map((item) => item.pixel_id)).size !== configs.length) {
      throw new BadRequestException('TikTok Pixel IDs must be unique');
    }
    return configs;
  }

  private async clearBusinessPublicLinktreeCache(
    businessId: string,
    subdomain?: string | null,
  ): Promise<void> {
    const cleanSubdomain = subdomain?.trim().toLowerCase();
    if (!cleanSubdomain) return;

    const linktrees = await this.databaseService.query<{
      uid: string;
      seo_name: string;
    }>('SELECT uid, seo_name FROM linktrees WHERE business_id = $1', [
      businessId,
    ]);

    const keys = new Set<string>();
    for (const row of linktrees.rows || []) {
      if (row.uid) {
        keys.add(`cache:linktree:uid:${row.uid}:sub:${cleanSubdomain}`);
        keys.add(`cache:linktree:uid:${row.uid}`);
      }
      if (row.seo_name) {
        keys.add(`cache:linktree:uid:${row.seo_name}:sub:${cleanSubdomain}`);
        keys.add(`cache:linktree:uid:${row.seo_name}`);
      }
    }
    keys.add(`cache:linktree:uid:id:sub:${cleanSubdomain}`);
    keys.add('cache:linktree:uid:id');

    await Promise.all(
      [...keys].map((key) => this.redisService.del(key).catch(() => undefined)),
    );
  }

  private stringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  /**
   * Fetch the business profile including website_color for theming and linktree defaults.
   */
  async getBusinessProfile(businessId: string): Promise<{
    id: string;
    username: string;
    name: string;
    phone?: string | null;
    logo?: string | null;
    favicon?: string | null;
    default_avatar?: string | null;
    website_color?: string | null;
    default_footer_text?: string | null;
    default_footer_phone?: string | null;
    default_template?: string | null;
    default_background_color?: string | null;
    default_footer_hidden?: boolean;
    default_whatsapp_enabled?: boolean;
    onboarding_step?: number;
    onboarding_completed_at?: string | null;
  } | null> {
    const res = await this.databaseService.query<{
      id: string;
      username: string;
      name: string;
      phone: string | null;
      logo: string | null;
      favicon: string | null;
      default_avatar: string | null;
      website_color: string | null;
      default_footer_text: string | null;
      default_footer_phone: string | null;
      default_template: string | null;
      default_background_color: string | null;
      default_footer_hidden: boolean;
      default_whatsapp_enabled: boolean;
      onboarding_step: number;
      onboarding_completed_at: string | null;
    }>(
      // No pixel ids: this feeds the authenticated dashboard, which never
      // loads a pixel. Only the two public pages do — see docs/tracking.md.
      `SELECT a.id, a.username, a.name, a.phone, a.onboarding_step,
              a.onboarding_completed_at,
              b.logo, b.favicon, b.website_color, b.default_avatar,
              d.footer_text AS default_footer_text, d.footer_phone AS default_footer_phone,
              d.template_key AS default_template, d.background_color AS default_background_color,
              d.footer_hidden AS default_footer_hidden, d.whatsapp_enabled AS default_whatsapp_enabled
       FROM businesses a
       LEFT JOIN business_branding b ON b.business_id = a.id
       LEFT JOIN business_defaults d ON d.business_id = a.id
       WHERE a.id = $1`,
      [businessId],
    );
    return res.rows[0] || null;
  }

  /**
   * Fetch website_color for a given subdomain (public, no auth required).
   * Returns null if subdomain not found or business is inactive.
   */
  async getBusinessSettings(businessId: string) {
    const result = await this.databaseService.query(
      `SELECT a.name, a.username, a.phone, a.email, a.subdomain, b.logo, b.favicon, b.default_avatar, b.website_color,
              d.footer_text AS default_footer_text, d.footer_phone AS default_footer_phone,
              d.template_key AS default_template, d.background_color AS default_background_color,
              d.footer_hidden AS default_footer_hidden, d.whatsapp_enabled AS default_whatsapp_enabled,
              COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', pixel.id,
                'pixel_id', pixel.pixel_id,
                'events_token', '',
                'has_events_token', pixel.encrypted_events_token IS NOT NULL,
                'token_last_four', pixel.token_last_four,
                'display_order', pixel.display_order,
                'status', pixel.status
              ) ORDER BY pixel.display_order)
              FROM business_tiktok_pixels pixel
              WHERE pixel.business_id=a.id AND pixel.status='active'), '[]'::jsonb) AS tiktok_configs,
              CASE WHEN r.status='pending' THEN r.changes ELSE NULL END AS pending_profile_changes,
              r.status AS profile_request_status
       FROM businesses a LEFT JOIN business_branding b ON b.business_id=a.id
       LEFT JOIN business_defaults d ON d.business_id=a.id
       LEFT JOIN business_profile_change_requests r ON r.business_id=a.id
       WHERE a.id=$1`,
      [businessId],
    );
    if (!result.rows.length)
      throw new BadRequestException('Business not found');
    return result.rows[0];
  }

  async getBusinessTemplateAccess(businessId: string) {
    return {
      template_keys: this.templateAccessService
        ? await this.templateAccessService.getEffectiveKeys(businessId)
        : [],
    };
  }

  async updateBusinessSettings(
    businessId: string,
    body: Record<string, unknown>,
  ) {
    const section = this.stringValue(body.section);
    if (!['profile', 'defaults', 'security', 'integrations'].includes(section))
      throw new BadRequestException('Invalid settings section');
    if (section === 'profile') {
      const hasName = typeof body.name === 'string';
      const name = this.stringValue(body.name).trim();
      const hasUsername = typeof body.username === 'string';
      const username = this.stringValue(body.username).trim().toLowerCase();
      if (hasUsername && !/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)) {
        throw new BadRequestException(
          'Username must contain 3-50 lowercase letters, numbers, dots, underscores, or hyphens',
        );
      }
      if (
        hasUsername &&
        !Object.keys(body).some((key) =>
          [
            'name',
            'phone',
            'logo',
            'favicon',
            'default_avatar',
            'website_color',
          ].includes(key),
        )
      ) {
        try {
          await this.databaseService.query(
            `UPDATE businesses
             SET username=$2, updated_at=NOW()
             WHERE id=$1::uuid`,
            [businessId, username],
          );
        } catch (error) {
          if ((error as { code?: string }).code === '23505') {
            throw new ConflictException('Username is already in use');
          }
          throw error;
        }
        return this.getBusinessSettings(businessId);
      }
      if (hasName && name.length < 2)
        throw new BadRequestException('Business name is required');
      const previousBranding = await this.databaseService.query<{
        logo: string | null;
        favicon: string | null;
        default_avatar: string | null;
        website_color: string | null;
      }>(
        `SELECT logo,favicon,default_avatar,website_color FROM business_branding
         WHERE business_id=$1::uuid`,
        [businessId],
      );
      const currentBranding = previousBranding.rows[0];
      const nextLogo = Object.hasOwn(body, 'logo')
        ? this.stringValue(body.logo).trim() || '/images/Logo.jpg'
        : currentBranding?.logo || '/images/Logo.jpg';
      const nextFavicon = Object.hasOwn(body, 'favicon')
        ? this.stringValue(body.favicon).trim() || '/favicon.ico'
        : currentBranding?.favicon || '/favicon.ico';
      const nextDefaultAvatar = Object.hasOwn(body, 'default_avatar')
        ? this.stringValue(body.default_avatar).trim() ||
          '/images/DefaultAvatar.png'
        : currentBranding?.default_avatar || '/images/DefaultAvatar.png';
      const websiteColor = Object.hasOwn(body, 'website_color')
        ? this.stringValue(body.website_color, '#b6f20d').trim()
        : currentBranding?.website_color || '#b6f20d';
      if (
        !/^#[0-9a-f]{6}$/i.test(websiteColor) &&
        !websiteColor.startsWith('gradient:')
      )
        throw new BadRequestException('Invalid website color');
      const monthlyLimit = this.entitlementService
        ? await this.entitlementService.getInteger(
            businessId,
            'limit.profile_changes_monthly',
            0,
          )
        : -1;
      await this.databaseService.transaction(async (client) => {
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,
          [`profile-change:${businessId}`],
        );
        const usage = await client.query<{ used: number }>(
          `SELECT COALESCE(SUM(used),0)::int AS used
           FROM billing_usage_counters
           WHERE business_id=$1::uuid
             AND entitlement_key='limit.profile_changes_monthly'
             AND period_start<=NOW() AND period_end>NOW()`,
          [businessId],
        );
        if (
          monthlyLimit !== -1 &&
          Number(usage.rows[0]?.used || 0) >= monthlyLimit
        ) {
          throw new ForbiddenException(
            'The monthly profile change limit has been reached',
          );
        }
        try {
          await client.query(
            `UPDATE businesses
             SET username=CASE WHEN $2::boolean THEN $3 ELSE username END,
                 name=CASE WHEN $4::boolean THEN $5 ELSE name END,
                 phone=CASE WHEN $6::boolean THEN $7 ELSE phone END,
                 updated_at=NOW()
             WHERE id=$1::uuid`,
            [
              businessId,
              hasUsername,
              username || null,
              hasName,
              name || null,
              typeof body.phone === 'string',
              this.stringValue(body.phone).trim() || null,
            ],
          );
        } catch (error) {
          if ((error as { code?: string }).code === '23505') {
            throw new ConflictException('Username is already in use');
          }
          throw error;
        }
        await client.query(
          `INSERT INTO business_branding
            (business_id,logo,favicon,default_avatar,website_color)
           VALUES ($1::uuid,$2,$3,$4,$5)
           ON CONFLICT (business_id) DO UPDATE SET
             logo=EXCLUDED.logo, favicon=EXCLUDED.favicon,
             default_avatar=EXCLUDED.default_avatar,
             website_color=EXCLUDED.website_color, updated_at=NOW()`,
          [businessId, nextLogo, nextFavicon, nextDefaultAvatar, websiteColor],
        );
        await client.query(
          `INSERT INTO billing_usage_counters
            (business_id,entitlement_key,period_start,period_end,used)
           VALUES (
             $1::uuid,'limit.profile_changes_monthly',
             date_trunc('month',NOW()),
             date_trunc('month',NOW()) + INTERVAL '1 month',1
           )
           ON CONFLICT (business_id,entitlement_key,period_start)
           DO UPDATE SET used=billing_usage_counters.used+1,updated_at=NOW()`,
          [businessId],
        );
      });
      await this.storageService?.claimBusinessAssets(
        businessId,
        nextLogo,
        nextFavicon,
        nextDefaultAvatar,
      );
      await this.storageService?.deleteUnreferencedFromValues(
        previousBranding.rows[0],
      );
      const business = await this.databaseService.query<{
        subdomain: string | null;
      }>('SELECT subdomain FROM businesses WHERE id = $1', [businessId]);
      await this.clearBusinessPublicLinktreeCache(
        businessId,
        business.rows[0]?.subdomain,
      );
      // Keep the login valid while forcing the next request to reload the
      // changed name and username from PostgreSQL.
      await this.redisService.clearBusinessSessions(businessId);
    } else if (section === 'defaults') {
      await this.databaseService.query(
        `INSERT INTO business_defaults (business_id,footer_text,footer_phone,template_key,background_color,footer_hidden,whatsapp_enabled) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (business_id) DO UPDATE SET footer_text=EXCLUDED.footer_text,footer_phone=EXCLUDED.footer_phone,template_key=EXCLUDED.template_key,background_color=EXCLUDED.background_color,footer_hidden=EXCLUDED.footer_hidden,whatsapp_enabled=EXCLUDED.whatsapp_enabled,updated_at=NOW()`,
        [
          businessId,
          body.default_footer_text || null,
          body.default_footer_phone || null,
          body.default_template || DEFAULT_LINKTREE_TEMPLATE_KEY,
          body.default_background_color || DEFAULT_LINKTREE_BACKGROUND_COLOR,
          !!body.default_footer_hidden,
          !!body.default_whatsapp_enabled,
        ],
      );
    } else if (section === 'security') {
      const currentPassword = this.stringValue(body.current_password);
      const newPassword = this.stringValue(body.new_password);
      const email = this.stringValue(body.email).trim() || null;
      if (newPassword.length < 8)
        throw new BadRequestException(
          'New password must contain at least 8 characters',
        );
      const current = await this.databaseService.query<{
        password_hash: string;
      }>('SELECT password_hash FROM businesses WHERE id=$1', [businessId]);
      if (
        !current.rows.length ||
        !(await bcrypt.compare(currentPassword, current.rows[0].password_hash))
      )
        throw new BadRequestException('Current password is incorrect');
      await this.databaseService.query(
        'UPDATE businesses SET password_hash=$1, email=$2, updated_at=NOW() WHERE id=$3',
        [await hashPassword(newPassword), email, businessId],
      );
    } else {
      const configs = this.normalizeTikTokConfigs(body.tiktok_configs);
      const allowedGroups = this.entitlementService
        ? await this.entitlementService.getInteger(
            businessId,
            'limit.tiktok_pixels',
            0,
          )
        : 0;
      if (allowedGroups !== -1 && configs.length > allowedGroups) {
        throw new ForbiddenException('The TikTok pixel limit has been reached');
      }
      await this.databaseService.transaction(async (client) => {
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
          [`tiktok:${businessId}`],
        );
        const existingResult = await client.query<{
          id: string;
          pixel_id: string;
          encrypted_events_token: Buffer | null;
          token_last_four: string | null;
          status: string;
        }>(
          `SELECT id, pixel_id, encrypted_events_token, token_last_four, status
           FROM business_tiktok_pixels
           WHERE business_id=$1::uuid
           FOR UPDATE`,
          [businessId],
        );
        const existingById = new Map(
          existingResult.rows.map((row) => [row.id, row]),
        );
        const existingByPixelId = new Map(
          existingResult.rows.map((row) => [row.pixel_id, row]),
        );
        const activeExistingCount = existingResult.rows.filter(
          (row) => row.status === 'active',
        ).length;
        if (activeExistingCount > 0 && configs.length === 0) {
          throw new BadRequestException(
            'At least one TikTok pixel group must remain active',
          );
        }
        const retainedIds: string[] = [];

        for (const [index, config] of configs.entries()) {
          const eventsToken = config.events_token || '';
          const existing =
            (config.id && existingById.get(config.id)) ||
            existingByPixelId.get(config.pixel_id);
          const preserveExistingToken =
            config.keep_events_token && existing?.encrypted_events_token;
          const encryptedToken = eventsToken
            ? this.requireSecretCrypto().encryptJson({
                events_token: eventsToken,
              })
            : preserveExistingToken || null;
          const tokenLastFour = eventsToken
            ? eventsToken.slice(-4)
            : preserveExistingToken
              ? existing?.token_last_four || null
              : null;

          const saved = existing
            ? await client.query<{ id: string }>(
                `UPDATE business_tiktok_pixels
                 SET pixel_id=$3,
                     encrypted_events_token=$4,
                     token_last_four=$5,
                     display_order=$6,
                     status='active',
                     updated_at=NOW()
                 WHERE id=$1::uuid AND business_id=$2::uuid
                 RETURNING id`,
                [
                  existing.id,
                  businessId,
                  config.pixel_id,
                  encryptedToken,
                  tokenLastFour,
                  index,
                ],
              )
            : await client.query<{ id: string }>(
                `INSERT INTO business_tiktok_pixels
                  (business_id,pixel_id,encrypted_events_token,token_last_four,display_order,status)
                 VALUES ($1::uuid,$2,$3,$4,$5,'active')
                 RETURNING id`,
                [
                  businessId,
                  config.pixel_id,
                  encryptedToken,
                  tokenLastFour,
                  index,
                ],
              );
          retainedIds.push(saved.rows[0].id);
        }

        await client.query(
          `UPDATE business_tiktok_pixels
           SET status='inactive', updated_at=NOW()
           WHERE business_id=$1::uuid
             AND NOT (id = ANY($2::uuid[]))`,
          [businessId, retainedIds],
        );
      });
      const business = await this.databaseService.query<{
        subdomain: string | null;
      }>('SELECT subdomain FROM businesses WHERE id = $1', [businessId]);
      await this.clearBusinessPublicLinktreeCache(
        businessId,
        business.rows[0]?.subdomain,
      );
    }
    return this.getBusinessSettings(businessId);
  }

  private requireSecretCrypto(): SecretCryptoService {
    if (!this.secretCrypto) {
      throw new Error('Secret encryption service is unavailable');
    }
    return this.secretCrypto;
  }

  async getTikTokSecret(businessId: string, pixelId: string) {
    const result = await this.databaseService.query<{
      encrypted_events_token: Buffer;
      token_last_four: string;
    }>(
      `SELECT encrypted_events_token, token_last_four
       FROM business_tiktok_pixels
       WHERE id=$1::uuid AND business_id=$2::uuid`,
      [pixelId, businessId],
    );
    if (!result.rows[0]) {
      throw new BadRequestException('TikTok pixel not found');
    }
    const decrypted = this.requireSecretCrypto().decryptJson(
      result.rows[0].encrypted_events_token,
    );
    const token = decrypted.events_token ?? decrypted.legacyValue;
    if (typeof token !== 'string' || !token) {
      throw new BadRequestException('TikTok token cannot be decrypted');
    }
    return {
      events_token: token,
      token_last_four: result.rows[0].token_last_four,
    };
  }

  async getSubdomainTheme(subdomain: string): Promise<{
    website_color: string | null;
    name?: string | null;
    favicon?: string | null;
    logo?: string | null;
  } | null> {
    if (!subdomain) return null;
    const res = await this.databaseService.query<{
      website_color: string | null;
      name: string | null;
      favicon: string | null;
      logo: string | null;
    }>(
      // Branding only. This is read by the dashboard shell and the error
      // pages, neither of which is a surface a pixel may load on.
      `SELECT b.website_color, a.name, b.favicon, b.logo
       FROM businesses a
       LEFT JOIN business_branding b ON b.business_id = a.id
       WHERE a.subdomain = $1 AND a.status = 'active' LIMIT 1`,
      [subdomain],
    );
    return res.rows[0] || null;
  }

  /**
   * Fast check: does a subdomain map to an active business?
   * Used by middleware to block /business/* on unregistered subdomains.
   */
  async subdomainExists(subdomain: string): Promise<boolean> {
    if (!subdomain) return false;
    const res = await this.databaseService.query<{ id: string }>(
      `SELECT id FROM businesses WHERE subdomain = $1 AND status = 'active' LIMIT 1`,
      [subdomain],
    );
    return !!(res.rows && res.rows.length > 0);
  }
}

/**
 * Normalize a client IP string to a value Postgres will accept for an `inet` cast.
 * `clientIp` can come from x-forwarded-for, x-real-ip, or fall back to "unknown".
 * Postgres inet rejects: empty strings, "unknown", bare hostnames, IPv6 with zones
 * like "::ffff:1.2.3.4%eth0", and most non-IP literals. We strip any zone id,
 * take the first IP in a comma-separated chain, and fall back to 127.0.0.1 for
 * anything that doesn't parse. Without this, an upstream proxy header change
 * can turn a successful login into a 500 mid-insert.
 */
function normalizeInet(raw: string | undefined | null): string {
  if (!raw) return '127.0.0.1';
  const first = raw.split(',')[0]?.trim();
  if (!first || first === 'unknown' || first === 'localhost')
    return '127.0.0.1';
  // Strip IPv6 zone id (e.g. fe80::1%eth0 → fe80::1)
  const noZone = first.replace(/%.*$/, '').replace(/^"|"$/g, '');
  // Anything that looks like an IPv4 or IPv6 literal: trust it.
  // Postgres accepts ::1, ::ffff:1.2.3.4, 127.0.0.1, etc.
  if (
    (/^[0-9a-fA-F:.]+$/.test(noZone) && noZone.includes(':')) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(noZone)
  ) {
    return noZone;
  }
  return '127.0.0.1';
}
