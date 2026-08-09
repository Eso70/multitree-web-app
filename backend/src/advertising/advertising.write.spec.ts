import type { PoolClient } from 'pg';
import type { AdvertisingServiceConfig } from '@linktree/types';
import { createDefaultAdvertisingConfig } from './advertising.defaults';
import { writeConfig } from './advertising.write';

/**
 * The write path is set-based on purpose.
 *
 * It used to issue one statement per list item, so a full page — 30 results, 30
 * testimonials, 40 FAQs, 12 providers, 20 categories of 20 tiers — meant well
 * over a hundred sequential round trips holding a write transaction open, and
 * the editor's Save runs this on every press. The guarantee worth protecting is
 * not a particular query count but that the count does not grow with content:
 * the moment someone reintroduces a per-item loop, this fails.
 */

interface RecordedQuery {
  text: string;
  values: unknown[];
}

function recordingClient(): { client: PoolClient; queries: RecordedQuery[] } {
  const queries: RecordedQuery[] = [];
  const client = {
    query: (text: string, values: unknown[] = []) => {
      queries.push({ text, values });
      // Only the category upsert reads its result back, to map key -> row id.
      if (text.includes('INSERT INTO advertising_package_categories')) {
        const keys = (values[1] ?? []) as string[];
        return Promise.resolve({
          rows: keys.map((key) => ({ id: `id-${key}`, category_key: key })),
        });
      }
      return Promise.resolve({ rows: [] });
    },
  } as unknown as PoolClient;
  return { client, queries };
}

function withLists(size: number): AdvertisingServiceConfig {
  const base = createDefaultAdvertisingConfig('9647500000000');
  return {
    ...base,
    results: Array.from({ length: size }, (_, index) => ({
      id: `result-${index}`,
      category: 'category',
      before: '1K',
      after: '2K',
      price: index,
      color: 'rose' as const,
    })),
    testimonials: Array.from({ length: size }, (_, index) => ({
      id: `testimonial-${index}`,
      name: 'Name',
      role: 'Role',
      quote: 'Quote',
      color: 'orange' as const,
    })),
    faqs: Array.from({ length: size }, (_, index) => ({
      id: `faq-${index}`,
      question: 'Question',
      answer: 'Answer',
    })),
    paymentProviders: Array.from({ length: size }, (_, index) => ({
      id: `provider-${index}`,
      name: 'Provider',
      phone: '0750',
    })),
  };
}

describe('advertising write path', () => {
  it('issues the same number of statements regardless of how much content there is', async () => {
    const small = recordingClient();
    await writeConfig(small.client, 'page-1', withLists(1));

    const large = recordingClient();
    await writeConfig(large.client, 'page-1', withLists(40));

    expect(large.queries.length).toBe(small.queries.length);
  });

  it('sends every column of a list as one parallel array', async () => {
    const { client, queries } = recordingClient();
    await writeConfig(client, 'page-1', withLists(12));

    const faqInsert = queries.find((query) =>
      query.text.includes('INSERT INTO advertising_faqs'),
    );
    expect(faqInsert).toBeDefined();
    // $1 is the page id; the rest are the parallel arrays unnest zips together,
    // so a length mismatch would silently pad a column with NULL.
    const arrays = faqInsert!.values.slice(1) as unknown[][];
    expect(arrays.length).toBeGreaterThan(1);
    for (const column of arrays) {
      expect(Array.isArray(column)).toBe(true);
      expect(column).toHaveLength(12);
    }
  });

  it('keeps array order as the stored position', async () => {
    const { client, queries } = recordingClient();
    await writeConfig(client, 'page-1', withLists(3));

    const faqInsert = queries.find((query) =>
      query.text.includes('INSERT INTO advertising_faqs'),
    )!;
    expect(faqInsert.values[1]).toEqual(['faq-0', 'faq-1', 'faq-2']);
    expect(faqInsert.values[4]).toEqual([0, 1, 2]);
  });

  it('deletes tiers by category and key together, not by key alone', async () => {
    const { client, queries } = recordingClient();
    await writeConfig(client, 'page-1', withLists(2));

    const tierDelete = queries.find(
      (query) =>
        query.text.includes('DELETE FROM advertising_package_tiers') ||
        query.text.includes('DELETE FROM advertising_package_tiers tier'),
    );
    expect(tierDelete).toBeDefined();
    // Tier keys are only unique within their category, so a delete keyed on the
    // tier key alone would spare a row belonging to a different category.
    expect(tierDelete!.text).toContain('category_id');
    expect(tierDelete!.text).toContain('tier_key');
  });

  it('registers no public_page_actions rows', async () => {
    const { client, queries } = recordingClient();
    await writeConfig(client, 'page-1', withLists(5));

    // The advertising page is not one of the two surfaces allowed to report to
    // TikTok, and nothing on it calls the page tracker, so an action row here
    // would report a permanent zero forever. See docs/tracking.md.
    expect(
      queries.some((query) => query.text.includes('public_page_actions')),
    ).toBe(false);
  });
});
