import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { GoneException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PublicPageAnalyticsService } from '../analytics/public-page-analytics.service';
import {
  ENTITLEMENT,
  allowedTemplateKeySql,
  entitledSql,
} from '../billing/entitlement-sql';
import type {
  LinktreeLink,
  LinktreeStatus,
  PublicLinktree,
  PublicLinktreePayload,
} from '@linktree/types';

/**
 * Row shapes for the public read queries.
 *
 * Declared as type aliases rather than interfaces on purpose: pg constrains the
 * row generic to `QueryResultRow`, and only type aliases pick up the implicit
 * index signature that constraint needs.
 */
type TemplateConfig = Record<string, unknown> & {
  templateKey?: string;
  type?: string;
  buttonStyle?: string;
  buttonGradient?: boolean;
  whatsapp_modal?: Record<string, unknown>;
  globalWidgets?: Record<string, unknown>;
};

type PublicLinktreeRow = {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  seo_name: string;
  uid: string;
  image: string | null;
  background_color: string;
  template_key: string | null;
  template_config: TemplateConfig | string | null;
  whatsapp_modal_enabled: boolean | null;
  footer_text: string | null;
  footer_phone: string | null;
  footer_hidden: boolean | null;
  status: LinktreeStatus;
  is_default: boolean;
  business_logo: string | null;
  business_favicon: string | null;
  business_website_color: string | null;
  business_default_avatar: string | null;
};

type MappedPublicLinktree = PublicLinktree;

/**
 * What the two-hour Redis copy holds.
 *
 * The tracking block is excluded on purpose: pixel ids follow a plan that can
 * lapse and actions follow links the business can edit at any moment, so a
 * cached copy of either would keep a page reporting to a pixel it no longer
 * has. Content is safe to cache; identity and entitlement are not.
 */
type CachedLinktreeBody = Omit<PublicLinktreePayload, 'analytics'>;

type PublicLinkRow = {
  id: string;
  platform: string;
  url: string;
  display_name: string | null;
  description: string | null;
  default_message: string | null;
  display_order: number;
  original_input: string | null;
  country_code: string | null;
  gps_lat: number | string | null;
  gps_lng: number | string | null;
  custom_color: string | null;
  custom_icon: string | null;
};

type MappedPublicLink = LinktreeLink;

type WhatsappQuestionRow = {
  id: string;
  text: string;
  message: string | null;
};

type PlanEntitlement = { key: string; value: unknown };

type PlanRow = {
  code: string;
  name: string;
  description: string | null;
  currency: string;
  yearlyPriceMinor: number | null;
  trialDays: number | null;
  isDefault: boolean;
  templateCount: number;
  entitlements: PlanEntitlement[] | null;
};

type PublicBusinessRow = {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  logo: string | null;
  favicon: string | null;
  default_avatar: string | null;
  website_color: string | null;
  footer_text: string | null;
  footer_phone: string | null;
  template_key: string | null;
  background_color: string | null;
  whatsapp_enabled: boolean | null;
  advertising_enabled: boolean;
  branding_removed: boolean;
  trusted_partners: Array<{
    id: string;
    name: string;
    image: string;
    url: string | null;
  }>;
};

type PlanSummary = {
  code: string;
  name: string;
  description: string | null;
  currency: string;
  yearlyPriceMinor: number | null;
  trialDays: number | null;
  isDefault: boolean;
  templateCount: number;
  entitlements: Record<string, unknown>;
};

@Injectable()
export class PublicService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly pageAnalytics: PublicPageAnalyticsService,
  ) {}

  private normalizeTemplateConfig(
    templateConfig: TemplateConfig | string | null | undefined,
    templateKey?: string | null,
  ): TemplateConfig {
    const parsed: TemplateConfig =
      typeof templateConfig === 'string'
        ? (JSON.parse(templateConfig || '{}') as TemplateConfig)
        : { ...(templateConfig || {}) };

    const config: TemplateConfig = { ...parsed };
    config.templateKey = config.templateKey || templateKey || 'spectrum';
    config.type = config.type || 'simple';
    config.buttonStyle = config.buttonStyle || 'pill';
    config.buttonGradient = config.buttonGradient !== false;
    config.whatsapp_modal = config.whatsapp_modal || {};
    return config;
  }

  private async mapLinktreeRow(
    row: PublicLinktreeRow,
  ): Promise<MappedPublicLinktree> {
    const qRes = await this.databaseService.query<WhatsappQuestionRow>(
      `SELECT id, question_text AS text, message FROM whatsapp_questions
       WHERE linktree_id = $1
       ORDER BY display_order ASC`,
      [row.id],
    );

    const config = this.normalizeTemplateConfig(
      row.template_config,
      row.template_key,
    );
    const globalSettings = await this.databaseService.query<{
      widget_config: Record<string, unknown>;
    }>(
      'SELECT widget_config FROM template_global_settings WHERE template_key = $1',
      [config.templateKey],
    );
    config.globalWidgets = globalSettings.rows[0]?.widget_config || {};

    const modal = config.whatsapp_modal ?? {};
    config.whatsapp_modal = {
      ...modal,
      enabled: row.whatsapp_modal_enabled ?? !!modal.enabled,
      title: modal.title || 'Contact us',
      subtitle: modal.subtitle || 'Choose a question',
      questions: qRes.rows.map((q) => ({
        id: q.id,
        text: q.text,
        message: q.message,
      })),
    };

    return {
      ...row,
      template_config: config,
    };
  }

  private mapLinkRow(row: PublicLinkRow): MappedPublicLink {
    return {
      ...row,
      metadata: {
        original_input: row.original_input,
        country_code: row.country_code,
        gps_lat: row.gps_lat,
        gps_lng: row.gps_lng,
        custom_color: row.custom_color,
        custom_icon: row.custom_icon,
      },
    };
  }

  async getLinktreesBySubdomain(subdomain: string) {
    const businessRes = await this.databaseService.query<{ id: string }>(
      `SELECT id FROM businesses WHERE subdomain = $1`,
      [subdomain],
    );
    if (!businessRes.rows || businessRes.rows.length === 0)
      throw new NotFoundException('Page not found');

    const linktreesRes = await this.databaseService.query<
      Pick<
        PublicLinktreeRow,
        | 'id'
        | 'name'
        | 'uid'
        | 'seo_name'
        | 'image'
        | 'subtitle'
        | 'description'
      >
    >(
      `SELECT lt.id, lt.name, lt.uid, lt.seo_name, lt.image, lt.subtitle, lt.description
       FROM linktrees lt
       INNER JOIN businesses a ON lt.business_id = a.id
       WHERE lt.status = 'active' AND a.subdomain = $1
       ORDER BY lt.name`,
      [subdomain],
    );

    return linktreesRes.rows || [];
  }

  private publicLinktreeSelect() {
    return `SELECT lt.id, lt.name, lt.subtitle, lt.description, lt.seo_name, lt.uid, lt.image, lt.background_color,
                   ${allowedTemplateKeySql('lt.template_key', 'a')} AS template_key,
                   lt.template_config, lt.whatsapp_modal_enabled,
                   lt.footer_text, lt.footer_phone, lt.footer_hidden, lt.status, lt.is_default,
                   b.logo AS business_logo, b.favicon AS business_favicon,
                   b.website_color AS business_website_color, b.default_avatar AS business_default_avatar
            FROM linktrees lt
            INNER JOIN businesses a ON lt.business_id = a.id
            LEFT JOIN business_branding b ON b.business_id = a.id`;
  }

  async getPublicLinktreeByUidAndSubdomain(
    uid: string,
    subdomain: string,
  ): Promise<PublicLinktreePayload> {
    const cacheKey = `cache:linktree:uid:${uid}:sub:${subdomain}`;
    const cachedData =
      await this.redisService.get<CachedLinktreeBody>(cacheKey);
    if (cachedData) {
      return {
        ...cachedData,
        analytics: await this.pageAnalytics.forSource(
          'linktree',
          cachedData.linktree.id,
        ),
      };
    }

    const base = this.publicLinktreeSelect();
    let ltRes = await this.databaseService.query<PublicLinktreeRow>(
      `${base}
       WHERE lt.uid = $1 AND lt.status = 'active' AND a.subdomain = $2`,
      [uid, subdomain],
    );

    if (!ltRes.rows || ltRes.rows.length === 0) {
      ltRes = await this.databaseService.query<PublicLinktreeRow>(
        `${base}
         WHERE lt.seo_name = $1 AND lt.status = 'active' AND a.subdomain = $2`,
        [uid, subdomain],
      );
      if (!ltRes.rows || ltRes.rows.length === 0) {
        const tombstone = await this.databaseService.query<{ exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1
             FROM public_page_tombstones tombstone
             JOIN businesses business ON business.id=tombstone.business_id
             WHERE tombstone.page_type='linktree'
               AND (tombstone.public_identifier=$1 OR tombstone.slug=$1)
               AND lower(business.subdomain)=lower($2)
           ) AS exists`,
          [uid, subdomain],
        );
        if (tombstone.rows[0]?.exists) {
          throw new GoneException('Page permanently removed');
        }
        throw new NotFoundException('Page not found');
      }
    }

    const linktree = await this.mapLinktreeRow(ltRes.rows[0]);
    const linksRes = await this.databaseService.query<PublicLinkRow>(
      `SELECT id, platform, url, display_name, description, default_message, display_order,
              original_input, country_code, gps_lat, gps_lng, custom_color, custom_icon
       FROM links
       WHERE linktree_id = $1
       ORDER BY display_order ASC`,
      [linktree.id],
    );

    const payload = {
      linktree,
      links: (linksRes.rows || []).map((row) => this.mapLinkRow(row)),
      // Resolved per read, and deliberately outside the cached body below:
      // pixel ids follow a plan that can lapse and actions follow links that
      // can be edited, so a two-hour-old copy of either would keep a page
      // reporting to a pixel the business no longer has.
      analytics: await this.pageAnalytics.forSource('linktree', linktree.id),
    };
    await this.redisService.set(
      cacheKey,
      { linktree: payload.linktree, links: payload.links },
      7200,
    );
    return payload;
  }

  async getBusinessBySubdomain(subdomain: string) {
    const res = await this.databaseService.query<PublicBusinessRow>(
      `SELECT
         a.id, a.name, a.subdomain, a.status,
         b.logo, b.favicon, b.default_avatar, b.website_color,
         d.footer_text, d.footer_phone, d.template_key,
         d.background_color, d.whatsapp_enabled,
         COALESCE((
           SELECT jsonb_agg(
             jsonb_build_object(
               'id', partner.id,
               'name', partner.title,
               'image', partner.image,
               'url', partner.url
             )
             ORDER BY partner.position, partner.title
           )
           FROM (
             SELECT DISTINCT ON (lower(item.title), item.image)
               item.id::text AS id,
               item.title,
               item.image,
               CASE
                 WHEN item.action_type = 'link' THEN NULLIF(item.url, '')
                 ELSE NULL
               END AS url,
               item.position
             FROM mini_website_items item
             JOIN mini_websites website ON website.id = item.mini_website_id
             JOIN mini_website_sections section
               ON section.mini_website_id = website.id
              AND section.section_key = 'partners'
              AND section.enabled = true
             WHERE website.business_id = a.id
               AND website.status = 'published'
               AND item.section_key = 'partners'
               AND item.enabled = true
               AND btrim(item.title) <> ''
               AND btrim(item.image) <> ''
             ORDER BY lower(item.title), item.image, item.position, item.id
             LIMIT 24
           ) partner
         ), '[]'::jsonb) AS trusted_partners,
         -- No pixel ids here. The subdomain landing page is not one of the two
         -- surfaces allowed to load a business's pixel; see docs/tracking.md.
         -- Whether this business currently has a live advertising page, so the
         -- public shell can decide whether to link to /advertising at all
         -- rather than offering a link that 404s.
         (
           ${entitledSql(ENTITLEMENT.advertisingPage, 'a')}
           AND EXISTS (
             SELECT 1
               FROM public.advertising_pages advertising
               JOIN public.advertising_page_versions advertising_version
                 ON advertising_version.advertising_page_id = advertising.id
                AND advertising_version.published = true
              WHERE advertising.business_id = a.id
                AND advertising.status = 'published'
           )
         ) AS advertising_enabled,
         -- Ultra pays to drop the "Powered by MultiTree" badge. Read live, so a
         -- downgrade puts it back rather than leaving the paid state stuck on.
         ${entitledSql(ENTITLEMENT.removeBranding, 'a')} AS branding_removed
       FROM businesses a
       LEFT JOIN business_branding b ON b.business_id = a.id
       LEFT JOIN business_defaults d ON d.business_id = a.id
       WHERE LOWER(a.subdomain) = LOWER($1) AND a.status = 'active'`,
      [subdomain],
    );
    if (!res.rows || res.rows.length === 0)
      throw new NotFoundException('Business not found');
    return res.rows[0];
  }

  async getPlans() {
    const cacheKey = 'cache:public:plans';
    const cached = await this.redisService.get<PlanSummary[]>(cacheKey);
    if (cached) return cached;

    const result = await this.databaseService.query<PlanRow>(
      `SELECT
         sp.code, sp.name, sp.description, sp.currency,
         sp.yearly_price_minor AS "yearlyPriceMinor",
         sp.trial_days AS "trialDays",
         sp.is_default AS "isDefault",
         COALESCE(
           (SELECT jsonb_agg(jsonb_build_object('key', e.entitlement_key, 'value', pe.value))
            FROM billing_plan_entitlements pe
            JOIN billing_entitlements e ON e.id = pe.entitlement_id AND e.status = 'active'
            WHERE pe.plan_configuration_id = config.id),
           '[]'::jsonb
         ) AS entitlements,
         (SELECT COUNT(*)::int FROM billing_plan_templates t
          WHERE t.plan_configuration_id = config.id) AS "templateCount"
       FROM billing_subscription_plans sp
       JOIN billing_plan_configurations config ON config.plan_id = sp.permission_profile_id
       WHERE sp.status = 'active'
       ORDER BY sp.display_order`,
    );

    const plans = (result.rows || []).map((row) => {
      const entitlements: Record<string, unknown> = {};
      for (const e of row.entitlements || []) {
        entitlements[e.key] = e.value;
      }
      return {
        code: row.code,
        name: row.name,
        description: row.description,
        currency: row.currency,
        yearlyPriceMinor: row.yearlyPriceMinor,
        trialDays: row.trialDays,
        isDefault: row.isDefault,
        templateCount: row.templateCount,
        entitlements,
      };
    });

    await this.redisService.set(cacheKey, plans, 300);
    return plans;
  }

  async getPlatformTheme() {
    const cacheKey = 'cache:public:platform-theme';
    const cached = await this.redisService.get<{ accent_color: string }>(
      cacheKey,
    );
    if (cached) return cached;

    const result = await this.databaseService.query<{ accent_color: string }>(
      `SELECT accent_color
       FROM platform_admins
       ORDER BY created_at ASC
       LIMIT 1`,
    );
    const theme = {
      accent_color: result.rows[0]?.accent_color || '#b6f20d',
    };
    await this.redisService.set(cacheKey, theme, 300);
    return theme;
  }
}
