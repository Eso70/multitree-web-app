import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdvertisingDraftConfig,
  AdvertisingPriceRow,
  AdvertisingServiceConfig,
} from '@linktree/types';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { createDefaultAdvertisingConfig } from './advertising.defaults';
import { projectAdvertisingConfig } from './advertising.projection';
import { AdvertisingRepository } from './advertising.repository';
import type { SaveAdvertisingDto } from './dto/advertising.dto';

/** Published pages are read on every public request; drafts never are. */
const PUBLIC_CACHE_PREFIX = 'public:advertising:';
const PUBLIC_CACHE_TTL_SECONDS = 300;

@Injectable()
export class AdvertisingService {
  constructor(
    private readonly repository: AdvertisingRepository,
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  /**
   * The editor's read. Seeds the page on first open so a business that has
   * never touched the Ads tab still edits real rows rather than a shape the
   * browser invented.
   */
  async getDraft(businessId: string): Promise<AdvertisingDraftConfig> {
    const page = await this.ensurePage(businessId);
    const draft = projectAdvertisingConfig(
      await this.repository.loadContent(page),
    );
    return this.withPublishState(page.id, draft);
  }

  /**
   * Marks whether the draft has moved on from what visitors currently see, so
   * the editor can show that Publish would change something. Compared by value
   * rather than by a dirty flag: a save that puts a field back the way it was
   * leaves nothing to publish.
   */
  private async withPublishState(
    pageId: string,
    draft: AdvertisingServiceConfig,
  ): Promise<AdvertisingDraftConfig> {
    const published = await this.repository.findPublishedPayload(pageId);
    const publishedVersion = await this.repository.findPublishedVersion(pageId);
    return {
      ...draft,
      publishedVersion,
      hasUnpublishedChanges:
        !published ||
        stableStringify({ ...published, status: draft.status }) !==
          stableStringify(draft),
    };
  }

  async save(
    businessId: string,
    patch: SaveAdvertisingDto,
  ): Promise<AdvertisingDraftConfig> {
    const page = await this.ensurePage(businessId);
    const current = projectAdvertisingConfig(
      await this.repository.loadContent(page),
    );
    const merged = mergeConfig(current, patch);
    await this.repository.replaceContent(page.id, merged);
    // Deliberately does not touch the public cache: visitors read the
    // published snapshot, so a draft save cannot change what they see.
    return this.withPublishState(page.id, merged);
  }

  /**
   * The editor's Save. Writes the draft and makes it live in one transaction.
   *
   * The editor and the dashboard-header publish toggle both publish; as two
   * requests they could land apart, leaving a saved draft that visitors never
   * saw and nothing in the UI saying so.
   */
  async saveAndPublish(
    businessId: string,
    patch: SaveAdvertisingDto,
  ): Promise<AdvertisingDraftConfig> {
    const page = await this.ensurePage(businessId);
    const current = projectAdvertisingConfig(
      await this.repository.loadContent(page),
    );
    const published: AdvertisingServiceConfig = {
      ...mergeConfig(current, patch),
      status: 'published',
    };
    await this.repository.saveAndPublish(page.id, published);
    await this.invalidatePublicCacheForBusiness(businessId);
    return this.withPublishState(page.id, published);
  }

  async publish(businessId: string): Promise<AdvertisingDraftConfig> {
    const page = await this.ensurePage(businessId);
    const draft = projectAdvertisingConfig(
      await this.repository.loadContent(page),
    );
    const published: AdvertisingServiceConfig = {
      ...draft,
      status: 'published',
    };
    await this.repository.publish(page.id, published);
    await this.invalidatePublicCacheForBusiness(businessId);
    return this.withPublishState(page.id, published);
  }

  async unpublish(businessId: string): Promise<AdvertisingDraftConfig> {
    const page = await this.ensurePage(businessId);
    await this.repository.unpublish(page.id);
    await this.invalidatePublicCacheForBusiness(businessId);
    const refreshed =
      (await this.repository.findPageByBusiness(businessId)) ?? page;
    const draft = projectAdvertisingConfig(
      await this.repository.loadContent(refreshed),
    );
    return this.withPublishState(refreshed.id, draft);
  }

  async listVersions(businessId: string) {
    const page = await this.ensurePage(businessId);
    return this.repository.listVersions(page.id);
  }

  /**
   * Restores a previous snapshot into the draft. It does not publish: an
   * operator restoring a version should be able to look at it before visitors
   * do.
   */
  async restoreVersion(
    businessId: string,
    version: number,
  ): Promise<AdvertisingDraftConfig> {
    const page = await this.ensurePage(businessId);
    const payload = await this.repository.findVersionPayload(page.id, version);
    if (!payload) {
      throw new NotFoundException('Version not found');
    }
    const restored: AdvertisingServiceConfig = {
      ...payload,
      status: page.status,
    };
    await this.repository.replaceContent(page.id, restored);
    // Restores into the draft only: an operator should be able to look at a
    // restored version before visitors do. Publishing it is a second step, so
    // the public cache is deliberately untouched.
    return this.withPublishState(page.id, restored);
  }

  /**
   * The public read. Returns null rather than throwing so the controller
   * decides between 404 and 410 using the existing tombstone lookup.
   */
  async getPublishedBySubdomain(
    subdomain: string,
  ): Promise<AdvertisingServiceConfig | null> {
    const cacheKey = `${PUBLIC_CACHE_PREFIX}subdomain:${subdomain.toLowerCase()}`;
    // RedisService serializes and parses for us, and returns null when Redis
    // is unavailable, so a cache outage degrades to a database read.
    const cached = await this.redis.get<AdvertisingServiceConfig>(cacheKey);
    if (cached) return cached;

    const config =
      await this.repository.findPublishedPayloadBySubdomain(subdomain);
    if (!config) return null;
    await this.redis.set(cacheKey, config, PUBLIC_CACHE_TTL_SECONDS);
    return config;
  }

  private async ensurePage(businessId: string) {
    const existing = await this.repository.findPageByBusiness(businessId);
    if (existing) return existing;
    const phone = await this.businessPhone(businessId);
    return this.repository.createFromConfig(
      businessId,
      createDefaultAdvertisingConfig(phone),
    );
  }

  private async businessPhone(businessId: string): Promise<string> {
    const result = await this.database.query<{ phone: string | null }>(
      `SELECT phone FROM businesses WHERE id = $1`,
      [businessId],
    );
    return result.rows[0]?.phone ?? '';
  }

  /**
   * Drops the cached published payload for a business.
   *
   * Public because a plan change has to reach it too. The cached snapshot is
   * the one published read that is not re-derived per request, so without this
   * a business that lost `feature.advertising_page` kept serving its page for
   * up to the cache TTL after the downgrade — the entitlement is in the query
   * the cache short-circuits.
   */
  async invalidatePublicCacheForBusiness(businessId: string): Promise<void> {
    const result = await this.database.query<{ subdomain: string }>(
      `SELECT subdomain FROM businesses WHERE id = $1`,
      [businessId],
    );
    const subdomain = result.rows[0]?.subdomain;
    if (!subdomain) return;
    await this.redis.del(
      `${PUBLIC_CACHE_PREFIX}subdomain:${subdomain.toLowerCase()}`,
    );
  }
}

/**
 * Serializes with object keys in a fixed order, so two values that differ only
 * in key order compare equal.
 *
 * Needed because the published snapshot is `jsonb`, and PostgreSQL stores
 * jsonb keys sorted by length then bytewise rather than in insertion order. A
 * plain `JSON.stringify` comparison against a freshly projected config is
 * therefore always unequal — which would leave `hasUnpublishedChanges` stuck on
 * true, so Publish never disabled and every press appended an identical
 * version.
 *
 * Array order is meaningful here (it is the display order) and is preserved.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    // `undefined` is absent from JSON, and an optional field left unset must
    // not read as a change against a snapshot that simply omitted it.
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

/** Digits only: the wa.me destination is built from this, so nothing else belongs in it. */
function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 20);
}

/**
 * Applies a partial tab save onto the stored config.
 *
 * A field that is absent is untouched; a field that is present replaces its
 * whole value. Package tiers arrive nested inside their category, which is what
 * makes it impossible to save a tier list for a category that was not sent.
 */
export function mergeConfig(
  current: AdvertisingServiceConfig,
  patch: SaveAdvertisingDto,
): AdvertisingServiceConfig {
  const merged: AdvertisingServiceConfig = {
    ...current,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description }
      : {}),
    ...(patch.whatsappNumber !== undefined
      ? { whatsappNumber: normalizePhone(patch.whatsappNumber) }
      : {}),
    ...(patch.sections ? { sections: { ...patch.sections } } : {}),
    ...(patch.closingCta ? { closingCta: { ...patch.closingCta } } : {}),
    ...(patch.videoUrl !== undefined ? { videoUrl: patch.videoUrl } : {}),
    ...(patch.videoTutorialTitle !== undefined
      ? { videoTutorialTitle: patch.videoTutorialTitle }
      : {}),
    ...(patch.tutorialSteps ? { tutorialSteps: [...patch.tutorialSteps] } : {}),
    ...(patch.results
      ? {
          results: patch.results.map((result) => ({
            ...result,
            beforeImageUrl: result.beforeImageUrl,
            afterImageUrl: result.afterImageUrl,
          })),
        }
      : {}),
    ...(patch.testimonials
      ? { testimonials: patch.testimonials.map((item) => ({ ...item })) }
      : {}),
    ...(patch.faqs ? { faqs: patch.faqs.map((item) => ({ ...item })) } : {}),
    ...(patch.paymentProviders
      ? {
          paymentProviders: patch.paymentProviders.map((provider) => ({
            ...provider,
          })),
        }
      : {}),
    ...(patch.receiptExampleImageUrl !== undefined
      ? {
          receiptExampleImageUrl: patch.receiptExampleImageUrl ?? undefined,
        }
      : {}),
  };

  if (patch.packageCategories) {
    const packageTiers: Record<string, AdvertisingPriceRow[]> = {};
    for (const category of patch.packageCategories) {
      packageTiers[category.id] = category.tiers.map((tier) => ({ ...tier }));
    }
    merged.packageCategories = patch.packageCategories.map((category) => ({
      id: category.id,
      label: category.label,
      color: category.color,
    }));
    merged.packageTiers = packageTiers;
  }

  return merged;
}
