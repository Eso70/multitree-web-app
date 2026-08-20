import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import { MiniWebsitesService } from '../mini-websites/mini-websites.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';
import { PlatformMiniWebsitesService } from './platform-mini-websites.service';

describe('PlatformMiniWebsitesService', () => {
  const ownerId = '00000000-0000-4000-8000-000000000001';
  const miniWebsites = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    isSlugAvailable: jest.fn(),
  } as unknown as MiniWebsitesService;
  const workspace = {
    getWorkspaceId: jest.fn().mockResolvedValue(ownerId),
    getBranding: jest.fn(),
  } as unknown as PlatformContentWorkspaceService;
  const analytics = {
    getSummary: jest.fn(),
    clear: jest.fn(),
  } as unknown as UnifiedAnalyticsService;
  const service = new PlatformMiniWebsitesService(
    miniWebsites,
    workspace,
    analytics,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates through the shared service with platform policy', async () => {
    const input = { name: 'Campaign', slug: 'campaign' };
    await service.create(input);
    expect(miniWebsites.create).toHaveBeenCalledWith(
      input,
      ownerId,
      'platform',
    );
  });

  it('keeps reads scoped to the internal platform owner', async () => {
    await service.get('page-id');
    expect(miniWebsites.get).toHaveBeenCalledWith('page-id', ownerId);
  });

  it('clears all and only platform mini-website analytics', async () => {
    (miniWebsites.list as jest.Mock).mockResolvedValue([
      { id: 'page-1' },
      { id: 'page-2' },
    ]);
    await service.clearAllAnalytics();
    expect(analytics.clear).toHaveBeenNthCalledWith(1, ownerId, 'page-1');
    expect(analytics.clear).toHaveBeenNthCalledWith(2, ownerId, 'page-2');
  });
});
