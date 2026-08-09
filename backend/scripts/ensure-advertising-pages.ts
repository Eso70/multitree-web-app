import type { PoolClient } from 'pg';
import { inTransaction } from '../src/database/migration-transaction';
import { createDefaultAdvertisingConfig } from '../src/advertising/advertising.defaults';
import { ENTITLEMENT, entitledSql } from '../src/billing/entitlement-sql';
import { writeConfig } from '../src/advertising/advertising.write';

/**
 * Gives every business that is entitled to the feature a draft advertising page.
 *
 * Draft, not published. Seeding a live page would put a public URL in front of
 * visitors that nobody has ever looked at, and the starting content is
 * deliberately thin — no testimonials, results or payment details. The owner
 * publishes when the page says what they want it to say.
 *
 * Entitled only: the advertising permissions require `feature.advertising_page`,
 * which only the top plan carries. Seeding a page for a business that cannot
 * open the editor would create a row it can neither see nor remove.
 *
 * Idempotent: businesses that already have a page are skipped entirely, so a
 * rerun never overwrites edited content. Schema is owned by migrations.
 */
export async function ensureAdvertisingPages(
  client: PoolClient,
): Promise<void> {
  const missing = await client.query<{ id: string; phone: string | null }>(
    `SELECT business.id, business.phone
       FROM public.businesses business
       LEFT JOIN public.advertising_pages page
         ON page.business_id = business.id
      WHERE page.id IS NULL
        AND ${entitledSql(ENTITLEMENT.advertisingPage)}`,
  );

  for (const business of missing.rows) {
    await inTransaction(client, async () => {
      const created = await client.query<{ id: string }>(
        `INSERT INTO public.advertising_pages (business_id, status)
              VALUES ($1, 'draft')
         ON CONFLICT (business_id) DO NOTHING
           RETURNING id`,
        [business.id],
      );
      const pageId = created.rows[0]?.id;
      // Another run created it between the SELECT and here.
      if (!pageId) return;

      // No version row is written: nothing is published yet, and the public
      // endpoint reads the published snapshot, so /advertising stays a 404
      // until the owner presses Publish.
      await writeConfig(
        client,
        pageId,
        createDefaultAdvertisingConfig(business.phone ?? ''),
      );
    });
  }

  await archiveLegacyAdvertisingActions(client);
}

/**
 * Retires `public_page_actions` rows an earlier build wrote on publish.
 *
 * Publishing used to seed four tracked actions per advertising page. Nothing on
 * either public advertising component ever reported against them and
 * `TIKTOK_FORWARDED_PAGE_TYPES` excludes the page type, so they were permanent
 * zeros padding every analytics breakdown — the failure docs/tracking.md warns
 * about. The writer is gone; rows already in a database that published under
 * the old code need retiring, and a fresh database simply has none to retire.
 *
 * Archived rather than deleted, matching how every other retired action row is
 * handled: anything already recorded against them keeps its referent.
 */
async function archiveLegacyAdvertisingActions(
  client: PoolClient,
): Promise<void> {
  await client.query(
    `UPDATE public.public_page_actions action
        SET status = 'archived', updated_at = now()
       FROM public.public_pages page
      WHERE page.id = action.public_page_id
        AND page.page_type = 'advertising'
        AND action.status <> 'archived'`,
  );
}
