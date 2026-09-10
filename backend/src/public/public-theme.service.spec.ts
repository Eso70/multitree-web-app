import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { PublicService } from './public.service';
import { PublicPageAnalyticsService } from '../analytics/public-page-analytics.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';

describe('PublicService platform theme', () => {
  it('caches the configured platform accent', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [{ accent_color: '#123456' }],
      }),
    } as unknown as DatabaseService;
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const service = new PublicService(
      database,
      redis,
      {
        forSource: jest.fn(),
        forPublicPage: jest.fn(),
      } as unknown as PublicPageAnalyticsService,
      {
        getBranding: jest.fn(),
      } as unknown as PlatformContentWorkspaceService,
    );

    await expect(service.getPlatformTheme()).resolves.toEqual({
      accent_color: '#123456',
    });
    expect(redis.set).toHaveBeenCalledWith(
      'cache:public:platform-theme',
      { accent_color: '#123456' },
      300,
    );
  });

  it('uses the configured accent already held in Redis', async () => {
    const database = {
      query: jest.fn(),
    } as unknown as DatabaseService;
    const redis = {
      get: jest.fn().mockResolvedValue({ accent_color: '#123456' }),
      set: jest.fn(),
    } as unknown as RedisService;
    const service = new PublicService(
      database,
      redis,
      {
        forSource: jest.fn(),
        forPublicPage: jest.fn(),
      } as unknown as PublicPageAnalyticsService,
      {
        getBranding: jest.fn(),
      } as unknown as PlatformContentWorkspaceService,
    );

    await expect(service.getPlatformTheme()).resolves.toEqual({
      accent_color: '#123456',
    });
    expect(database.query).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });
});
