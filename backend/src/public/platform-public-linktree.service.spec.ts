import { PublicService } from './public.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { PublicPageAnalyticsService } from '../analytics/public-page-analytics.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';

describe('PublicService platform Linktree', () => {
  it('resolves only the platform workspace and preserves its resolved pixels', async () => {
    const row = {
      id: 'page-id',
      name: 'Campaign',
      subtitle: null,
      description: null,
      seo_name: 'campaign',
      uid: 'random-id',
      image: null,
      background_color: '#ffffff',
      template_key: 'spectrum',
      template_config: {},
      whatsapp_modal_enabled: false,
      footer_text: 'MultiTree',
      footer_phone: null,
      footer_hidden: false,
      status: 'active',
      is_default: false,
      business_logo: null,
      business_favicon: null,
      business_website_color: null,
      business_default_avatar: null,
    };
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [{ account_type: 'platform', linktree_id: 'page-id' }],
        })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ widget_config: {} }] })
        .mockResolvedValueOnce({ rows: [] }),
    } as unknown as DatabaseService;
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const analytics = {
      forSource: jest.fn().mockResolvedValue({
        pixelIds: ['PLATFORM_PIXEL'],
        actions: {},
      }),
    } as unknown as PublicPageAnalyticsService;
    const workspace = {
      getBranding: jest.fn().mockResolvedValue({
        name: 'MultiTree',
        logo: '/logo.png',
        avatar: '/avatar.png',
        favicon: '/favicon.ico',
        accentColor: '#b6f20d',
      }),
    } as unknown as PlatformContentWorkspaceService;
    const service = new PublicService(database, redis, analytics, workspace);

    const result = await service.getPlatformPublicLinktree('campaign');

    expect(database.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("root_slug.page_type = 'linktree'"),
      ['campaign'],
    );
    expect(database.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("a.account_type IN ('platform', 'creator')"),
      ['campaign'],
    );
    expect(result.analytics.pixelIds).toEqual(['PLATFORM_PIXEL']);
    expect(result.linktree.business_logo).toBe('/logo.png');
    expect(redis.set).toHaveBeenCalledWith(
      'cache:platform-linktree:campaign',
      expect.any(Object),
      7200,
    );
  });

  it('re-resolves platform pixels for cached platform content', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue({
        linktree: { id: 'page-id' },
        links: [],
      }),
    } as unknown as RedisService;
    const analytics = {
      forSource: jest
        .fn()
        .mockResolvedValue({ pixelIds: ['PIXEL'], actions: {} }),
    } as unknown as PublicPageAnalyticsService;
    const service = new PublicService(
      {
        query: jest.fn().mockResolvedValue({
          rows: [{ account_type: 'platform', linktree_id: 'page-id' }],
        }),
      } as unknown as DatabaseService,
      redis,
      analytics,
      { getBranding: jest.fn() } as unknown as PlatformContentWorkspaceService,
    );

    const result = await service.getPlatformPublicLinktree('campaign');
    expect(result.analytics.pixelIds).toEqual(['PIXEL']);
  });
});
