import { Injectable } from '@nestjs/common';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import { SaveMiniWebsiteDto } from '../mini-websites/dto/mini-website.dto';
import { MiniWebsitesService } from '../mini-websites/mini-websites.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';

@Injectable()
export class PlatformMiniWebsitesService {
  constructor(
    private readonly miniWebsites: MiniWebsitesService,
    private readonly workspace: PlatformContentWorkspaceService,
    private readonly analytics: UnifiedAnalyticsService,
  ) {}

  private workspaceId() {
    return this.workspace.getWorkspaceId();
  }

  async getContext() {
    return {
      branding: await this.workspace.getBranding(),
      publicPathPrefix: '/bio',
    };
  }

  async list() {
    return this.miniWebsites.list(await this.workspaceId());
  }

  async get(id: string) {
    return this.miniWebsites.get(id, await this.workspaceId());
  }

  async create(data: SaveMiniWebsiteDto) {
    return this.miniWebsites.create(data, await this.workspaceId(), 'platform');
  }

  async update(id: string, data: SaveMiniWebsiteDto) {
    return this.miniWebsites.update(
      id,
      data,
      await this.workspaceId(),
      'platform',
    );
  }

  async remove(id: string) {
    return this.miniWebsites.remove(id, await this.workspaceId());
  }

  async isSlugAvailable(slug: string, excludeId?: string) {
    return this.miniWebsites.isRootSlugAvailable(slug, excludeId);
  }

  async getAnalytics(id: string) {
    const ownerId = await this.workspaceId();
    await this.miniWebsites.get(id, ownerId);
    return this.analytics.getSummary(ownerId, {
      pageId: id,
      pageType: 'mini_website',
    });
  }

  async getAnalyticsSummary() {
    return this.analytics.getSummary(await this.workspaceId(), {
      pageType: 'mini_website',
    });
  }

  async clearAnalytics(id: string) {
    const ownerId = await this.workspaceId();
    await this.miniWebsites.get(id, ownerId);
    await this.analytics.clear(ownerId, id);
  }

  async clearAllAnalytics() {
    const ownerId = await this.workspaceId();
    const pages = await this.miniWebsites.list(ownerId);
    for (const page of pages) {
      await this.analytics.clear(ownerId, page.id);
    }
  }
}
