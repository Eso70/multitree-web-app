import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import { DatabaseService } from '../database/database.service';
import {
  withLinkMetadata,
  type LinkRow,
  type MappedLink,
} from '../links/link.types';
import { describeError } from '../common/describe-error';
import { ForbiddenException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import {
  CreateLinktreeDto,
  type LinkMetadataInput,
} from './dto/create-linktree.dto';
import { UpdateLinktreeDto } from './dto/update-linktree.dto';
import * as crypto from 'crypto';
import { EntitlementService } from '../billing/entitlement.service';
import { TemplateAccessService } from '../billing/template-access.service';
import { WebhookDeliveryService } from '../api-platform/webhook-delivery.service';
import { StorageService } from '../storage/storage.service';
import { LinksService } from '../links/links.service';
import type { SyncLinkInput } from '../links/link.types';
import {
  DEFAULT_LINKTREE_BACKGROUND_COLOR,
  DEFAULT_LINKTREE_TEMPLATE_KEY,
} from '../common/linktree-defaults';

/**
 * Row shapes for the linktree queries.
 *
 * Type aliases rather than interfaces: pg constrains the row generic to
 * `QueryResultRow`, and only aliases pick up the implicit index signature.
 */
type TemplateConfig = Record<string, unknown> & {
  templateKey?: string;
  type?: string;
  buttonStyle?: string;
  buttonGradient?: boolean;
  whatsapp_modal?: Record<string, unknown>;
};

/** What `normalizeTemplateConfig` guarantees once it has filled the defaults. */
type NormalizedTemplateConfig = TemplateConfig & {
  templateKey: string;
  whatsapp_modal: Record<string, unknown>;
};

type BusinessDefaultsRow = {
  name?: string;
  logo?: string | null;
  website_color?: string | null;
  default_avatar?: string | null;
  default_template: string | null;
  default_background_color: string | null;
  default_footer_text: string | null;
  default_footer_phone: string | null;
  default_footer_hidden: boolean | null;
  default_whatsapp_enabled: boolean | null;
};

/** An unvalidated WhatsApp question as it arrives inside `template_config`. */
type WhatsappQuestionInput = {
  text?: unknown;
  message?: unknown;
};

type LinktreeRow = {
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
  status: string;
  is_default: boolean;
  created_at?: Date;
  updated_at?: Date;
  business_default_avatar?: string | null;
};

type MappedLinktree = Omit<LinktreeRow, 'template_config'> & {
  template_config: NormalizedTemplateConfig;
};

type WhatsappQuestionRow = {
  id: string;
  text: string;
  message: string | null;
};

/** Both DatabaseService and a pooled client expose this much of the API. */
type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(
    queryText: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
};

/**
 * A value reduced to what `chk_lt_seo_name` accepts: `^[a-z0-9-]+$`, at least
 * two characters. Returns '' when nothing usable survives, which is what a name
 * written in a non-Latin script leaves behind.
 */
export function slugifyLinktreeName(value: string | null | undefined): string {
  const slug = (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug.length >= 2 ? slug : '';
}

/**
 * The two buttons a default page starts with, built from the business's own
 * registered phone number.
 *
 * A default page with no way to contact the business is a page with nothing on
 * it, and the number is already required at signup — so the one thing every
 * business can be given without asking is a way to be reached.
 *
 * `original_input` and `country_code` are deliberately left unset. Splitting the
 * number into a dialling code and a local part needs the country list, which
 * lives in the link editor on the frontend; the editor already falls back to
 * parsing both back out of the URL when the metadata is absent, so a seeded
 * link opens for editing exactly like a hand-made one. Copying that list into
 * the backend would be a second source of truth for no gain.
 */
export function defaultContactLinks(phone: string | null): SyncLinkInput[] {
  const dialable = internationalPhone(phone);
  if (!dialable) return [];
  return [
    { platform: 'whatsapp', url: `https://wa.me/${dialable}` },
    { platform: 'phone', url: `tel:+${dialable}` },
  ];
}

/**
 * The default dialling code, matching the fallback the rest of the backend
 * already uses for a phone with no country attached
 * (`mini-websites.service.ts`).
 */
const DEFAULT_DIALLING_CODE = '964';

/**
 * A registered phone as a number WhatsApp and a dialler will actually accept.
 *
 * `businesses.phone` is a single column with no country code beside it, and
 * businesses register a local number — the seeded demo business is
 * `7502485829`. `wa.me/7502485829` resolves to nobody, so seeding the raw value
 * would produce a button that silently fails, which is worse than no button.
 *
 * Mirrors what the link editor's `formatPhoneNumber` does with the country
 * picker set: drop leading zeros, keep a number that already carries a code,
 * otherwise prepend the default one. A number long enough to already be
 * international is left alone rather than having a second code stacked on it.
 */
function internationalPhone(phone: string | null): string {
  const digits = (phone || '').replace(/\D/g, '').replace(/^0+/, '');
  // Shorter than any real number: nothing usable to dial or message.
  if (digits.length < 8) return '';
  if (digits.startsWith(DEFAULT_DIALLING_CODE)) return digits;
  // Long enough to already carry some other country's code.
  if (digits.length >= 11) return digits;
  return `${DEFAULT_DIALLING_CODE}${digits}`;
}

@Injectable()
export class LinktreesService {
  private readonly logger = new Logger(LinktreesService.name);
  private readonly uidAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789-';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly entitlementService: EntitlementService,
    private readonly templateAccessService: TemplateAccessService,
    private readonly webhooks: WebhookDeliveryService,
    private readonly storage: StorageService,
    private readonly linksService: LinksService,
  ) {}

  private async ensureTemplateAllowed(businessId: string, templateKey: string) {
    await this.templateAccessService.assertAllowed(businessId, templateKey);
  }

  private generateUid(randomLength = 21): string {
    let result = '';
    const bytes = crypto.randomBytes(randomLength);
    for (let i = 0; i < randomLength; i++) {
      result += this.uidAlphabet[bytes[i] % this.uidAlphabet.length];
    }
    return 'lt-' + result;
  }

  private normalizeTemplateConfig(
    templateConfig: TemplateConfig | string | null | undefined,
    templateKey?: string | null,
  ): NormalizedTemplateConfig {
    const config: TemplateConfig =
      typeof templateConfig === 'string'
        ? (JSON.parse(templateConfig || '{}') as TemplateConfig)
        : { ...(templateConfig || {}) };

    config.templateKey = config.templateKey || templateKey || 'spectrum';
    config.type = config.type || 'simple';
    config.buttonStyle = config.buttonStyle || 'pill';
    config.buttonGradient = config.buttonGradient !== false;
    config.whatsapp_modal = config.whatsapp_modal || {};
    return config as NormalizedTemplateConfig;
  }

  private async mapLinktreeRow(
    clientOrDb: Queryable,
    row: LinktreeRow,
  ): Promise<MappedLinktree> {
    const qRes = await clientOrDb.query<WhatsappQuestionRow>(
      `SELECT id, question_text AS text, message FROM whatsapp_questions
       WHERE linktree_id = $1
       ORDER BY display_order ASC`,
      [row.id],
    );

    const config = this.normalizeTemplateConfig(
      row.template_config,
      row.template_key,
    );
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

    return { ...row, template_config: config };
  }

  private mapLinkRow(row: LinkRow): MappedLink {
    return withLinkMetadata(row);
  }

  private buildCreateLinks(data: CreateLinktreeDto) {
    const linksToCreate: Array<{
      platform: string;
      url: string;
      display_name: string | null;
      description: string | null;
      default_message: string | null;
      original_input: string | null;
      country_code: string | null;
      gps_lat: number | null;
      gps_lng: number | null;
      custom_color: string | null;
      custom_icon: string | null;
    }> = [];

    if (!data.links || typeof data.links !== 'object') return linksToCreate;

    for (const [platformKey, urls] of Object.entries(data.links)) {
      const platform = platformKey.trim();
      if (!platform || !Array.isArray(urls)) continue;

      const metadataRows = Array.isArray(data.linkMetadata?.[platform])
        ? data.linkMetadata?.[platform] || []
        : [];

      urls.forEach((url, index) => {
        if (!url || typeof url !== 'string' || !url.trim()) return;

        const row: LinkMetadataInput = metadataRows[index] || {};
        const metadata: Record<string, unknown> =
          row.metadata &&
          typeof row.metadata === 'object' &&
          !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};

        linksToCreate.push({
          platform,
          url: url.trim(),
          display_name:
            typeof row.display_name === 'string' && row.display_name.trim()
              ? row.display_name.trim()
              : null,
          description:
            typeof row.description === 'string' && row.description.trim()
              ? row.description.trim()
              : null,
          default_message:
            typeof row.default_message === 'string'
              ? row.default_message.trim()
              : null,
          original_input:
            typeof metadata.original_input === 'string'
              ? metadata.original_input
              : null,
          country_code:
            typeof metadata.country_code === 'string'
              ? metadata.country_code
              : null,
          gps_lat:
            metadata.gps_lat !== undefined && metadata.gps_lat !== null
              ? Number(metadata.gps_lat)
              : null,
          gps_lng:
            metadata.gps_lng !== undefined && metadata.gps_lng !== null
              ? Number(metadata.gps_lng)
              : null,
          custom_color:
            typeof metadata.custom_color === 'string'
              ? metadata.custom_color
              : null,
          custom_icon:
            typeof metadata.custom_icon === 'string'
              ? metadata.custom_icon
              : null,
        });
      });
    }

    return linksToCreate;
  }

  async getAllLinktrees(businessId: string) {
    const res = await this.databaseService.query<LinktreeRow>(
      `SELECT lt.id, lt.name, lt.subtitle, lt.description, lt.seo_name, lt.uid, lt.image, lt.background_color,
              lt.template_key, lt.template_config, lt.whatsapp_modal_enabled,
              lt.footer_text, lt.footer_phone, lt.footer_hidden, lt.status, lt.is_default,
              lt.created_at, lt.updated_at, b.default_avatar AS business_default_avatar
       FROM linktrees lt
       LEFT JOIN business_branding b ON b.business_id = lt.business_id
       WHERE lt.business_id = $1
       ORDER BY lt.created_at DESC`,
      [businessId],
    );
    const mappedRows: MappedLinktree[] = [];
    for (const row of res.rows)
      mappedRows.push(await this.mapLinktreeRow(this.databaseService, row));
    return mappedRows;
  }

  async getLinktreeById(id: string, businessId: string) {
    const res = await this.databaseService.query<LinktreeRow>(
      `SELECT lt.id, lt.name, lt.subtitle, lt.description, lt.seo_name, lt.uid, lt.image, lt.background_color,
              lt.template_key, lt.template_config, lt.whatsapp_modal_enabled,
              lt.footer_text, lt.footer_phone, lt.footer_hidden, lt.status, lt.is_default,
              lt.created_at, lt.updated_at, b.default_avatar AS business_default_avatar
       FROM linktrees lt
       LEFT JOIN business_branding b ON b.business_id = lt.business_id
       WHERE lt.id = $1 AND lt.business_id = $2`,
      [id, businessId],
    );
    if (!res.rows || res.rows.length === 0)
      throw new NotFoundException('Linktree page not found');
    return this.mapLinktreeRow(this.databaseService, res.rows[0]);
  }

  async isSlugAvailable(businessId: string, slug: string, excludeId?: string) {
    const result = await this.databaseService.query<{ '?column?': number }>(
      'SELECT 1 FROM linktrees WHERE business_id = $1 AND seo_name = $2 AND ($3::uuid IS NULL OR id <> $3)',
      [businessId, slug, excludeId || null],
    );
    return result.rows.length === 0;
  }

  async getLinktreeLinks(linktreeId: string, businessId: string) {
    const ownerCheck = await this.databaseService.query<{ '?column?': number }>(
      'SELECT 1 FROM linktrees WHERE id = $1 AND business_id = $2',
      [linktreeId, businessId],
    );
    if (!ownerCheck.rows || ownerCheck.rows.length === 0)
      throw new NotFoundException('Linktree page not found');

    const res = await this.databaseService.query<LinkRow>(
      `SELECT id, platform, url, display_name, description, default_message, display_order,
              original_input, country_code, gps_lat, gps_lng, custom_color, custom_icon
       FROM links
       WHERE linktree_id = $1
       ORDER BY display_order ASC`,
      [linktreeId],
    );
    return (res.rows || []).map((row) => this.mapLinkRow(row));
  }

  async createLinktree(data: CreateLinktreeDto, businessId: string) {
    const linktreeLimit = await this.entitlementService.getInteger(
      businessId,
      'limit.linktrees',
      0,
    );
    let uid = '';
    let attempts = 0;
    while (attempts < 10) {
      uid = this.generateUid();
      const checkRes = await this.databaseService.query<{
        '?column?': number;
      }>('SELECT 1 FROM linktrees WHERE business_id = $1 AND uid = $2', [
        businessId,
        uid,
      ]);
      if (checkRes.rows.length === 0) break;
      attempts++;
    }
    if (attempts >= 10)
      throw new ConflictException('Failed to generate unique UID');

    const seoName = data.seo_name || data.slug;
    if (!seoName) throw new ConflictException('SEO name/slug is required');

    const slugCheck = await this.databaseService.query<{
      '?column?': number;
    }>('SELECT 1 FROM linktrees WHERE business_id = $1 AND seo_name = $2', [
      businessId,
      seoName,
    ]);
    if (slugCheck.rows.length > 0)
      throw new ConflictException('SEO URL slug already in use');

    const businessRes = await this.databaseService.query<BusinessDefaultsRow>(
      `SELECT d.background_color AS default_background_color, d.template_key AS default_template,
              d.footer_text AS default_footer_text, d.footer_phone AS default_footer_phone,
              d.footer_hidden AS default_footer_hidden, d.whatsapp_enabled AS default_whatsapp_enabled,
              b.default_avatar
       FROM businesses a
       LEFT JOIN business_defaults d ON d.business_id = a.id
       LEFT JOIN business_branding b ON b.business_id = a.id
       WHERE a.id = $1`,
      [businessId],
    );
    const business = businessRes.rows[0] || {};

    const config = this.normalizeTemplateConfig(
      data.template_config,
      business.default_template,
    );
    await this.ensureTemplateAllowed(businessId, config.templateKey);
    const whatsappModal = config.whatsapp_modal || {};
    const whatsappQuestions: WhatsappQuestionInput[] = Array.isArray(
      whatsappModal.questions,
    )
      ? (whatsappModal.questions as WhatsappQuestionInput[])
      : [];
    const whatsappEnabled =
      whatsappModal.enabled !== undefined
        ? !!whatsappModal.enabled
        : (business.default_whatsapp_enabled ?? false);
    config.whatsapp_modal = { ...whatsappModal, enabled: whatsappEnabled };

    const image = data.image || business.default_avatar || null;
    const linksToCreate = this.buildCreateLinks(data);

    const row = await this.databaseService.transaction(async (client) => {
      // Serialize capacity checks per business so parallel requests cannot
      // exceed the subscription limit.
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [businessId],
      );

      if (data.is_default) {
        const existingDefault = await client.query<{ id: string }>(
          `SELECT id FROM linktrees WHERE business_id = $1 AND is_default = true LIMIT 1`,
          [businessId],
        );
        if (existingDefault.rows.length > 0) {
          const defaultId = existingDefault.rows[0].id;
          const nextSeoName = data.seo_name || data.slug;
          const updRes = await client.query<LinktreeRow>(
            `UPDATE linktrees SET
              name = $1, subtitle = $2, description = $14, image = $3, background_color = $4,
              template_key = $5, template_config = $6::jsonb, whatsapp_modal_enabled = $7,
              footer_text = $8, footer_phone = $9, footer_hidden = $10,
              seo_name = $13, updated_at = NOW()
             WHERE id = $11 AND business_id = $12
             RETURNING id, name, subtitle, description, seo_name, uid, image, background_color,
                       template_key, template_config, whatsapp_modal_enabled,
                       footer_text, footer_phone, footer_hidden, status, is_default, created_at, updated_at`,
            [
              data.name,
              data.subtitle || null,
              data.image || null,
              data.background_color || '#0f121d',
              config.templateKey,
              JSON.stringify(config),
              whatsappEnabled,
              data.footer_text || '',
              data.footer_phone || null,
              data.footer_hidden ?? false,
              defaultId,
              businessId,
              nextSeoName,
              data.description || null,
            ],
          );
          const updated = updRes.rows[0];
          await client.query(
            'DELETE FROM whatsapp_questions WHERE linktree_id = $1',
            [defaultId],
          );
          await client.query('DELETE FROM links WHERE linktree_id = $1', [
            defaultId,
          ]);
          for (let i = 0; i < linksToCreate.length; i++) {
            const link = linksToCreate[i];
            await client.query(
              `INSERT INTO links (linktree_id, business_id, platform, url, display_name, description, default_message, display_order, original_input, country_code, gps_lat, gps_lng, custom_color, custom_icon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                defaultId,
                businessId,
                link.platform,
                link.url,
                link.display_name,
                link.description,
                link.default_message,
                i,
                link.original_input,
                link.country_code,
                link.gps_lat,
                link.gps_lng,
                link.custom_color,
                link.custom_icon,
              ],
            );
          }
          await this.webhooks.emitWithClient(
            client,
            businessId,
            'linktree.updated',
            'linktree',
            defaultId,
            { id: defaultId, uid: updated.uid, slug: updated.seo_name },
          );
          return { ...updated, template_config: config };
        }
      }

      const currentCount = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM linktrees
         WHERE business_id = $1::uuid AND status <> 'deleted'`,
        [businessId],
      );
      if (
        linktreeLimit !== -1 &&
        Number(currentCount.rows[0]?.count || 0) >= linktreeLimit
      ) {
        throw new ForbiddenException(
          data.is_default
            ? 'The default page could not be created because the linktree limit has been reached. Please delete some pages first.'
            : 'The subscription linktree limit has been reached',
        );
      }

      const isDefaultFlag = data.is_default ? true : false;
      const ltRes = await client.query<LinktreeRow>(
        `INSERT INTO linktrees (
          name, subtitle, description, seo_name, uid, image, background_color,
          template_key, template_config, whatsapp_modal_enabled,
          footer_text, footer_phone, footer_hidden, status, business_id, is_default
        ) VALUES ($1, $2, $15, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, 'active', $13, $14)
        RETURNING id, name, subtitle, description, seo_name, uid, image, background_color,
                  template_key, template_config, whatsapp_modal_enabled,
                  footer_text, footer_phone, footer_hidden, status, is_default, created_at, updated_at`,
        [
          data.name,
          data.subtitle || null,
          seoName,
          uid,
          image,
          data.background_color ||
            business.default_background_color ||
            '#000000',
          config.templateKey,
          JSON.stringify(config),
          whatsappEnabled,
          data.footer_text !== undefined
            ? data.footer_text
            : business.default_footer_text || '',
          data.footer_phone !== undefined
            ? data.footer_phone
            : business.default_footer_phone || '',
          data.footer_hidden !== undefined
            ? data.footer_hidden
            : (business.default_footer_hidden ?? false),
          businessId,
          isDefaultFlag,
          data.description || null,
        ],
      );

      const createdLinktree = ltRes.rows[0];
      for (let i = 0; i < whatsappQuestions.length; i++) {
        const q = whatsappQuestions[i];
        if (typeof q?.text === 'string' && typeof q.message === 'string') {
          if (!q.text || !q.message) continue;
          await client.query(
            `INSERT INTO whatsapp_questions (linktree_id, question_text, message, display_order)
             VALUES ($1, $2, $3, $4)`,
            [createdLinktree.id, q.text.trim(), q.message.trim(), i],
          );
        }
      }
      for (let i = 0; i < linksToCreate.length; i++) {
        const link = linksToCreate[i];
        await client.query(
          `INSERT INTO links (
            linktree_id, business_id, platform, url, display_name, description, default_message,
            display_order, original_input, country_code, gps_lat, gps_lng, custom_color, custom_icon
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            createdLinktree.id,
            businessId,
            link.platform,
            link.url,
            link.display_name,
            link.description,
            link.default_message,
            i,
            link.original_input,
            link.country_code,
            link.gps_lat,
            link.gps_lng,
            link.custom_color,
            link.custom_icon,
          ],
        );
      }
      await this.webhooks.emitWithClient(
        client,
        businessId,
        'linktree.created',
        'linktree',
        createdLinktree.id,
        {
          id: createdLinktree.id,
          uid: createdLinktree.uid,
          slug: createdLinktree.seo_name,
        },
      );
      return createdLinktree;
    });

    await this.storage.claimBusinessAssets(businessId, image, config);

    return this.mapLinktreeRow(this.databaseService, row);
  }

  private async clearLinktreeCache(
    businessId: string,
    uid: string,
    seoName?: string | null,
  ) {
    try {
      const businessRes = await this.databaseService.query<{
        subdomain: string | null;
      }>(`SELECT subdomain FROM businesses WHERE id = $1`, [businessId]);
      const subdomain = businessRes.rows[0]?.subdomain?.toLowerCase();
      if (!subdomain) return;
      const keys = [
        `cache:linktree:uid:${uid}`,
        `cache:linktree:uid:${uid}:sub:${subdomain}`,
        `cache:linktree:uid:id`,
        `cache:linktree:uid:id:sub:${subdomain}`,
      ];
      if (seoName) {
        keys.push(`cache:linktree:uid:${seoName}`);
        keys.push(`cache:linktree:uid:${seoName}:sub:${subdomain}`);
      }
      await Promise.all(keys.map((k) => this.redisService.del(k)));
    } catch (error) {
      // A failed cache purge must not fail the mutation, but it leaves stale
      // public pages behind, so it has to be visible in the logs.
      this.logger.warn(
        `Failed to clear public linktree cache: ${describeError(error)}`,
      );
    }
  }

  async updateLinktree(
    id: string,
    data: UpdateLinktreeDto,
    businessId: string,
  ) {
    const current = await this.getLinktreeById(id, businessId);
    const nextSeoName = data.seo_name || data.slug;

    if (nextSeoName && nextSeoName !== current.seo_name) {
      const slugCheck = await this.databaseService.query<{
        '?column?': number;
      }>(
        'SELECT 1 FROM linktrees WHERE business_id = $1 AND seo_name = $2 AND id != $3',
        [businessId, nextSeoName, id],
      );
      if (slugCheck.rows.length > 0)
        throw new ConflictException('SEO URL slug already in use');
    }

    const name = data.name !== undefined ? data.name : current.name;
    const subtitle =
      data.subtitle !== undefined ? data.subtitle : current.subtitle;
    const description =
      data.description !== undefined ? data.description : current.description;
    const seo_name = nextSeoName !== undefined ? nextSeoName : current.seo_name;
    const image = data.image !== undefined ? data.image : current.image;
    const background_color =
      data.background_color !== undefined
        ? data.background_color
        : current.background_color;
    const footer_text =
      data.footer_text !== undefined ? data.footer_text : current.footer_text;
    const footer_phone =
      data.footer_phone !== undefined
        ? data.footer_phone
        : current.footer_phone;
    const footer_hidden =
      data.footer_hidden !== undefined
        ? data.footer_hidden
        : current.footer_hidden;

    const config = this.normalizeTemplateConfig(
      data.template_config !== undefined
        ? data.template_config
        : current.template_config,
      current.template_key,
    );
    await this.ensureTemplateAllowed(businessId, config.templateKey);
    const whatsappModal = config.whatsapp_modal || {};
    const whatsappEnabled = !!whatsappModal.enabled;
    const whatsappQuestions: WhatsappQuestionInput[] = Array.isArray(
      whatsappModal.questions,
    )
      ? (whatsappModal.questions as WhatsappQuestionInput[])
      : [];

    const row = await this.databaseService.transaction(async (client) => {
      const ltRes = await client.query<LinktreeRow>(
        `UPDATE linktrees
         SET name = $1, subtitle = $2, description = $14, seo_name = $3, image = $4, background_color = $5,
             template_key = $6, template_config = $7::jsonb, whatsapp_modal_enabled = $8,
             footer_text = $9, footer_phone = $10, footer_hidden = $11, updated_at = NOW()
         WHERE id = $12 AND business_id = $13
         RETURNING id, name, subtitle, description, seo_name, uid, image, background_color,
                   template_key, template_config, whatsapp_modal_enabled,
                   footer_text, footer_phone, footer_hidden, status, is_default, created_at, updated_at`,
        [
          name,
          subtitle,
          seo_name,
          image,
          background_color,
          config.templateKey,
          JSON.stringify(config),
          whatsappEnabled,
          footer_text,
          footer_phone,
          footer_hidden,
          id,
          businessId,
          description,
        ],
      );

      const updatedLinktree = ltRes.rows[0];

      await client.query(
        'DELETE FROM whatsapp_questions WHERE linktree_id = $1',
        [id],
      );
      for (let i = 0; i < whatsappQuestions.length; i++) {
        const q = whatsappQuestions[i];
        if (typeof q?.text === 'string' && typeof q.message === 'string') {
          if (!q.text || !q.message) continue;
          await client.query(
            `INSERT INTO whatsapp_questions (linktree_id, question_text, message, display_order)
             VALUES ($1, $2, $3, $4)`,
            [id, q.text.trim(), q.message.trim(), i],
          );
        }
      }

      if (updatedLinktree.is_default) {
        await client.query(
          `INSERT INTO business_defaults (business_id, footer_text, footer_phone, template_key, background_color, footer_hidden, whatsapp_enabled)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (business_id) DO UPDATE SET
             footer_text = EXCLUDED.footer_text,
             footer_phone = EXCLUDED.footer_phone,
             template_key = EXCLUDED.template_key,
             background_color = EXCLUDED.background_color,
             footer_hidden = EXCLUDED.footer_hidden,
             whatsapp_enabled = EXCLUDED.whatsapp_enabled,
             updated_at = NOW()`,
          [
            businessId,
            footer_text,
            footer_phone,
            config.templateKey,
            background_color,
            footer_hidden,
            whatsappEnabled,
          ],
        );
      }

      await this.webhooks.emitWithClient(
        client,
        businessId,
        'linktree.updated',
        'linktree',
        updatedLinktree.id,
        {
          id: updatedLinktree.id,
          uid: updatedLinktree.uid,
          slug: updatedLinktree.seo_name,
        },
      );

      return updatedLinktree;
    });

    await this.storage.claimBusinessAssets(businessId, image, config);
    await this.storage.deleteUnreferencedFromValues(
      current.image,
      current.template_config,
    );

    await this.clearLinktreeCache(businessId, row.uid, row.seo_name);

    return this.mapLinktreeRow(this.databaseService, row);
  }

  async getDefaultLinktree(businessId: string) {
    const res = await this.databaseService.query<LinktreeRow>(
      `SELECT lt.id, lt.name, lt.subtitle, lt.seo_name, lt.uid, lt.image, lt.background_color,
              lt.template_key, lt.template_config, lt.whatsapp_modal_enabled,
              lt.footer_text, lt.footer_phone, lt.footer_hidden, lt.status, lt.is_default,
              lt.created_at, lt.updated_at, b.default_avatar AS business_default_avatar
       FROM linktrees lt
       LEFT JOIN business_branding b ON b.business_id = lt.business_id
       WHERE lt.business_id = $1 AND lt.is_default = true
       LIMIT 1`,
      [businessId],
    );
    if (!res.rows || res.rows.length === 0) return null;
    return this.mapLinktreeRow(this.databaseService, res.rows[0]);
  }

  /**
   * The address the default page lives at: `/linktree/<slug>`.
   *
   * Prefers the business's own subdomain, so the page reads as
   * `store.example.com/linktree/store` rather than the opaque
   * `default-e56c21f9` it used to be. The subdomain is already lowercase and
   * URL-safe by its own CHECK, which is exactly what `chk_lt_seo_name` wants.
   *
   * Falls back to a slug of the business name, then to the page id, because a
   * name written in Kurdish or Arabic slugifies to nothing — every character is
   * stripped by `^[a-z0-9-]+$`.
   *
   * `seo_name` is unique per business, so a suffix is appended if the business
   * already has a page sitting on that slug.
   */
  private async defaultPageSlug(
    businessId: string,
    subdomain: string | null | undefined,
    name: string | null | undefined,
  ): Promise<string> {
    const candidate =
      slugifyLinktreeName(subdomain) ||
      slugifyLinktreeName(name) ||
      `default-${businessId.slice(0, 8)}`;

    const taken = await this.databaseService.query<{ seo_name: string }>(
      `SELECT seo_name FROM linktrees
        WHERE business_id = $1 AND seo_name LIKE $2 || '%'`,
      [businessId, candidate],
    );
    const used = new Set(taken.rows.map((row) => row.seo_name));
    if (!used.has(candidate)) return candidate;

    for (let suffix = 2; suffix < 100; suffix += 1) {
      const next = `${candidate}-${suffix}`;
      if (!used.has(next)) return next;
    }
    return `default-${businessId.slice(0, 8)}`;
  }

  async createDefaultLinktree(businessId: string) {
    const existing = await this.getDefaultLinktree(businessId);
    if (existing) return existing;

    const businessRes = await this.databaseService.query<
      BusinessDefaultsRow & { phone: string | null; subdomain: string | null }
    >(
      `SELECT a.name, a.phone, a.subdomain, b.logo, b.website_color,
              d.template_key AS default_template, d.background_color AS default_background_color,
              d.footer_text AS default_footer_text, d.footer_phone AS default_footer_phone,
              d.footer_hidden AS default_footer_hidden, d.whatsapp_enabled AS default_whatsapp_enabled
       FROM businesses a
       LEFT JOIN business_branding b ON b.business_id = a.id
       LEFT JOIN business_defaults d ON d.business_id = a.id
       WHERE a.id = $1`,
      [businessId],
    );
    const b = businessRes.rows[0];
    if (!b) throw new NotFoundException('Business not found');

    const uid = this.generateUid();
    const seoName = await this.defaultPageSlug(businessId, b.subdomain, b.name);
    const config = this.normalizeTemplateConfig(
      null,
      b.default_template || DEFAULT_LINKTREE_TEMPLATE_KEY,
    );

    const row = await this.databaseService.transaction(async (client) => {
      const ltRes = await client.query<LinktreeRow>(
        `INSERT INTO linktrees (
          business_id, name, seo_name, uid, image, background_color,
          template_key, template_config, whatsapp_modal_enabled,
          footer_text, footer_phone, footer_hidden, status, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, 'active', true)
        RETURNING id, name, subtitle, description, seo_name, uid, image, background_color,
                  template_key, template_config, whatsapp_modal_enabled,
                  footer_text, footer_phone, footer_hidden, status, is_default, created_at, updated_at`,
        [
          businessId,
          b.name,
          seoName,
          uid,
          b.logo || null,
          // The page canvas, never the tenant colour. `website_color` themes
          // the dashboard and the public shell; using it here made a brand-new
          // page inherit a brand colour nobody chose as a background.
          b.default_background_color || DEFAULT_LINKTREE_BACKGROUND_COLOR,
          config.templateKey,
          JSON.stringify(config),
          b.default_whatsapp_enabled ?? false,
          b.name,
          b.default_footer_phone || null,
          b.default_footer_hidden ?? false,
        ],
      );
      return ltRes.rows[0];
    });

    const contactLinks = defaultContactLinks(b.phone);
    if (contactLinks.length) {
      await this.linksService.syncLinks(row.id, contactLinks, businessId);
    }

    return this.mapLinktreeRow(this.databaseService, row);
  }

  async deleteLinktree(id: string, businessId: string) {
    const current = await this.getLinktreeById(id, businessId);

    if (current.is_default) {
      throw new BadRequestException('The default page cannot be deleted');
    }

    await this.databaseService.transaction(async (client) => {
      await this.webhooks.emitWithClient(
        client,
        businessId,
        'linktree.deleted',
        'linktree',
        id,
        { id, uid: current.uid, slug: current.seo_name },
      );
      await client.query(
        `INSERT INTO public_page_tombstones
           (business_id, page_type, public_identifier, slug, deleted_at)
         VALUES ($1, 'linktree', $2, $3, now())
         ON CONFLICT (business_id, page_type, public_identifier)
         DO UPDATE SET slug=EXCLUDED.slug, deleted_at=EXCLUDED.deleted_at`,
        [businessId, current.uid, current.seo_name],
      );
      await client.query(
        'DELETE FROM linktrees WHERE id = $1 AND business_id = $2',
        [id, businessId],
      );
    });

    await this.storage.deleteUnreferencedFromValues(
      current.image,
      current.template_config,
    );

    await this.clearLinktreeCache(businessId, current.uid, current.seo_name);

    return { success: true };
  }
}
