import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { AdvertisingServiceConfig } from '@linktree/types';
import { DatabaseService } from '../database/database.service';
import { ENTITLEMENT, entitledSql } from '../billing/entitlement-sql';
import { writeConfig } from './advertising.write';
import {
  type AdvertisingCategoryRow,
  type AdvertisingContentRows,
  type AdvertisingFaqRow,
  type AdvertisingPageRow,
  type AdvertisingProviderRow,
  type AdvertisingResultRow,
  type AdvertisingSectionRow,
  type AdvertisingTestimonialRow,
  type AdvertisingTierRow,
} from './advertising.projection';

/**
 * Every list is replaced whole inside one transaction: rows whose editor key is
 * absent from the incoming list are deleted, the rest are upserted with their
 * array index as `position`. That is how `mini-websites.service` reconciles its
 * sections and items, and it is why the editor keys have to be stable — a
 * regenerated id would read as "delete the old row, insert a new one" and take
 * anything attached to it along.
 *
 * Publishing deliberately registers no `public_page_actions` rows. The
 * advertising page is not one of the two surfaces allowed to report to TikTok
 * (docs/tracking.md), `TIKTOK_FORWARDED_PAGE_TYPES` excludes it, and neither
 * public advertising component calls the page tracker — so an action row here
 * would report a permanent zero and pad every analytics breakdown with noise,
 * which is the exact failure docs/tracking.md warns about. If ad-page
 * engagement should appear in a business's own analytics, that is an
 * internal-only tracking feature to design, not a row to write here.
 */

/**
 * How many snapshots a page keeps. Matches the `listVersions` read cap, so what
 * the API can offer and what the table holds are the same number rather than
 * two that drift.
 */
const VERSION_HISTORY_LIMIT = 50;

@Injectable()
export class AdvertisingRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPageByBusiness(
    businessId: string,
  ): Promise<AdvertisingPageRow | null> {
    const result = await this.database.query<AdvertisingPageRow>(
      `SELECT id, business_id, status, current_version, title, description,
              closing_cta_title, closing_cta_description, closing_cta_button_label,
              whatsapp_number, video_url, video_tutorial_title, tutorial_steps,
              receipt_example_image_url, published_at
         FROM advertising_pages
        WHERE business_id = $1`,
      [businessId],
    );
    return result.rows[0] ?? null;
  }

  /**
   * The visitor's read: the published *snapshot*, not the live rows.
   *
   * This is the whole point of the version table. The editor writes the rows
   * continuously, so reading them here would mean a half-finished tab save
   * reached visitors the moment the cache lapsed — publishing would decide
   * nothing. The payload is what the owner last chose to make live.
   *
   * The entitlement is re-checked here rather than trusted from publish time.
   * `status = 'published'` records what the owner last chose while they still
   * had the feature; it does not expire when the plan does. Without this a
   * business that downgrades keeps a live advertising page it can no longer
   * open, edit, or take down.
   */
  async findPublishedPayloadBySubdomain(
    subdomain: string,
  ): Promise<AdvertisingServiceConfig | null> {
    const result = await this.database.query<{
      payload: AdvertisingServiceConfig;
    }>(
      `SELECT version.payload
         FROM advertising_page_versions version
         JOIN advertising_pages page ON page.id = version.advertising_page_id
         JOIN businesses business ON business.id = page.business_id
        WHERE LOWER(business.subdomain) = LOWER($1)
          AND business.status = 'active'
          AND page.status = 'published'
          AND version.published = true
          AND ${entitledSql(ENTITLEMENT.advertisingPage)}`,
      [subdomain],
    );
    return result.rows[0]?.payload ?? null;
  }

  async findPublishedVersion(pageId: string): Promise<number | null> {
    const result = await this.database.query<{ version: number }>(
      `SELECT version FROM advertising_page_versions
        WHERE advertising_page_id = $1 AND published = true`,
      [pageId],
    );
    return result.rows[0]?.version ?? null;
  }

  /** The snapshot currently live for a page, used to detect unpublished edits. */
  async findPublishedPayload(
    pageId: string,
  ): Promise<AdvertisingServiceConfig | null> {
    const result = await this.database.query<{
      payload: AdvertisingServiceConfig;
    }>(
      `SELECT payload FROM advertising_page_versions
        WHERE advertising_page_id = $1 AND published = true`,
      [pageId],
    );
    return result.rows[0]?.payload ?? null;
  }

  async loadContent(page: AdvertisingPageRow): Promise<AdvertisingContentRows> {
    const [
      sections,
      categories,
      tiers,
      results,
      testimonials,
      faqs,
      providers,
    ] = await Promise.all([
      this.database.query<AdvertisingSectionRow>(
        `SELECT section_key, enabled FROM advertising_sections
            WHERE advertising_page_id = $1 ORDER BY position, section_key`,
        [page.id],
      ),
      this.database.query<AdvertisingCategoryRow>(
        `SELECT id, category_key, label, color FROM advertising_package_categories
            WHERE advertising_page_id = $1 ORDER BY position, category_key`,
        [page.id],
      ),
      this.database.query<AdvertisingTierRow>(
        `SELECT tier.category_id, tier.tier_key, tier.price, tier.views_label
             FROM advertising_package_tiers tier
             JOIN advertising_package_categories category
               ON category.id = tier.category_id
            WHERE category.advertising_page_id = $1
            ORDER BY tier.position, tier.tier_key`,
        [page.id],
      ),
      this.database.query<AdvertisingResultRow>(
        `SELECT item_key, category, before_label, after_label, price, color,
                  before_image_url, after_image_url
             FROM advertising_results
            WHERE advertising_page_id = $1 ORDER BY position, item_key`,
        [page.id],
      ),
      this.database.query<AdvertisingTestimonialRow>(
        `SELECT item_key, name, role, quote, color, avatar_url
             FROM advertising_testimonials
            WHERE advertising_page_id = $1 ORDER BY position, item_key`,
        [page.id],
      ),
      this.database.query<AdvertisingFaqRow>(
        `SELECT item_key, question, answer FROM advertising_faqs
            WHERE advertising_page_id = $1 ORDER BY position, item_key`,
        [page.id],
      ),
      this.database.query<AdvertisingProviderRow>(
        `SELECT provider_key, name, phone, logo_url
             FROM advertising_payment_providers
            WHERE advertising_page_id = $1 ORDER BY position, provider_key`,
        [page.id],
      ),
    ]);

    return {
      page,
      sections: sections.rows,
      categories: categories.rows,
      tiers: tiers.rows,
      results: results.rows,
      testimonials: testimonials.rows,
      faqs: faqs.rows,
      providers: providers.rows,
    };
  }

  /**
   * Creates the page and its starting content in one transaction, or returns
   * the existing one. Concurrent first-loads of the editor both try to seed;
   * `ON CONFLICT (business_id)` makes the loser a no-op rather than an error.
   */
  async createFromConfig(
    businessId: string,
    config: AdvertisingServiceConfig,
  ): Promise<AdvertisingPageRow> {
    return this.database.transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO advertising_pages (business_id, status)
              VALUES ($1, 'draft')
         ON CONFLICT (business_id) DO NOTHING
           RETURNING id`,
        [businessId],
      );
      if (!inserted.rows[0]) {
        const existing = await client.query<AdvertisingPageRow>(
          `SELECT id, business_id, status, current_version, title, description,
                  closing_cta_title, closing_cta_description,
                  closing_cta_button_label, whatsapp_number, video_url,
                  video_tutorial_title, tutorial_steps,
                  receipt_example_image_url, published_at
             FROM advertising_pages WHERE business_id = $1`,
          [businessId],
        );
        return existing.rows[0];
      }
      const pageId = inserted.rows[0].id;
      await writeConfig(client, pageId, config);
      const created = await client.query<AdvertisingPageRow>(
        `SELECT id, business_id, status, current_version, title, description,
                closing_cta_title, closing_cta_description,
                closing_cta_button_label, whatsapp_number, video_url,
                video_tutorial_title, tutorial_steps,
                receipt_example_image_url, published_at
           FROM advertising_pages WHERE id = $1`,
        [pageId],
      );
      return created.rows[0];
    });
  }

  /** Applies a full config to an existing page, replacing every list. */
  async replaceContent(
    pageId: string,
    config: AdvertisingServiceConfig,
  ): Promise<void> {
    await this.database.transaction((client) =>
      writeConfig(client, pageId, config),
    );
  }

  /**
   * Promotes the current draft to a published version.
   *
   * The snapshot and the status change share one transaction so a published
   * page always has the version row that says what it contains.
   */
  async publish(
    pageId: string,
    payload: AdvertisingServiceConfig,
  ): Promise<number> {
    return this.database.transaction((client) =>
      this.publishWithin(client, pageId, payload),
    );
  }

  /**
   * Writes a config and publishes it in one transaction.
   *
   * The editor's Save is what makes content live, but publish may also arrive
   * on its own from the dashboard header — the two halves must not be able to
   * land apart. As two requests, a publish that failed after a successful save
   * left the draft written and visitors still on the previous content, with
   * nothing in the UI saying so.
   */
  async saveAndPublish(
    pageId: string,
    config: AdvertisingServiceConfig,
  ): Promise<number> {
    return this.database.transaction(async (client) => {
      await writeConfig(client, pageId, config);
      return this.publishWithin(client, pageId, config);
    });
  }

  /** The publish half, so it can share a caller's transaction. */
  private async publishWithin(
    client: PoolClient,
    pageId: string,
    payload: AdvertisingServiceConfig,
  ): Promise<number> {
    const bumped = await client.query<{ current_version: number }>(
      `UPDATE advertising_pages
          SET status = 'published',
              current_version = current_version + 1,
              published_at = now()
        WHERE id = $1
      RETURNING current_version`,
      [pageId],
    );
    const version = bumped.rows[0].current_version;
    await client.query(
      `INSERT INTO advertising_page_versions
            (advertising_page_id, version, payload, published)
            VALUES ($1, $2, $3::jsonb, true)`,
      [pageId, version, JSON.stringify({ ...payload, status: 'published' })],
    );
    // Only one version is the live one.
    await client.query(
      `UPDATE advertising_page_versions
          SET published = false
        WHERE advertising_page_id = $1 AND version <> $2`,
      [pageId, version],
    );
    await this.pruneVersions(client, pageId);
    return version;
  }

  /**
   * Keeps version history bounded.
   *
   * Every Save publishes, so a page accumulates one immutable jsonb snapshot
   * per press — an editing session alone can add dozens, and nothing ever
   * removed them. `listVersions` caps what is *read* at 50, which hid the
   * growth rather than bounding it.
   *
   * The live version is never pruned regardless of age, so the public read
   * cannot lose the payload it serves.
   */
  private async pruneVersions(
    client: PoolClient,
    pageId: string,
  ): Promise<void> {
    await client.query(
      `DELETE FROM advertising_page_versions
        WHERE advertising_page_id = $1
          AND published = false
          AND version NOT IN (
            SELECT version FROM advertising_page_versions
             WHERE advertising_page_id = $1
             ORDER BY version DESC
             LIMIT $2
          )`,
      [pageId, VERSION_HISTORY_LIMIT],
    );
  }

  /**
   * Takes the page down.
   *
   * The version's `published` flag is cleared alongside the page status. They
   * answer the same question — "is this what visitors see?" — and leaving the
   * flag set meant the editor read reported a live version number and no
   * unpublished changes for a page nobody could reach.
   */
  async unpublish(pageId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        `UPDATE advertising_pages SET status = 'paused' WHERE id = $1`,
        [pageId],
      );
      await client.query(
        `UPDATE advertising_page_versions
            SET published = false
          WHERE advertising_page_id = $1 AND published = true`,
        [pageId],
      );
    });
  }

  async listVersions(
    pageId: string,
  ): Promise<Array<{ version: number; published: boolean; created_at: Date }>> {
    const result = await this.database.query<{
      version: number;
      published: boolean;
      created_at: Date;
    }>(
      `SELECT version, published, created_at
         FROM advertising_page_versions
        WHERE advertising_page_id = $1
        ORDER BY version DESC
        LIMIT 50`,
      [pageId],
    );
    return result.rows;
  }

  async findVersionPayload(
    pageId: string,
    version: number,
  ): Promise<AdvertisingServiceConfig | null> {
    const result = await this.database.query<{
      payload: AdvertisingServiceConfig;
    }>(
      `SELECT payload FROM advertising_page_versions
        WHERE advertising_page_id = $1 AND version = $2`,
      [pageId, version],
    );
    return result.rows[0]?.payload ?? null;
  }
}
