import { LinktreesService } from './linktrees.service';

describe('LinktreesService duplication algorithms', () => {
  let service: LinktreesService;

  beforeEach(() => {
    // Provide minimal mock dependencies to construct LinktreesService
    service = new LinktreesService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('generateDuplicateSlug', () => {
    it('generates [slug]-copy for a simple slug if available', async () => {
      service.isSlugAvailable = jest.fn().mockResolvedValue(true);
      service.isRootSlugAvailable = jest.fn().mockResolvedValue(true);

      const slug = await service.generateDuplicateSlug('biz-1', 'my-page');
      expect(slug).toBe('my-page-copy');
    });

    it('generates [slug]-copy-2 when duplicating a [slug]-copy page', async () => {
      service.isSlugAvailable = jest.fn().mockResolvedValue(true);
      service.isRootSlugAvailable = jest.fn().mockResolvedValue(true);

      const slug = await service.generateDuplicateSlug('biz-1', 'my-page-copy');
      expect(slug).toBe('my-page-copy-2');
    });

    it('increments numbered copy [slug]-copy-N correctly (e.g. -copy-2 -> -copy-3)', async () => {
      service.isSlugAvailable = jest.fn().mockResolvedValue(true);
      service.isRootSlugAvailable = jest.fn().mockResolvedValue(true);

      const slug = await service.generateDuplicateSlug('biz-1', 'promo-copy-2');
      expect(slug).toBe('promo-copy-3');
    });

    it('increments numbered slug [slug]-N correctly (e.g. -2 -> -3)', async () => {
      service.isSlugAvailable = jest.fn().mockResolvedValue(true);
      service.isRootSlugAvailable = jest.fn().mockResolvedValue(true);

      const slug = await service.generateDuplicateSlug('biz-1', 'store-2');
      expect(slug).toBe('store-3');
    });

    it('skips taken candidates until finding an available one', async () => {
      // Simulate my-page-copy and my-page-copy-2 taken, my-page-copy-3 free
      service.isSlugAvailable = jest.fn().mockImplementation((_bizId, candidate) => {
        if (candidate === 'my-page-copy' || candidate === 'my-page-copy-2') {
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });
      service.isRootSlugAvailable = jest.fn().mockResolvedValue(true);

      const slug = await service.generateDuplicateSlug('biz-1', 'my-page');
      expect(slug).toBe('my-page-copy-3');
    });
  });

  describe('generateDuplicateName', () => {
    it('appends (کۆپی) to base name', async () => {
      service.isNameAvailable = jest.fn().mockResolvedValue(true);

      const name = await service.generateDuplicateName('biz-1', 'فرۆشگای سەرەکی');
      expect(name).toBe('فرۆشگای سەرەکی (کۆپی)');
    });

    it('increments already copied name to (کۆپی 2)', async () => {
      service.isNameAvailable = jest.fn().mockResolvedValue(true);

      const name = await service.generateDuplicateName('biz-1', 'فرۆشگای سەرەکی (کۆپی)');
      expect(name).toBe('فرۆشگای سەرەکی (کۆپی 2)');
    });

    it('increments (کۆپی 2) to (کۆپی 3)', async () => {
      service.isNameAvailable = jest.fn().mockResolvedValue(true);

      const name = await service.generateDuplicateName('biz-1', 'فرۆشگای سەرەکی (کۆپی 2)');
      expect(name).toBe('فرۆشگای سەرەکی (کۆپی 3)');
    });
  });

  describe('duplicateLinktree limitations', () => {
    let mockDb: any;
    let mockEntitlements: any;
    let mockWebhooks: any;
    let mockStorage: any;
    let mockRedis: any;

    beforeEach(() => {
      mockDb = {
        query: jest.fn(),
        transaction: jest.fn(),
      };
      mockEntitlements = {
        getInteger: jest.fn().mockResolvedValue(-1),
      };
      mockWebhooks = {
        emitWithClient: jest.fn().mockResolvedValue(undefined),
      };
      mockStorage = {
        claimBusinessAssets: jest.fn().mockResolvedValue(undefined),
      };
      mockRedis = {
        del: jest.fn().mockResolvedValue(undefined),
      };

      service = new LinktreesService(
        mockDb,
        mockRedis,
        mockEntitlements,
        {} as any,
        mockWebhooks,
        mockStorage,
        {} as any,
        {} as any,
      );
    });

    it('rejects duplicating a page that has reached max nesting depth (depth >= 3)', async () => {
      // Source page at depth 3
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'lt-3',
            name: 'Page 3',
            seo_name: 'page-3',
            template_config: {
              _copy_lineage: {
                depth: 3,
                source_id: 'lt-2',
                origin_id: 'lt-original',
              },
            },
          },
        ],
      });

      await expect(
        service.duplicateLinktree('lt-3', 'biz-1', undefined, 'business'),
      ).rejects.toThrow('ئاستی لەبەرگرتنەوە');
    });

    it('rejects duplicating when source page already has 5 direct copies', async () => {
      // Source page at depth 0
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'lt-orig',
              name: 'Original Page',
              seo_name: 'orig-page',
              template_config: {},
            },
          ],
        })
        // Direct copies query returns count 5
        .mockResolvedValueOnce({
          rows: [{ count: '5' }],
        });

      await expect(
        service.duplicateLinktree('lt-orig', 'biz-1', undefined, 'business'),
      ).rejects.toThrow('ئەم پەڕەیە گەیشتووەتە ئەوپەڕی ژمارەی ڕێگەپێدراوی کۆپیکردنی ڕاستەوخۆ');
    });

    it('allows duplicating when depth < 3 and direct copies < 5', async () => {
      // Source page at depth 1 with 2 direct copies
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'lt-1',
              name: 'Copy 1',
              seo_name: 'copy-1',
              template_config: {
                _copy_lineage: {
                  depth: 1,
                  source_id: 'lt-orig',
                  origin_id: 'lt-orig',
                },
              },
            },
          ],
        })
        // Direct copies query returns count 2
        .mockResolvedValueOnce({
          rows: [{ count: '2' }],
        })
        // Links query
        .mockResolvedValueOnce({ rows: [] })
        // Whatsapp questions query
        .mockResolvedValueOnce({ rows: [] })
        // UID check
        .mockResolvedValueOnce({ rows: [] })
        // mapLinktreeRow questions query
        .mockResolvedValueOnce({ rows: [] });

      service.generateDuplicateSlug = jest.fn().mockResolvedValue('copy-1-copy');
      mockDb.transaction.mockImplementation(async (cb: any) => {
        const client = {
          query: jest.fn().mockResolvedValue({
            rows: [
              {
                id: 'lt-new',
                name: 'Copy 1',
                seo_name: 'copy-1-copy',
              },
            ],
          }),
        };
        return cb(client);
      });

      const result = await service.duplicateLinktree('lt-1', 'biz-1', undefined, 'business');
      expect(result.id).toBe('lt-new');
    });
  });
});
