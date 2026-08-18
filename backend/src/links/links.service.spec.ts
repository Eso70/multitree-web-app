import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { LinksService } from './links.service';

const LINKTREE_ID = '17fdf0e8-d6b4-449a-b3cf-c760160c3f21';
const BUSINESS_ID = '373f02f3-0b8b-4e93-ad0b-5f16a640daf4';
const WHATSAPP_ID = '8f1f0b6e-2a1c-4f52-9c2e-0f2b3c4d5e6f';
const TELEGRAM_ID = '9a2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d';

interface Call {
  sql: string;
  params: unknown[];
}

/**
 * Builds a service whose transaction client answers the existing-links lookup
 * with `existing` and records every statement it is given.
 */
function buildService(
  existing: Array<{ id: string; platform: string; url: string }>,
) {
  const calls: Call[] = [];
  const clientQuery = jest.fn((sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.includes('SELECT id, platform, url FROM links')) {
      return Promise.resolve({ rows: existing });
    }
    return Promise.resolve({ rows: [] });
  });
  const database = {
    query: jest.fn().mockResolvedValue({
      rows: [{ uid: 'page-uid', seo_name: null, subdomain: 'shop' }],
    }),
    transaction: jest.fn((callback: (client: unknown) => unknown) =>
      callback({ query: clientQuery }),
    ),
  } as unknown as DatabaseService;
  const redis = {
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as RedisService;
  return { service: new LinksService(database, redis), calls };
}

const find = (calls: Call[], fragment: string) =>
  calls.filter((call) => call.sql.includes(fragment));

describe('LinksService.syncLinks', () => {
  /**
   * The regression this exists for.
   *
   * Deleting and re-inserting every link handed each surviving button a new
   * uuid, which orphaned the `public_page_actions` row its clicks were
   * recorded against. The breakdown hides archived actions, so a page lost
   * every click it had ever recorded the first time its owner edited it —
   * while views, which hang off the stable `public_pages` row, kept counting.
   */
  it('updates an unchanged link in place so its recorded clicks survive', async () => {
    const { service, calls } = buildService([
      {
        id: WHATSAPP_ID,
        platform: 'whatsapp',
        url: 'https://wa.me/9647500000000',
      },
    ]);

    await service.syncLinks(
      LINKTREE_ID,
      [
        {
          platform: 'whatsapp',
          url: 'https://wa.me/9647500000000',
          display_name: 'Renamed but same destination',
        },
      ],
      BUSINESS_ID,
    );

    const updates = find(calls, 'UPDATE links SET');
    expect(updates).toHaveLength(1);
    expect(updates[0].params).toContain(WHATSAPP_ID);

    expect(find(calls, 'INSERT INTO links')).toHaveLength(0);
    expect(find(calls, 'DELETE FROM links')).toHaveLength(0);
    expect(find(calls, "status = 'archived'")).toHaveLength(0);
  });

  it('matches on destination, so trailing whitespace and case do not orphan a link', async () => {
    const { service, calls } = buildService([
      { id: WHATSAPP_ID, platform: 'whatsapp', url: 'https://wa.me/964750' },
    ]);

    await service.syncLinks(
      LINKTREE_ID,
      [{ platform: 'WhatsApp', url: '  https://wa.me/964750  ' }],
      BUSINESS_ID,
    );

    expect(find(calls, 'UPDATE links SET')).toHaveLength(1);
    expect(find(calls, 'INSERT INTO links')).toHaveLength(0);
  });

  it('archives and deletes only the links the save removed', async () => {
    const { service, calls } = buildService([
      {
        id: WHATSAPP_ID,
        platform: 'whatsapp',
        url: 'https://wa.me/9647500000000',
      },
      { id: TELEGRAM_ID, platform: 'telegram', url: 'https://t.me/example' },
    ]);

    await service.syncLinks(
      LINKTREE_ID,
      [{ platform: 'whatsapp', url: 'https://wa.me/9647500000000' }],
      BUSINESS_ID,
    );

    const archived = find(calls, "status = 'archived'");
    expect(archived).toHaveLength(1);
    expect(archived[0].params[0]).toEqual([TELEGRAM_ID]);

    const deletes = find(calls, 'DELETE FROM links');
    expect(deletes).toHaveLength(1);
    expect(deletes[0].params[0]).toEqual([TELEGRAM_ID]);

    // The surviving link keeps its row rather than being swept up with it.
    expect(find(calls, 'UPDATE links SET')).toHaveLength(1);
  });

  it('inserts a genuinely new link and leaves the existing ones alone', async () => {
    const { service, calls } = buildService([
      {
        id: WHATSAPP_ID,
        platform: 'whatsapp',
        url: 'https://wa.me/9647500000000',
      },
    ]);

    await service.syncLinks(
      LINKTREE_ID,
      [
        { platform: 'whatsapp', url: 'https://wa.me/9647500000000' },
        { platform: 'telegram', url: 'https://t.me/example' },
      ],
      BUSINESS_ID,
    );

    expect(find(calls, 'UPDATE links SET')).toHaveLength(1);
    expect(find(calls, 'DELETE FROM links')).toHaveLength(0);

    // The insert binds its columns out of order so it can share one parameter
    // array with the update; assert the values land where the SQL says.
    const inserts = find(calls, 'INSERT INTO links');
    expect(inserts).toHaveLength(1);
    const params = inserts[0].params;
    expect(params[10]).toBe(LINKTREE_ID); // $11 linktree_id
    expect(params[11]).toBe(BUSINESS_ID); // $12 business_id
    expect(params[12]).toBe('telegram'); // $13 platform
    expect(params[13]).toBe('https://t.me/example'); // $14 url
    expect(params[3]).toBe(1); // $4 display_order, from array position
  });

  it('pairs duplicate destinations one-for-one instead of collapsing them', async () => {
    const { service, calls } = buildService([
      { id: WHATSAPP_ID, platform: 'whatsapp', url: 'https://wa.me/1' },
      { id: TELEGRAM_ID, platform: 'whatsapp', url: 'https://wa.me/1' },
    ]);

    await service.syncLinks(
      LINKTREE_ID,
      [
        { platform: 'whatsapp', url: 'https://wa.me/1' },
        { platform: 'whatsapp', url: 'https://wa.me/1' },
      ],
      BUSINESS_ID,
    );

    const updates = find(calls, 'UPDATE links SET');
    expect(updates).toHaveLength(2);
    expect(updates.map((call) => call.params[call.params.length - 1])).toEqual([
      WHATSAPP_ID,
      TELEGRAM_ID,
    ]);
    expect(find(calls, 'DELETE FROM links')).toHaveLength(0);
  });

  it('rewrites display_order from array position on every save', async () => {
    const { service, calls } = buildService([
      { id: WHATSAPP_ID, platform: 'whatsapp', url: 'https://wa.me/1' },
      { id: TELEGRAM_ID, platform: 'telegram', url: 'https://t.me/example' },
    ]);

    // Submitted in the opposite order to the stored one.
    await service.syncLinks(
      LINKTREE_ID,
      [
        { platform: 'telegram', url: 'https://t.me/example' },
        { platform: 'whatsapp', url: 'https://wa.me/1' },
      ],
      BUSINESS_ID,
    );

    const updates = find(calls, 'UPDATE links SET');
    expect(updates).toHaveLength(2);
    // display_order is the fourth bound parameter.
    expect(updates[0].params[3]).toBe(0);
    expect(updates[0].params[updates[0].params.length - 1]).toBe(TELEGRAM_ID);
    expect(updates[1].params[3]).toBe(1);
    expect(updates[1].params[updates[1].params.length - 1]).toBe(WHATSAPP_ID);
  });
});
