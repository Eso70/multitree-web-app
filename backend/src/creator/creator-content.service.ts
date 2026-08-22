import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import { AnalyticsReadService } from '../analytics/analytics-read.service';
import { TikTokPixelConfigService } from '../auth/tiktok-pixel-config.service';
import { describeError } from '../common/describe-error';
import { rethrowRootSlugConflict } from '../common/root-slug-conflict';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { rootPublicLinktreeCacheKeys } from '../common/root-public-cache';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { LinktreesService } from '../linktrees/linktrees.service';
import { SaveMiniWebsiteDto } from '../mini-websites/dto/mini-website.dto';
import { MiniWebsitesService } from '../mini-websites/mini-websites.service';
import { CreatorAccountService } from './creator-account.service';

type PageType = 'linktree' | 'mini_website';

@Injectable()
export class CreatorContentService {
  private readonly logger = new Logger(CreatorContentService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly accounts: CreatorAccountService,
    private readonly linktrees: LinktreesService,
    private readonly miniWebsites: MiniWebsitesService,
    private readonly analytics: UnifiedAnalyticsService,
    private readonly analyticsReads: AnalyticsReadService,
    private readonly tiktokPixels: TikTokPixelConfigService,
    private readonly redis: RedisService,
  ) {}

  async context(businessId: string) {
    const profile = await this.accounts.profile(businessId);
    if (!profile) throw new NotFoundException('Creator account not found');
    return {
      account: this.accounts.accountViewFromProfile(profile),
      branding: {
        name: profile.display_name,
        logo: profile.logo,
        avatar: profile.avatar,
        favicon: null,
        accentColor: profile.accent_color,
      },
      publicPathPrefixes: { linktree: '/linktree', miniWebsite: '/bio' },
    };
  }

  listLinktrees(businessId: string) {
    return this.linktrees.getAllLinktrees(businessId);
  }

  async getLinktree(id: string, businessId: string) {
    const [linktree, links] = await Promise.all([
      this.linktrees.getLinktreeById(id, businessId),
      this.linktrees.getLinktreeLinks(id, businessId),
    ]);
    return { linktree, links };
  }

  async createLinktree(data: CreateLinktreeDto, businessId: string) {
    const reservationToken = await this.reservePageType(businessId, 'linktree');
    try {
      const created = await this.linktrees.createLinktree(
        { ...data, is_default: false },
        businessId,
        'platform',
      );
      await this.attachPage(
        businessId,
        'linktree',
        created.id,
        reservationToken,
      );
      return created;
    } catch (error) {
      await this.releaseEmptyReservation(
        businessId,
        'linktree',
        reservationToken,
      );
      rethrowRootSlugConflict(error);
    }
  }

  async updateLinktree(
    id: string,
    data: CreateLinktreeDto,
    businessId: string,
  ) {
    await this.assertWritableOwner(businessId, 'linktree', id);
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
    await this.invalidateRootPage(updated?.uid, updated?.seo_name, data.slug);
    return updated;
  }

  /**
   * Drops the cached copy of this Creator's root-domain page.
   *
   * The ordinary Linktree write purges the business-subdomain key space, which
   * a Creator page is never read through. Without this the public page kept
   * serving its previous body for the two-hour cache lifetime after every edit.
   * A failed purge must not fail the save, but it leaves a stale page behind,
   * so it has to be visible in the logs.
   */
  private async invalidateRootPage(
    ...identifiers: Array<string | null | undefined>
  ) {
    try {
      await Promise.all(
        rootPublicLinktreeCacheKeys(...identifiers).map((key) =>
          this.redis.del(key),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to clear the Creator public page cache: ${describeError(error)}`,
      );
    }
  }

  denyPageDeletion(): never {
    throw new ForbiddenException(
      'Creator pages can be deleted only by a platform administrator',
    );
  }

  async getTikTokSettings(businessId: string) {
    return {
      tiktok_configs: await this.tiktokPixels.list(businessId),
      max_groups: 1,
    };
  }

  async updateTikTokSettings(businessId: string, configs: unknown) {
    await this.assertCanWrite(businessId);
    return {
      tiktok_configs: await this.tiktokPixels.replace(businessId, configs, {
        maxGroups: 1,
      }),
      max_groups: 1,
    };
  }

  getTikTokHealth(businessId: string) {
    return this.analyticsReads.getTikTokHealth(businessId, {});
  }

  /**
   * Returned exactly as the read service shapes it — `{ items: [...] }`. The
   * shared delivery panel reads `.items`, so wrapping it a second time here
   * handed that panel an object where it expected an array and took the
   * Settings tab down on `errors.map`.
   */
  getTikTokErrors(businessId: string) {
    return this.analyticsReads.getTikTokDeliveryErrors(businessId, 20);
  }

  listMiniWebsites(businessId: string) {
    return this.miniWebsites.list(businessId);
  }

  getMiniWebsite(id: string, businessId: string) {
    return this.miniWebsites.get(id, businessId);
  }

  async createMiniWebsite(data: SaveMiniWebsiteDto, businessId: string) {
    const reservationToken = await this.reservePageType(
      businessId,
      'mini_website',
    );
    try {
      const created = await this.miniWebsites.create(
        data,
        businessId,
        'platform',
      );
      await this.attachPage(
        businessId,
        'mini_website',
        created.id,
        reservationToken,
      );
      return created;
    } catch (error) {
      await this.releaseEmptyReservation(
        businessId,
        'mini_website',
        reservationToken,
      );
      rethrowRootSlugConflict(error);
    }
  }

  async updateMiniWebsite(
    id: string,
    data: SaveMiniWebsiteDto,
    businessId: string,
  ) {
    await this.assertWritableOwner(businessId, 'mini_website', id);
    try {
      return await this.miniWebsites.update(id, data, businessId, 'platform');
    } catch (error) {
      rethrowRootSlugConflict(error);
    }
  }

  async slugAvailable(pageType: PageType, slug: string, excludeId?: string) {
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) return false;
    const result = await this.database.query<{ available: boolean }>(
      `SELECT NOT EXISTS (
         SELECT 1 FROM root_public_slugs
          WHERE page_type = $1 AND slug = $2
            AND ($3::uuid IS NULL OR COALESCE(linktree_id, mini_website_id) <> $3::uuid)
       ) AS available`,
      [pageType, normalized, excludeId || null],
    );
    return result.rows[0]?.available ?? false;
  }

  nameAvailable(businessId: string, name: string, excludeId?: string) {
    return this.linktrees.isNameAvailable(businessId, name, excludeId);
  }

  async analyticsSummary(
    businessId: string,
    pageType: PageType,
    pageId?: string,
  ) {
    if (pageId) await this.assertOwner(businessId, pageType, pageId);
    return this.analytics.getSummary(businessId, { pageType, pageId });
  }

  /**
   * The per-action click rows behind a Creator page.
   *
   * The shared analytics modal renders the same button list for a Creator as
   * it does for a business; only the endpoint differs, because the business
   * route is behind `BusinessGuard`. Ownership is proven against the Creator
   * session's workspace before the read, and `getActions` is itself scoped to
   * that business id.
   */
  async pageActions(businessId: string, pageType: PageType, pageId: string) {
    await this.assertOwner(businessId, pageType, pageId);
    return this.analyticsReads.getActions(businessId, { pageId });
  }

  async clearAnalytics(
    businessId: string,
    pageType: PageType,
    pageId?: string,
  ) {
    if (pageId) {
      await this.assertWritableOwner(businessId, pageType, pageId);
      await this.analytics.clear(businessId, pageId);
      return;
    }
    await this.assertCanWrite(businessId);
    const pages =
      pageType === 'linktree'
        ? await this.linktrees.getAllLinktrees(businessId)
        : await this.miniWebsites.list(businessId);
    for (const page of pages) await this.analytics.clear(businessId, page.id);
  }

  private async reservePageType(businessId: string, pageType: PageType) {
    await this.assertCanWrite(businessId);
    const reservationToken = randomUUID();
    const result = await this.database.query<{
      page_type: PageType;
      linktree_id: string | null;
      mini_website_id: string | null;
    }>(
      `UPDATE creator_accounts
          SET page_type = $2,
              page_reservation_token = $3,
              page_reservation_expires_at = NOW() + interval '5 minutes'
        WHERE business_id = $1
          AND linktree_id IS NULL AND mini_website_id IS NULL
          AND (page_type IS NULL OR page_reservation_expires_at < NOW())
      RETURNING page_type, linktree_id, mini_website_id`,
      [businessId, pageType, reservationToken],
    );
    if (!result.rows[0]) {
      throw new ConflictException(
        'A Creator account can own only one Linktree or one mini website',
      );
    }
    return reservationToken;
  }

  private async attachPage(
    businessId: string,
    pageType: PageType,
    pageId: string,
    reservationToken: string,
  ) {
    const column = pageType === 'linktree' ? 'linktree_id' : 'mini_website_id';
    await this.database.query(
      `UPDATE creator_accounts
          SET ${column} = $2,
              trial_started_at = COALESCE(trial_started_at, NOW()),
              trial_ends_at = COALESCE(trial_ends_at, NOW() + make_interval(days => trial_days)),
              grace_ends_at = COALESCE(grace_ends_at, NOW() + make_interval(days => trial_days + 3)),
              page_reservation_token = NULL,
              page_reservation_expires_at = NULL
        WHERE business_id = $1 AND page_type = $3
          AND page_reservation_token = $4`,
      [businessId, pageId, pageType, reservationToken],
    );
  }

  private async releaseEmptyReservation(
    businessId: string,
    pageType: PageType,
    reservationToken: string,
  ) {
    await this.database.query(
      `UPDATE creator_accounts
          SET page_type = NULL, page_reservation_token = NULL,
              page_reservation_expires_at = NULL
        WHERE business_id = $1 AND page_type = $2
          AND page_reservation_token = $3
          AND linktree_id IS NULL AND mini_website_id IS NULL`,
      [businessId, pageType, reservationToken],
    );
  }

  private async assertOwner(
    businessId: string,
    pageType: PageType,
    pageId: string,
  ) {
    const column = pageType === 'linktree' ? 'linktree_id' : 'mini_website_id';
    const result = await this.database.query<{ found: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM creator_accounts
          WHERE business_id = $1 AND page_type = $2 AND ${column} = $3
       ) AS found`,
      [businessId, pageType, pageId],
    );
    if (!result.rows[0]?.found) throw new NotFoundException('Page not found');
  }

  private async assertWritableOwner(
    businessId: string,
    pageType: PageType,
    pageId: string,
  ) {
    await this.assertCanWrite(businessId);
    await this.assertOwner(businessId, pageType, pageId);
  }

  private async assertCanWrite(businessId: string) {
    const result = await this.database.query<{ can_write: boolean }>(
      `SELECT (status = 'active' AND (
                paid_started_at IS NOT NULL OR trial_started_at IS NULL
                OR trial_ends_at > NOW()
              )) AS can_write
         FROM creator_accounts WHERE business_id = $1`,
      [businessId],
    );
    if (!result.rows[0]?.can_write) {
      throw new ForbiddenException(
        'Your trial has ended. Activate billing to change this page.',
      );
    }
  }
}
