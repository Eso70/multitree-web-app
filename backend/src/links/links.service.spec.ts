import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { LinksService } from './links.service';

describe('LinksService', () => {
  it('archives existing analytics actions before replacing Linktree links', async () => {
    const statements: string[] = [];
    const clientQuery = jest.fn((sql: string) => {
      statements.push(sql);
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
    const service = new LinksService(database, redis);

    await service.syncLinks(
      '17fdf0e8-d6b4-449a-b3cf-c760160c3f21',
      [
        {
          platform: 'whatsapp',
          url: 'https://wa.me/9647500000000',
          display_name: 'WhatsApp',
        },
        {
          platform: 'telegram',
          url: 'https://t.me/example',
          display_name: 'Telegram',
        },
      ],
      '373f02f3-0b8b-4e93-ad0b-5f16a640daf4',
    );

    expect(statements[0]).toContain("status = 'archived'");
    expect(statements[1]).toContain('DELETE FROM links WHERE linktree_id = $1');
    expect(statements[2]).toContain('INSERT INTO links');
    expect(statements[3]).toContain('INSERT INTO links');
  });
});
