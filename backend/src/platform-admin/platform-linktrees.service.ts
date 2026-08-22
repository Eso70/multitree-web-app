import { Injectable } from '@nestjs/common';
import { rootPublicLinktreeCacheKeys } from '../common/root-public-cache';
import { rethrowRootSlugConflict } from '../common/root-slug-conflict';
import { RedisService } from '../redis/redis.service';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { LinktreesService } from '../linktrees/linktrees.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';

@Injectable()
export class PlatformLinktreesService {
  constructor(
    private readonly linktrees: LinktreesService,
    private readonly workspace: PlatformContentWorkspaceService,
    private readonly redis: RedisService,
    private readonly analytics: UnifiedAnalyticsService,
  ) {}

  private async workspaceId() {
    return this.workspace.getWorkspaceId();
  }

  private async invalidate(...identifiers: Array<string | null | undefined>) {
    const keys = rootPublicLinktreeCacheKeys(...identifiers);
    await Promise.all(keys.map((key) => this.redis.del(key)));
  }

  async getContext() {
    const branding = await this.workspace.getBranding();
    return {
      branding,
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

  async getAnalytics(id: string) {
    const businessId = await this.workspaceId();
    await this.linktrees.getLinktreeById(id, businessId);
    return this.analytics.getSummary(businessId, {
      pageId: id,
      pageType: 'linktree',
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

  // Root-domain slugs are shared with every Creator, so the availability check
  // the console runs can be true when it is asked and false by the time the
  // save arrives. `root_public_slugs_pkey` settles it, and the collision is
  // reported as the conflict it is rather than as a server error.
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
