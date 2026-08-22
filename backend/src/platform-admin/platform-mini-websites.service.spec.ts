import { ConflictException } from '@nestjs/common';
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

  /**
   * A root slug is shared with every Creator, so the console's availability
   * check can go stale between the answer and the save. The database primary
   * key is the arbiter, and a lost race is a conflict, not a server error.
   */
  it.each([
    ['create', () => service.create({ name: 'Campaign', slug: 'taken' })],
    ['update', () => service.update('page-id', { name: 'C', slug: 'taken' })],
  ])(
    'reports a lost root-slug race on %s as a conflict',
    async (method, call) => {
      (
        miniWebsites[method as 'create' | 'update'] as jest.Mock
      ).mockRejectedValue({
        code: '23505',
        constraint: 'root_public_slugs_pkey',
      });

      await expect(call()).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('does not disguise an unrelated failure as a slug conflict', async () => {
    const failure = new Error('connection terminated');
    (miniWebsites.create as jest.Mock).mockRejectedValue(failure);

    await expect(service.create({ name: 'Campaign' })).rejects.toBe(failure);
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
