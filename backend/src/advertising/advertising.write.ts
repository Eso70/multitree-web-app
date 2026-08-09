import type { PoolClient } from 'pg';
import type { AdvertisingServiceConfig } from '@linktree/types';
import { ADVERTISING_SECTION_KEYS } from './advertising.projection';

/**
 * Writes a whole config into the relational rows for one page.
 *
 * Lives outside the repository because the migration seed needs the same
 * behaviour without Nest's DI container: a second copy in the seed script is
 * exactly how the two would stop agreeing about what a new page contains.
 *
 * Every list is replaced whole: rows whose editor key is absent from the
 * incoming list are deleted, the rest are upserted with their array index as
 * `position`. That is why the editor keys have to be stable — a regenerated id
 * would read as "delete the old row, insert a new one" and take anything
 * attached to it along.
 *
 * Each list is one delete and one multi-row upsert, unnesting parallel arrays
 * rather than issuing a statement per item. A full page is allowed 30 results,
 * 30 testimonials, 40 FAQs, 12 providers and 20 categories of 20 tiers, so the
 * per-item shape meant well over a hundred sequential round trips holding a
 * write transaction open on every save.
 *
 * The caller owns the transaction.
 */
export async function writeConfig(
  client: PoolClient,
  pageId: string,
  config: AdvertisingServiceConfig,
): Promise<void> {
  await client.query(
    `UPDATE advertising_pages
        SET title = $2,
            description = $3,
            whatsapp_number = $4,
            closing_cta_title = $5,
            closing_cta_description = $6,
            closing_cta_button_label = $7,
            video_url = $8,
            video_tutorial_title = $9,
            tutorial_steps = $10::text[],
            receipt_example_image_url = $11
      WHERE id = $1`,
    [
      pageId,
      config.title,
      config.description,
      config.whatsappNumber,
      config.closingCta.title,
      config.closingCta.description,
      config.closingCta.buttonLabel,
      config.videoUrl,
      config.videoTutorialTitle,
      config.tutorialSteps,
      config.receiptExampleImageUrl ?? '',
    ],
  );

  await writeSections(client, pageId, config);
  await writeCategoriesAndTiers(client, pageId, config);
  await writeResults(client, pageId, config);
  await writeTestimonials(client, pageId, config);
  await writeFaqs(client, pageId, config);
  await writeProviders(client, pageId, config);
}

async function writeSections(
  client: PoolClient,
  pageId: string,
  config: AdvertisingServiceConfig,
): Promise<void> {
  const visibility: Record<string, boolean> = {
    hero: config.sections.hero,
    journey: config.sections.journey,
    results: config.sections.results,
    packages: config.sections.packages,
    testimonials: config.sections.testimonials,
    faq: config.sections.faq,
    closing_cta: config.sections.closingCta,
  };
  await client.query(
    `INSERT INTO advertising_sections
          (advertising_page_id, section_key, enabled, position)
     SELECT $1, item.section_key, item.enabled, item.position
       FROM unnest($2::text[], $3::boolean[], $4::int[])
         AS item(section_key, enabled, position)
     ON CONFLICT (advertising_page_id, section_key)
     DO UPDATE SET enabled = EXCLUDED.enabled, position = EXCLUDED.position`,
    [
      pageId,
      [...ADVERTISING_SECTION_KEYS],
      ADVERTISING_SECTION_KEYS.map((key) => visibility[key]),
      ADVERTISING_SECTION_KEYS.map((_, index) => index),
    ],
  );
}

async function writeCategoriesAndTiers(
  client: PoolClient,
  pageId: string,
  config: AdvertisingServiceConfig,
): Promise<void> {
  const keys = config.packageCategories.map((category) => category.id);
  // Deleting a category cascades to its tiers, which is the same outcome the
  // editor produces when it drops the category's entry from the tier map.
  await client.query(
    `DELETE FROM advertising_package_categories
      WHERE advertising_page_id = $1 AND category_key <> ALL($2::text[])`,
    [pageId, keys],
  );

  // Upserted in one statement; `RETURNING` hands back the row ids for both the
  // inserted and the updated categories, which is what the tiers hang off.
  const saved = await client.query<{ id: string; category_key: string }>(
    `INSERT INTO advertising_package_categories
          (advertising_page_id, category_key, label, color, position)
     SELECT $1, item.category_key, item.label, item.color, item.position
       FROM unnest($2::text[], $3::text[], $4::text[], $5::int[])
         AS item(category_key, label, color, position)
     ON CONFLICT (advertising_page_id, category_key)
     DO UPDATE SET label = EXCLUDED.label,
                   color = EXCLUDED.color,
                   position = EXCLUDED.position
       RETURNING id, category_key`,
    [
      pageId,
      keys,
      config.packageCategories.map((category) => category.label),
      config.packageCategories.map((category) => category.color ?? 'lime'),
      config.packageCategories.map((_, index) => index),
    ],
  );
  const categoryIdByKey = new Map(
    saved.rows.map((row) => [row.category_key, row.id]),
  );

  const tierCategoryIds: string[] = [];
  const tierKeys: string[] = [];
  const tierPrices: number[] = [];
  const tierViews: string[] = [];
  const tierPositions: number[] = [];
  for (const category of config.packageCategories) {
    const categoryId = categoryIdByKey.get(category.id);
    if (!categoryId) continue;
    const tiers = config.packageTiers[category.id] ?? [];
    for (const [index, tier] of tiers.entries()) {
      tierCategoryIds.push(categoryId);
      tierKeys.push(tier.id);
      tierPrices.push(tier.price);
      tierViews.push(tier.views);
      tierPositions.push(index);
    }
  }

  // Scoped to this page's categories, so one delete covers every tier list.
  await client.query(
    `DELETE FROM advertising_package_tiers tier
      USING advertising_package_categories category
      WHERE category.id = tier.category_id
        AND category.advertising_page_id = $1
        AND NOT EXISTS (
          SELECT 1
            FROM unnest($2::uuid[], $3::text[]) AS keep(category_id, tier_key)
           WHERE keep.category_id = tier.category_id
             AND keep.tier_key = tier.tier_key
        )`,
    [pageId, tierCategoryIds, tierKeys],
  );

  await client.query(
    `INSERT INTO advertising_package_tiers
          (category_id, tier_key, price, views_label, position)
     SELECT item.category_id, item.tier_key, item.price, item.views_label,
            item.position
       FROM unnest($1::uuid[], $2::text[], $3::numeric[], $4::text[], $5::int[])
         AS item(category_id, tier_key, price, views_label, position)
     ON CONFLICT (category_id, tier_key)
     DO UPDATE SET price = EXCLUDED.price,
                   views_label = EXCLUDED.views_label,
                   position = EXCLUDED.position`,
    [tierCategoryIds, tierKeys, tierPrices, tierViews, tierPositions],
  );
}

async function writeResults(
  client: PoolClient,
  pageId: string,
  config: AdvertisingServiceConfig,
): Promise<void> {
  const keys = config.results.map((result) => result.id);
  await client.query(
    `DELETE FROM advertising_results
      WHERE advertising_page_id = $1 AND item_key <> ALL($2::text[])`,
    [pageId, keys],
  );
  await client.query(
    `INSERT INTO advertising_results
          (advertising_page_id, item_key, category, before_label, after_label,
           price, color, before_image_url, after_image_url, position)
     SELECT $1, item.item_key, item.category, item.before_label,
            item.after_label, item.price, item.color, item.before_image_url,
            item.after_image_url, item.position
       FROM unnest($2::text[], $3::text[], $4::text[], $5::text[],
                   $6::numeric[], $7::text[], $8::text[], $9::text[],
                   $10::int[])
         AS item(item_key, category, before_label, after_label, price, color,
                 before_image_url, after_image_url, position)
     ON CONFLICT (advertising_page_id, item_key)
     DO UPDATE SET category = EXCLUDED.category,
                   before_label = EXCLUDED.before_label,
                   after_label = EXCLUDED.after_label,
                   price = EXCLUDED.price,
                   color = EXCLUDED.color,
                   before_image_url = EXCLUDED.before_image_url,
                   after_image_url = EXCLUDED.after_image_url,
                   position = EXCLUDED.position`,
    [
      pageId,
      keys,
      config.results.map((result) => result.category),
      config.results.map((result) => result.before),
      config.results.map((result) => result.after),
      config.results.map((result) => result.price),
      config.results.map((result) => result.color),
      config.results.map((result) => result.beforeImageUrl ?? ''),
      config.results.map((result) => result.afterImageUrl ?? ''),
      config.results.map((_, index) => index),
    ],
  );
}

async function writeTestimonials(
  client: PoolClient,
  pageId: string,
  config: AdvertisingServiceConfig,
): Promise<void> {
  const keys = config.testimonials.map((testimonial) => testimonial.id);
  await client.query(
    `DELETE FROM advertising_testimonials
      WHERE advertising_page_id = $1 AND item_key <> ALL($2::text[])`,
    [pageId, keys],
  );
  await client.query(
    `INSERT INTO advertising_testimonials
          (advertising_page_id, item_key, name, role, quote, color,
           avatar_url, position)
     SELECT $1, item.item_key, item.name, item.role, item.quote, item.color,
            item.avatar_url, item.position
       FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                   $7::text[], $8::int[])
         AS item(item_key, name, role, quote, color, avatar_url, position)
     ON CONFLICT (advertising_page_id, item_key)
     DO UPDATE SET name = EXCLUDED.name,
                   role = EXCLUDED.role,
                   quote = EXCLUDED.quote,
                   color = EXCLUDED.color,
                   avatar_url = EXCLUDED.avatar_url,
                   position = EXCLUDED.position`,
    [
      pageId,
      keys,
      config.testimonials.map((testimonial) => testimonial.name),
      config.testimonials.map((testimonial) => testimonial.role),
      config.testimonials.map((testimonial) => testimonial.quote),
      config.testimonials.map((testimonial) => testimonial.color),
      config.testimonials.map((testimonial) => testimonial.avatarUrl ?? ''),
      config.testimonials.map((_, index) => index),
    ],
  );
}

async function writeFaqs(
  client: PoolClient,
  pageId: string,
  config: AdvertisingServiceConfig,
): Promise<void> {
  const keys = config.faqs.map((faq) => faq.id);
  await client.query(
    `DELETE FROM advertising_faqs
      WHERE advertising_page_id = $1 AND item_key <> ALL($2::text[])`,
    [pageId, keys],
  );
  await client.query(
    `INSERT INTO advertising_faqs
          (advertising_page_id, item_key, question, answer, position)
     SELECT $1, item.item_key, item.question, item.answer, item.position
       FROM unnest($2::text[], $3::text[], $4::text[], $5::int[])
         AS item(item_key, question, answer, position)
     ON CONFLICT (advertising_page_id, item_key)
     DO UPDATE SET question = EXCLUDED.question,
                   answer = EXCLUDED.answer,
                   position = EXCLUDED.position`,
    [
      pageId,
      keys,
      config.faqs.map((faq) => faq.question),
      config.faqs.map((faq) => faq.answer),
      config.faqs.map((_, index) => index),
    ],
  );
}

async function writeProviders(
  client: PoolClient,
  pageId: string,
  config: AdvertisingServiceConfig,
): Promise<void> {
  const keys = config.paymentProviders.map((provider) => provider.id);
  await client.query(
    `DELETE FROM advertising_payment_providers
      WHERE advertising_page_id = $1 AND provider_key <> ALL($2::text[])`,
    [pageId, keys],
  );
  await client.query(
    `INSERT INTO advertising_payment_providers
          (advertising_page_id, provider_key, name, phone, logo_url, position)
     SELECT $1, item.provider_key, item.name, item.phone, item.logo_url,
            item.position
       FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::int[])
         AS item(provider_key, name, phone, logo_url, position)
     ON CONFLICT (advertising_page_id, provider_key)
     DO UPDATE SET name = EXCLUDED.name,
                   phone = EXCLUDED.phone,
                   logo_url = EXCLUDED.logo_url,
                   position = EXCLUDED.position`,
    [
      pageId,
      keys,
      config.paymentProviders.map((provider) => provider.name),
      config.paymentProviders.map((provider) => provider.phone),
      config.paymentProviders.map((provider) => provider.logoUrl ?? ''),
      config.paymentProviders.map((_, index) => index),
    ],
  );
}
