import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import { AnalyticsReadService } from '../analytics/analytics-read.service';
import { TikTokPixelConfigService } from '../auth/tiktok-pixel-config.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { LinktreesService } from '../linktrees/linktrees.service';
import { MiniWebsitesService } from '../mini-websites/mini-websites.service';
import { CreatorAccountService } from './creator-account.service';
import { CreatorContentService } from './creator-content.service';

describe('CreatorContentService', () => {
  const database = { query: jest.fn() } as unknown as DatabaseService;
  const redis = { del: jest.fn() } as unknown as RedisService;
  const analyticsReads = {
    getActions: jest.fn(),
    getTikTokDeliveryErrors: jest.fn(),
  } as unknown as AnalyticsReadService;
  const tiktokPixels = {
    list: jest.fn(),
    replace: jest.fn(),
  } as unknown as TikTokPixelConfigService;
  const service = new CreatorContentService(
    database,
    {} as CreatorAccountService,
    {} as LinktreesService,
    {} as MiniWebsitesService,
    {} as UnifiedAnalyticsService,
    analyticsReads,
    tiktokPixels,
    redis,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects page deletion for Creator sessions', () => {
    expect(() => service.denyPageDeletion()).toThrow(ForbiddenException);
  });

  it('reads Creator TikTok groups through the shared encrypted config service', async () => {
    (tiktokPixels.list as jest.Mock).mockResolvedValue([
      { pixel_id: 'PIXEL1' },
    ]);

    await expect(service.getTikTokSettings('business-id')).resolves.toEqual({
      tiktok_configs: [{ pixel_id: 'PIXEL1' }],
      max_groups: 1,
    });
    expect(tiktokPixels.list).toHaveBeenCalledWith('business-id');
  });

  it('requires writable Creator access before replacing TikTok groups', async () => {
    (database.query as jest.Mock).mockResolvedValue({
      rows: [{ can_write: false }],
    });

    await expect(
      service.updateTikTokSettings('business-id', []),
    ).rejects.toThrow(ForbiddenException);
    expect(tiktokPixels.replace).not.toHaveBeenCalled();
  });

  it('replaces TikTok groups only for the authenticated writable workspace', async () => {
    const configs = [{ pixel_id: 'PIXEL123' }];
    (database.query as jest.Mock).mockResolvedValue({
      rows: [{ can_write: true }],
    });
    (tiktokPixels.replace as jest.Mock).mockResolvedValue(configs);

    await expect(
      service.updateTikTokSettings('business-id', configs),
    ).resolves.toEqual({ tiktok_configs: configs, max_groups: 1 });
    expect(tiktokPixels.replace).toHaveBeenCalledWith('business-id', configs, {
      maxGroups: 1,
    });
  });

  it('refuses action rows for a page the Creator workspace does not own', async () => {
    (database.query as jest.Mock).mockResolvedValue({
      rows: [{ found: false }],
    });

    await expect(
      service.pageActions('business-id', 'linktree', 'other-page-id'),
    ).rejects.toThrow(NotFoundException);
    expect(analyticsReads.getActions).not.toHaveBeenCalled();
  });

  it('reads owned action rows scoped to the Creator workspace', async () => {
    (database.query as jest.Mock).mockResolvedValue({
      rows: [{ found: true }],
    });
    (analyticsReads.getActions as jest.Mock).mockResolvedValue([
      { id: 'action-id' },
    ]);

    await expect(
      service.pageActions('business-id', 'mini_website', 'page-id'),
    ).resolves.toEqual([{ id: 'action-id' }]);
    expect(analyticsReads.getActions).toHaveBeenCalledWith('business-id', {
      pageId: 'page-id',
    });
  });

  /**
   * The shared delivery panel reads `.items` off this response. Wrapping the
   * read service's `{ items: [...] }` a second time handed that panel an object
   * where it expected an array, and the Settings tab died on `errors.map`.
   */
  it('returns TikTok delivery errors in the shape the shared panel reads', async () => {
    const items = [{ pixelId: 'PIXEL1', severity: 'permanent' }];
    (analyticsReads.getTikTokDeliveryErrors as jest.Mock).mockResolvedValue({
      items,
    });

    await expect(service.getTikTokErrors('business-id')).resolves.toEqual({
      items,
    });
    expect(analyticsReads.getTikTokDeliveryErrors).toHaveBeenCalledWith(
      'business-id',
      20,
    );
  });

  /**
   * A Creator page is served from the root-domain key space, which the ordinary
   * Linktree write never purges — it clears the business-subdomain keys. Without
   * this the public page kept serving its old body for the full two-hour cache
   * lifetime after every edit.
   */
  it('purges the root-domain public cache after a Creator edits its page', async () => {
    const del = jest.fn().mockResolvedValue(undefined);
    const linktrees = {
      updateLinktree: jest
        .fn()
        .mockResolvedValue({ uid: 'page-uid', seo_name: 'my-page' }),
      syncSubmittedLinks: jest.fn().mockResolvedValue(undefined),
    } as unknown as LinktreesService;
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ can_write: true }] })
        .mockResolvedValueOnce({ rows: [{ found: true }] }),
    } as unknown as DatabaseService;
    const scoped = new CreatorContentService(
      database,
      {} as CreatorAccountService,
      linktrees,
      {} as MiniWebsitesService,
      {} as UnifiedAnalyticsService,
      {} as AnalyticsReadService,
      {} as TikTokPixelConfigService,
      { del } as unknown as RedisService,
    );

    await scoped.updateLinktree(
      'page-id',
      { name: 'Page', slug: 'my-page' },
      'business-id',
    );

    expect(del).toHaveBeenCalledWith('cache:platform-linktree:page-uid');
    expect(del).toHaveBeenCalledWith('cache:platform-linktree:my-page');
  });

  it('does not fail the save when the cache purge cannot run', async () => {
    const linktrees = {
      updateLinktree: jest.fn().mockResolvedValue({ uid: 'page-uid' }),
      syncSubmittedLinks: jest.fn().mockResolvedValue(undefined),
    } as unknown as LinktreesService;
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ can_write: true }] })
        .mockResolvedValueOnce({ rows: [{ found: true }] }),
    } as unknown as DatabaseService;
    const scoped = new CreatorContentService(
      database,
      {} as CreatorAccountService,
      linktrees,
      {} as MiniWebsitesService,
      {} as UnifiedAnalyticsService,
      {} as AnalyticsReadService,
      {} as TikTokPixelConfigService,
      {
        del: jest.fn().mockRejectedValue(new Error('redis unavailable')),
      } as unknown as RedisService,
    );

    await expect(
      scoped.updateLinktree(
        'page-id',
        { name: 'Page', slug: 'my-page' },
        'business-id',
      ),
    ).resolves.toEqual({ uid: 'page-uid' });
  });
});
