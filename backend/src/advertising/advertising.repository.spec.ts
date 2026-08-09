import type { PoolClient } from 'pg';
import { createDefaultAdvertisingConfig } from './advertising.defaults';
import { AdvertisingRepository } from './advertising.repository';

/**
 * The publish/unpublish lifecycle, at the SQL boundary.
 *
 * Both behaviours here are things a value-level test of the projection cannot
 * see: whether the two rows that answer "is this live?" are changed together,
 * and whether a save and its publish share a transaction.
 */

interface RecordedQuery {
  text: string;
  values: unknown[];
}

function repositoryWithRecorder() {
  const queries: RecordedQuery[] = [];
  let transactions = 0;

  const client = {
    query: (text: string, values: unknown[] = []) => {
      queries.push({ text, values });
      if (text.includes('UPDATE advertising_pages')) {
        return Promise.resolve({ rows: [{ current_version: 4 }] });
      }
      if (text.includes('INSERT INTO advertising_package_categories')) {
        const keys = (values[1] ?? []) as string[];
        return Promise.resolve({
          rows: keys.map((key) => ({ id: `id-${key}`, category_key: key })),
        });
      }
      return Promise.resolve({ rows: [] });
    },
  } as unknown as PoolClient;

  const database = {
    query: (text: string, values: unknown[] = []) => {
      queries.push({ text, values });
      return Promise.resolve({ rows: [] });
    },
    transaction: async <T>(callback: (client: PoolClient) => Promise<T>) => {
      transactions += 1;
      return callback(client);
    },
  };

  return {
    repository: new AdvertisingRepository(
      database as unknown as ConstructorParameters<
        typeof AdvertisingRepository
      >[0],
    ),
    queries,
    transactionCount: () => transactions,
  };
}

describe('AdvertisingRepository publish lifecycle', () => {
  it('clears the live version flag when the page is taken down', async () => {
    const { repository, queries } = repositoryWithRecorder();

    await repository.unpublish('page-1');

    const pausesPage = queries.some(
      (query) =>
        query.text.includes('UPDATE advertising_pages') &&
        query.text.includes("'paused'"),
    );
    // `status` and `published` answer the same question. Leaving the flag set
    // made the editor report a live version number and no unpublished changes
    // for a page no visitor could reach.
    const clearsVersion = queries.some(
      (query) =>
        query.text.includes('UPDATE advertising_page_versions') &&
        query.text.includes('published = false'),
    );
    expect(pausesPage).toBe(true);
    expect(clearsVersion).toBe(true);
  });

  it('takes the page down inside one transaction', async () => {
    const { repository, transactionCount } = repositoryWithRecorder();

    await repository.unpublish('page-1');

    expect(transactionCount()).toBe(1);
  });

  it('writes the content and promotes it in a single transaction', async () => {
    const { repository, queries, transactionCount } = repositoryWithRecorder();

    await repository.saveAndPublish(
      'page-1',
      createDefaultAdvertisingConfig('9647500000000'),
    );

    // Saving is publishing on this page. As two transactions, a failed publish
    // left the draft written and visitors on the previous content.
    expect(transactionCount()).toBe(1);
    expect(
      queries.some((query) =>
        query.text.includes('INSERT INTO advertising_faqs'),
      ),
    ).toBe(true);
    expect(
      queries.some((query) =>
        query.text.includes('INSERT INTO advertising_page_versions'),
      ),
    ).toBe(true);
  });

  it('leaves exactly one version marked published', async () => {
    const { repository, queries } = repositoryWithRecorder();

    await repository.publish(
      'page-1',
      createDefaultAdvertisingConfig('9647500000000'),
    );

    const demotesOthers = queries.find(
      (query) =>
        query.text.includes('UPDATE advertising_page_versions') &&
        query.text.includes('version <> $2'),
    );
    expect(demotesOthers).toBeDefined();
    expect(demotesOthers!.values).toEqual(['page-1', 4]);
  });
});
