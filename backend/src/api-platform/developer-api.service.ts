import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { LinktreesService } from '../linktrees/linktrees.service';
import { LinksService } from '../links/links.service';
import { AnalyticsReadService } from '../analytics/analytics-read.service';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import { StorageService } from '../storage/storage.service';
import type {
  CreateLinktreeDto,
  LinkMetadataInput,
} from '../linktrees/dto/create-linktree.dto';
import type { UpdateLinktreeDto } from '../linktrees/dto/update-linktree.dto';
import type { ApiPrincipal } from './api-platform.types';
import { WebhookDeliveryService } from './webhook-delivery.service';
import type { SyncLinkInput } from '../links/link.types';
import { toText } from '../common/coerce';
import { rootDomainHostname, rootDomainPort } from '../common/root-domain';
import type {
  BulkLinktreeDto,
  CloneLinktreeDto,
  ScheduleLinktreeDto,
} from './dto/api-platform.dto';

/**
 * Row shapes for the developer API.
 *
 * Type aliases rather than interfaces: pg constrains the row generic to
 * `QueryResultRow`, and only aliases pick up the implicit index signature.
 */
type LinktreeRecord = {
  id: string;
  uid: string;
  seo_name: string | null;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  background_color?: string | null;
  template_config?: unknown;
  footer_text?: string | null;
  footer_phone?: string | null;
  footer_hidden?: boolean | null;
  status?: string;
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
};

type ScheduleRow = {
  id: string;
  action: string;
  executeAt: Date;
  status: string;
  processedAt?: Date | null;
  createdAt?: Date;
};

type AssetRow = {
  id: string;
  linktreeId: string | null;
  assetType: string;
  url: string;
  createdAt: Date;
};

type DailyAnalyticsRow = {
  date: string;
  views: number;
  clicks: number;
};

@Injectable()
export class DeveloperApiService {
  private readonly rootDomain: string;
  private readonly publicBase: URL;

  constructor(
    private readonly database: DatabaseService,
    private readonly linktrees: LinktreesService,
    private readonly links: LinksService,
    private readonly analytics: UnifiedAnalyticsService,
    private readonly analyticsReads: AnalyticsReadService,
    private readonly storage: StorageService,
    private readonly webhooks: WebhookDeliveryService,
    config: ConfigService,
  ) {
    this.rootDomain = config.get<string>('ROOT_DOMAIN', 'localhost');
    // In development the root domain may already include the frontend port; the
    // fallback must not add a second one.
    const isProduction = config.get<string>('NODE_ENV') === 'production';
    const fallbackHost = rootDomainHostname(this.rootDomain);
    const fallbackPort = isProduction
      ? ''
      : rootDomainPort(this.rootDomain) || ':3011';
    const fallback = `${isProduction ? 'https' : 'http'}://${fallbackHost}${fallbackPort}`;
    try {
      this.publicBase = new URL(
        config.get<string>('NEXT_PUBLIC_APP_URL') || fallback,
      );
    } catch {
      this.publicBase = new URL(fallback);
    }
  }

  async list(principal: ApiPrincipal) {
    const rows = await this.linktrees.getAllLinktrees(principal.businessId);
    return Promise.all(
      rows.map((row) => this.present(row as LinktreeRecord, principal)),
    );
  }

  async get(id: string, principal: ApiPrincipal) {
    const page = await this.linktrees.getLinktreeById(id, principal.businessId);
    const links = await this.links.getLinksByLinktree(id, principal.businessId);
    return { ...(await this.present(page, principal)), links };
  }

  async create(
    data: CreateLinktreeDto & { externalId?: string },
    principal: ApiPrincipal,
  ) {
    const page = await this.linktrees.createLinktree(
      data,
      principal.businessId,
    );
    if (data.externalId)
      await this.mapExternalId(principal, 'linktree', page.id, data.externalId);
    const presented = await this.present(page, principal);
    return presented;
  }

  async update(
    id: string,
    data: UpdateLinktreeDto & { externalId?: string },
    principal: ApiPrincipal,
  ) {
    const page = await this.linktrees.updateLinktree(
      id,
      data,
      principal.businessId,
    );
    if (data.externalId)
      await this.mapExternalId(principal, 'linktree', page.id, data.externalId);
    const presented = await this.present(page, principal);
    return presented;
  }

  async remove(id: string, principal: ApiPrincipal) {
    await this.linktrees.deleteLinktree(id, principal.businessId);
    return { deleted: true, id };
  }

  async setPublished(id: string, publish: boolean, principal: ApiPrincipal) {
    const result = await this.database.query<LinktreeRecord>(
      `UPDATE linktrees SET status=$3,updated_at=now()
       WHERE id=$1::uuid AND business_id=$2::uuid
       RETURNING id::text,name,subtitle,description,seo_name,uid,image,background_color,
         template_key,template_config,footer_text,footer_phone,footer_hidden,status,is_default,created_at,updated_at`,
      [id, principal.businessId, publish ? 'active' : 'inactive'],
    );
    if (!result.rows[0]) throw new NotFoundException('Linktree page not found');
    const presented = await this.present(result.rows[0], principal);
    await this.webhooks.emit(
      principal.businessId,
      publish ? 'linktree.published' : 'linktree.unpublished',
      'linktree',
      id,
      presented,
    );
    return presented;
  }

  async clone(id: string, dto: CloneLinktreeDto, principal: ApiPrincipal) {
    const source = await this.linktrees.getLinktreeById(
      id,
      principal.businessId,
    );
    const sourceLinks = await this.links.getLinksByLinktree(
      id,
      principal.businessId,
    );
    const grouped: Record<string, string[]> = {};
    const metadata: Record<string, LinkMetadataInput[]> = {};
    for (const link of sourceLinks) {
      grouped[link.platform] ||= [];
      metadata[link.platform] ||= [];
      grouped[link.platform].push(link.url);
      metadata[link.platform].push({
        display_name: link.display_name,
        description: link.description,
        default_message: link.default_message,
        metadata: link.metadata,
      });
    }
    const created = await this.linktrees.createLinktree(
      {
        name: dto.name,
        slug: dto.slug,
        // The DTO treats "absent" as undefined; a NULL column means the same
        // thing here, so the nulls are normalised rather than passed through.
        subtitle: source.subtitle ?? undefined,
        description: source.description ?? undefined,
        image: source.image ?? undefined,
        background_color: source.background_color ?? undefined,
        template_config: source.template_config,
        footer_text: source.footer_text ?? undefined,
        footer_phone: source.footer_phone ?? undefined,
        footer_hidden: source.footer_hidden ?? undefined,
        links: grouped,
        linkMetadata: metadata,
      },
      principal.businessId,
    );
    if (dto.externalId)
      await this.mapExternalId(
        principal,
        'linktree',
        created.id,
        dto.externalId,
      );
    const presented = await this.present(created, principal);
    await this.webhooks.emit(
      principal.businessId,
      'linktree.cloned',
      'linktree',
      created.id,
      { ...presented, sourceLinktreeId: id },
    );
    return presented;
  }

  async preview(id: string, principal: ApiPrincipal) {
    const data = await this.get(id, principal);
    return { ...data, preview: true, cacheable: false };
  }

  async checkSlug(slug: string, principal: ApiPrincipal, excludeId?: string) {
    if (!/^[a-z0-9][a-z0-9-]{1,99}$/.test(slug)) {
      throw new BadRequestException(
        'Slug must use lowercase letters, numbers and hyphens',
      );
    }
    const result = await this.database.query(
      `SELECT 1 FROM linktrees WHERE business_id=$1 AND seo_name=$2
       AND ($3::uuid IS NULL OR id<>$3::uuid) LIMIT 1`,
      [principal.businessId, slug, excludeId || null],
    );
    return {
      slug,
      available: !result.rowCount,
      publicUrl: this.publicUrl(principal.subdomain, slug),
    };
  }

  async schedule(
    id: string,
    dto: ScheduleLinktreeDto,
    principal: ApiPrincipal,
  ) {
    await this.linktrees.getLinktreeById(id, principal.businessId);
    const executeAt = new Date(dto.executeAt);
    if (!Number.isFinite(executeAt.getTime()) || executeAt <= new Date()) {
      throw new BadRequestException('Schedule time must be in the future');
    }
    const result = await this.database.query<ScheduleRow>(
      `INSERT INTO api_linktree_schedules(business_id,linktree_id,action,execute_at,created_by_client_id)
       VALUES($1,$2,$3,$4,$5) RETURNING id::text,action,execute_at AS "executeAt",status`,
      [
        principal.businessId,
        id,
        dto.action,
        executeAt.toISOString(),
        principal.clientId,
      ],
    );
    await this.webhooks.emit(
      principal.businessId,
      'linktree.scheduled',
      'linktree',
      id,
      { linktreeId: id, ...result.rows[0] },
    );
    return result.rows[0];
  }

  async listSchedules(id: string, principal: ApiPrincipal) {
    await this.linktrees.getLinktreeById(id, principal.businessId);
    const result = await this.database.query<ScheduleRow>(
      `SELECT id::text,action,execute_at AS "executeAt",status,processed_at AS "processedAt",created_at AS "createdAt"
       FROM api_linktree_schedules WHERE linktree_id=$1 AND business_id=$2 ORDER BY execute_at DESC`,
      [id, principal.businessId],
    );
    return result.rows;
  }

  async cancelSchedule(scheduleId: string, principal: ApiPrincipal) {
    const result = await this.database.query(
      `UPDATE api_linktree_schedules SET status='cancelled',updated_at=now()
       WHERE id=$1 AND business_id=$2 AND status='scheduled' RETURNING id`,
      [scheduleId, principal.businessId],
    );
    if (!result.rowCount)
      throw new NotFoundException('Scheduled action not found');
    return { cancelled: true, id: scheduleId };
  }

  async syncLinks(id: string, items: SyncLinkInput[], principal: ApiPrincipal) {
    await this.links.syncLinks(id, items, principal.businessId);
    const result = await this.links.getLinksByLinktree(
      id,
      principal.businessId,
    );
    await this.webhooks.emit(
      principal.businessId,
      'linktree.updated',
      'linktree',
      id,
      { linktreeId: id, changed: 'links' },
    );
    return result;
  }

  async analyticsSummary(id: string, principal: ApiPrincipal) {
    return this.analyticsReads.getLinktreeDetails(principal.businessId, id);
  }

  async analyticsDaily(id: string, days: number, principal: ApiPrincipal) {
    return this.analytics.getDaily(
      principal.businessId,
      id,
      Math.min(365, Math.max(1, days || 30)),
    );
  }

  async analyticsRange(
    id: string,
    from: string | undefined,
    to: string | undefined,
    principal: ApiPrincipal,
  ) {
    const summary = await this.analytics.getSummary(principal.businessId, {
      pageId: id,
      from,
      to,
    });
    return {
      from: from || null,
      to: to || null,
      views: summary.total_views,
      unique_views: summary.unique_views,
      clicks: summary.total_clicks,
      unique_clicks: summary.unique_clicks,
      unique_link_clicks: summary.unique_clicks,
    };
  }

  async analyticsCsv(id: string, principal: ApiPrincipal) {
    const data = await this.analytics.getDaily(principal.businessId, id, 365);
    const escape = (value: unknown) => `"${toText(value).replace(/"/g, '""')}"`;
    return [
      'date,views,clicks',
      ...(data as DailyAnalyticsRow[]).map((row) =>
        [row.date, row.views, row.clicks].map(escape).join(','),
      ),
    ].join('\r\n');
  }

  async templatesFor(principal: ApiPrincipal) {
    const result = await this.database.query<{ template_key: string }>(
      `SELECT template.template_key FROM business_subscriptions subscription
       JOIN billing_plan_templates template ON template.plan_configuration_id=subscription.plan_configuration_id
       WHERE subscription.business_id=$1 AND subscription.status IN ('trialing','active','grace_period')
       ORDER BY template.template_key`,
      [principal.businessId],
    );
    return result.rows.map((row) => ({ key: row.template_key }));
  }

  async bulk(dto: BulkLinktreeDto, principal: ApiPrincipal) {
    const results: Array<Record<string, unknown>> = [];
    for (let index = 0; index < dto.operations.length; index++) {
      const operation = dto.operations[index];
      try {
        const value =
          operation.action === 'create'
            ? await this.create(
                {
                  ...(operation.data as unknown as CreateLinktreeDto),
                  externalId: operation.externalId,
                },
                principal,
              )
            : await this.update(
                String(operation.id || ''),
                {
                  ...(operation.data as unknown as UpdateLinktreeDto),
                  externalId: operation.externalId,
                },
                principal,
              );
        results.push({ index, success: true, data: value });
      } catch (error) {
        results.push({
          index,
          success: false,
          error: error instanceof Error ? error.message : 'Operation failed',
        });
      }
    }
    return {
      processed: results.length,
      succeeded: results.filter((item) => item.success).length,
      results,
    };
  }

  async listAssets(principal: ApiPrincipal, linktreeId?: string) {
    const result = await this.database.query<AssetRow>(
      `SELECT id::text,linktree_id::text AS "linktreeId",asset_type AS "assetType",url,created_at AS "createdAt"
       FROM api_assets WHERE business_id=$1 AND ($2::uuid IS NULL OR linktree_id=$2::uuid)
       ORDER BY created_at DESC`,
      [principal.businessId, linktreeId || null],
    );
    return result.rows;
  }

  async registerAsset(
    principal: ApiPrincipal,
    url: string,
    assetType: string,
    linktreeId?: string,
  ) {
    if (linktreeId)
      await this.linktrees.getLinktreeById(linktreeId, principal.businessId);
    const result = await this.database.query<AssetRow>(
      `INSERT INTO api_assets(business_id,linktree_id,asset_type,url,created_by_client_id)
       VALUES($1,$2,$3,$4,$5) RETURNING id::text,linktree_id::text AS "linktreeId",asset_type AS "assetType",url,created_at AS "createdAt"`,
      [
        principal.businessId,
        linktreeId || null,
        assetType,
        url,
        principal.clientId,
      ],
    );
    await this.storage.claimBusinessAssets(principal.businessId, url);
    await this.webhooks.emit(
      principal.businessId,
      'asset.processed',
      'asset',
      result.rows[0].id,
      result.rows[0],
    );
    return result.rows[0];
  }

  async deleteAsset(id: string, principal: ApiPrincipal) {
    const result = await this.database.query<{ url: string }>(
      `DELETE FROM api_assets WHERE id=$1 AND business_id=$2 RETURNING url`,
      [id, principal.businessId],
    );
    if (!result.rows[0]) throw new NotFoundException('Asset not found');
    await this.storage.deleteUnreferencedFromValues(result.rows[0].url);
    return { deleted: true, id };
  }

  private async mapExternalId(
    principal: ApiPrincipal,
    type: string,
    resourceId: string,
    externalId: string,
  ) {
    await this.database.query(
      `INSERT INTO api_external_resource_mappings(business_id,client_id,resource_type,resource_id,external_id)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(business_id,resource_type,external_id) DO UPDATE SET resource_id=EXCLUDED.resource_id,client_id=EXCLUDED.client_id,updated_at=now()`,
      [principal.businessId, principal.clientId, type, resourceId, externalId],
    );
  }

  private async present(row: LinktreeRecord, principal: ApiPrincipal) {
    const mapping = await this.database.query<{ external_id: string }>(
      `SELECT external_id FROM api_external_resource_mappings
       WHERE business_id=$1 AND resource_type='linktree' AND resource_id=$2 LIMIT 1`,
      [principal.businessId, row.id],
    );
    return {
      ...row,
      slug: row.seo_name,
      externalId: mapping.rows[0]?.external_id || null,
      publicUrl: this.publicUrl(principal.subdomain, row.seo_name || row.uid),
    };
  }

  private publicUrl(subdomain: string, slug: string) {
    // The configured root domain may itself carry a development port. The port
    // is taken from the public base URL only, so it is never appended twice.
    const host = rootDomainHostname(this.rootDomain);
    const port = this.publicBase.port ? `:${this.publicBase.port}` : '';
    const origin = `${this.publicBase.protocol}//${subdomain}.${host}${port}`;
    return `${origin}/linktree/${encodeURIComponent(slug)}`;
  }
}
