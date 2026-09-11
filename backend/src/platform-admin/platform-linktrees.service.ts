import { Injectable } from '@nestjs/common';
import { rootPublicLinktreeCacheKeys } from '../common/root-public-cache';
import { rethrowRootSlugConflict } from '../common/root-slug-conflict';
import { RedisService } from '../redis/redis.service';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { DuplicateLinktreeDto } from '../linktrees/dto/duplicate-linktree.dto';
import { LinktreesService } from '../linktrees/linktrees.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import { AnalyticsReadService } from '../analytics/analytics-read.service';

@Injectable()
export class PlatformLinktreesService {
  constructor(
    private readonly linktrees: LinktreesService,
    private readonly workspace: PlatformContentWorkspaceService,
    private readonly redis: RedisService,
    private readonly analytics: UnifiedAnalyticsService,
    private readonly analyticsReads: AnalyticsReadService,
  ) {}

  private async workspaceId() {
    return this.workspace.getWorkspaceId();
  }

  private async invalidate(...identifiers: Array<string | null | undefined>) {
    const keys = rootPublicLinktreeCacheKeys(...identifiers);
    await Promise.all(keys.map((key) => this.redis.del(key)));
  }

  async getContext() {
    const [branding, defaults] = await Promise.all([
      this.workspace.getBranding(),
      this.workspace.getLinktreeDefaults(),
    ]);
    return {
      branding,
      defaults: {
        ...defaults,
        default_avatar: defaults.default_avatar || branding.avatar,
      },
      publicPathPrefix: '/linktree',
    };
  }

  async list() {
    const businessId = await this.workspaceId();
    const [pages, branding] = await Promise.all([
      this.linktrees.getAllLinktrees(businessId),
      this.workspace.getBranding(),
    ]);
    return pages.map((page) => ({
      ...page,
      is_default: false,
      business_logo: branding.logo,
      business_default_avatar: branding.avatar,
    }));
  }

  async getForEdit(id: string) {
    const businessId = await this.workspaceId();
    const [linktree, links] = await Promise.all([
      this.linktrees.getLinktreeById(id, businessId),
      this.linktrees.getLinktreeLinks(id, businessId),
    ]);
    return { linktree, links };
  }

  async getAnalytics(id: string, range: { from?: string; to?: string } = {}) {
    const businessId = await this.workspaceId();
    await this.linktrees.getLinktreeById(id, businessId);
    return this.analytics.getSummary(businessId, {
      pageId: id,
      pageType: 'linktree',
      ...range,
    });
  }

  async getAnalyticsSummary(range: { from?: string; to?: string } = {}) {
    return this.analytics.getSummary(await this.workspaceId(), {
      pageType: 'linktree',
      ...range,
    });
  }

  async getAnalyticsActions(
    id: string,
    range: { from?: string; to?: string } = {},
  ) {
    const businessId = await this.workspaceId();
    await this.linktrees.getLinktreeById(id, businessId);
    return this.analyticsReads.getActions(businessId, {
      pageId: id,
      pageType: 'linktree',
      ...range,
    });
  }

  async clearAnalytics(id: string) {
    const businessId = await this.workspaceId();
    await this.linktrees.getLinktreeById(id, businessId);
    await this.analytics.clear(businessId, id);
  }

  async clearAllAnalytics() {
    const businessId = await this.workspaceId();
    const pages = await this.linktrees.getAllLinktrees(businessId);
    for (const page of pages) {
      await this.analytics.clear(businessId, page.id);
    }
  }

  async isSlugAvailable(slug: string, excludeId?: string) {
    return this.linktrees.isRootSlugAvailable(slug, excludeId);
  }

  async isNameAvailable(name: string, excludeId?: string) {
    return this.linktrees.isNameAvailable(
      await this.workspaceId(),
      name,
      excludeId,
    );
  }

  // The route registry is the final authority if concurrent saves request the
  // same root-domain slug.
  async create(data: CreateLinktreeDto) {
    const businessId = await this.workspaceId();
    let created;
    try {
      created = await this.linktrees.createLinktree(
        { ...data, is_default: false },
        businessId,
        'platform',
      );
    } catch (error) {
      rethrowRootSlugConflict(error);
    }
    await this.invalidate(created.uid, created.seo_name);
    return created;
  }

  async duplicate(id: string, dto?: DuplicateLinktreeDto) {
    const businessId = await this.workspaceId();
    let duplicated;
    try {
      duplicated = await this.linktrees.duplicateLinktree(
        id,
        businessId,
        dto,
        'platform',
      );
    } catch (error) {
      rethrowRootSlugConflict(error);
    }
    await this.invalidate(duplicated.uid, duplicated.seo_name);
    return duplicated;
  }

  async update(id: string, data: CreateLinktreeDto) {
    const businessId = await this.workspaceId();
    const current = await this.linktrees.getLinktreeById(id, businessId);
    let updated;
    try {
      updated = await this.linktrees.updateLinktree(
        id,
        {
          name: data.name,
          subtitle: data.subtitle,
          description: data.description,
          seo_name: data.seo_name || data.slug,
          image: data.image,
          background_color: data.background_color,
          template_config: data.template_config,
          footer_text: data.footer_text,
          footer_phone: data.footer_phone,
          footer_hidden: data.footer_hidden,
          status: data.status,
        },
        businessId,
        'platform',
      );
    } catch (error) {
      rethrowRootSlugConflict(error);
    }
    await this.linktrees.syncSubmittedLinks(id, data, businessId);
    await this.invalidate(
      current.uid,
      current.seo_name,
      updated.uid,
      updated.seo_name,
    );
    return updated;
  }

  async toggleStatus(id: string, status: 'active' | 'inactive') {
    const businessId = await this.workspaceId();
    const updated = await this.linktrees.toggleStatus(id, businessId, status);
    await this.invalidate(updated.uid, updated.seo_name);
    return updated;
  }

  async toggleCampaign(id: string, isCampaignActive: boolean) {
    const businessId = await this.workspaceId();
    const updated = await this.linktrees.toggleCampaignActive(
      id,
      businessId,
      isCampaignActive,
    );
    await this.invalidate(updated.uid, updated.seo_name);
    return updated;
  }

  async toggleArchive(id: string, isArchived: boolean) {
    const businessId = await this.workspaceId();
    const updated = await this.linktrees.toggleArchive(
      id,
      businessId,
      isArchived,
    );
    await this.invalidate(updated.uid, updated.seo_name);
    return updated;
  }

  async delete(id: string) {
    const businessId = await this.workspaceId();
    const current = await this.linktrees.getLinktreeById(id, businessId);
    const result = await this.linktrees.deleteLinktree(
      id,
      businessId,
      'platform',
    );
    await this.invalidate(current.uid, current.seo_name);
    return result;
  }
}
