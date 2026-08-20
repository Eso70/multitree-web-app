import { PlatformLinktreesService } from './platform-linktrees.service';
import { LinktreesService } from '../linktrees/linktrees.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';
import { RedisService } from '../redis/redis.service';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';

describe('PlatformLinktreesService', () => {
  const workspaceId = '00000000-0000-4000-8000-000000000001';
  const branding = {
    name: 'MultiTree',
    logo: '/logo.png',
    avatar: '/avatar.png',
    favicon: '/favicon.ico',
    accentColor: '#b6f20d',
  };
  const linktrees = {
    getAllLinktrees: jest.fn(),
    createLinktree: jest.fn(),
    getLinktreeById: jest.fn(),
    updateLinktree: jest.fn(),
    syncSubmittedLinks: jest.fn(),
    deleteLinktree: jest.fn(),
  } as unknown as LinktreesService;
  const workspace = {
    getWorkspaceId: jest.fn().mockResolvedValue(workspaceId),
    getBranding: jest.fn().mockResolvedValue(branding),
  } as unknown as PlatformContentWorkspaceService;
  const redis = {
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as RedisService;
  const analytics = {
    getSummary: jest.fn(),
    clear: jest.fn(),
  } as unknown as UnifiedAnalyticsService;
  const service = new PlatformLinktreesService(
    linktrees,
    workspace,
    redis,
    analytics,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not expose the internal owner id in dashboard context', async () => {
    await expect(service.getContext()).resolves.toEqual({
      branding,
      publicPathPrefix: '/linktree',
    });
  });

  it('creates through the shared Linktree service with platform policy', async () => {
    const input = { name: 'Campaign', slug: 'campaign' } as CreateLinktreeDto;
    (linktrees.createLinktree as jest.Mock).mockResolvedValue({
      uid: 'random-id',
      seo_name: 'campaign',
    });

    await service.create(input);

    expect(linktrees.createLinktree).toHaveBeenCalledWith(
      { ...input, is_default: false },
      workspaceId,
      'platform',
    );
    expect(redis.del).toHaveBeenCalledWith('cache:platform-linktree:campaign');
  });

  it('keeps metadata and links scoped to the platform workspace on update', async () => {
    const input = {
      name: 'Campaign',
      slug: 'new-campaign',
      links: { website: ['https://example.com'] },
    } as CreateLinktreeDto;
    (linktrees.getLinktreeById as jest.Mock).mockResolvedValue({
      uid: 'old-id',
      seo_name: 'old-campaign',
    });
    (linktrees.updateLinktree as jest.Mock).mockResolvedValue({
      uid: 'old-id',
      seo_name: 'new-campaign',
    });

    await service.update('page-id', input);

    expect(linktrees.updateLinktree).toHaveBeenCalledWith(
      'page-id',
      expect.objectContaining({ seo_name: 'new-campaign' }),
      workspaceId,
      'platform',
    );
    expect(linktrees.syncSubmittedLinks).toHaveBeenCalledWith(
      'page-id',
      input,
      workspaceId,
    );
  });

  it('reads analytics only after verifying platform workspace ownership', async () => {
    (linktrees.getLinktreeById as jest.Mock).mockResolvedValue({
      id: 'page-id',
    });
    (analytics.getSummary as jest.Mock).mockResolvedValue({ total_views: 12 });

    await expect(service.getAnalytics('page-id')).resolves.toEqual({
      total_views: 12,
    });

    expect(linktrees.getLinktreeById).toHaveBeenCalledWith(
      'page-id',
      workspaceId,
    );
    expect(analytics.getSummary).toHaveBeenCalledWith(workspaceId, {
      pageId: 'page-id',
      pageType: 'linktree',
    });
  });

  it('clears analytics only after verifying platform workspace ownership', async () => {
    (linktrees.getLinktreeById as jest.Mock).mockResolvedValue({
      id: 'page-id',
    });

    await service.clearAnalytics('page-id');

    expect(linktrees.getLinktreeById).toHaveBeenCalledWith(
      'page-id',
      workspaceId,
    );
    expect(analytics.clear).toHaveBeenCalledWith(workspaceId, 'page-id');
  });

  it('clears analytics for every platform Linktree without touching other platform pages', async () => {
    (linktrees.getAllLinktrees as jest.Mock).mockResolvedValue([
      { id: 'page-1' },
      { id: 'page-2' },
    ]);

    await service.clearAllAnalytics();

    expect(linktrees.getAllLinktrees).toHaveBeenCalledWith(workspaceId);
    expect(analytics.clear).toHaveBeenNthCalledWith(1, workspaceId, 'page-1');
    expect(analytics.clear).toHaveBeenNthCalledWith(2, workspaceId, 'page-2');
  });
});
