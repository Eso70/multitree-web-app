import { ConflictException } from '@nestjs/common';
import { PlatformLinktreesService } from './platform-linktrees.service';
import { LinktreesService } from '../linktrees/linktrees.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';
import { RedisService } from '../redis/redis.service';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import { AnalyticsReadService } from '../analytics/analytics-read.service';

describe('PlatformLinktreesService', () => {
  const workspaceId = '00000000-0000-4000-8000-000000000001';
  const branding = {
    name: 'Sponsor.krd',
    logo: '/logo.png',
    avatar: '/avatar.png',
    favicon: '/favicon.ico',
    accentColor: '#25F4EE',
  };
  const linktrees = {
    getAllLinktrees: jest.fn(),
    createLinktree: jest.fn(),
    duplicateLinktree: jest.fn(),
    getLinktreeById: jest.fn(),
    updateLinktree: jest.fn(),
    syncSubmittedLinks: jest.fn(),
    deleteLinktree: jest.fn(),
    toggleCampaignActive: jest.fn(),
    toggleArchive: jest.fn(),
  } as unknown as LinktreesService;
  const workspace = {
    getWorkspaceId: jest.fn().mockResolvedValue(workspaceId),
    getBranding: jest.fn().mockResolvedValue(branding),
    getLinktreeDefaults: jest.fn().mockResolvedValue({
      default_footer_text: 'Footer',
      default_footer_phone: null,
      default_template: 'glass',
      default_background_color: '#ffffff',
      default_footer_hidden: false,
      default_whatsapp_enabled: false,
      default_avatar: null,
    }),
  } as unknown as PlatformContentWorkspaceService;
  const redis = {
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as RedisService;
  const analytics = {
    getSummary: jest.fn(),
    clear: jest.fn(),
  } as unknown as UnifiedAnalyticsService;
  const analyticsReads = {
    getActions: jest.fn(),
  } as unknown as AnalyticsReadService;
  const service = new PlatformLinktreesService(
    linktrees,
    workspace,
    redis,
    analytics,
    analyticsReads,
  );

  beforeEach(() => jest.clearAllMocks());

  /**
   * The root Linktree namespace is shared with every Creator, so the console's
   * availability check can go stale between the answer and the save.
   * `root_public_slugs_pkey` is the arbiter, and a lost race is a conflict.
   */
  it('reports a lost root-slug race on create as a conflict', async () => {
    (linktrees.createLinktree as jest.Mock).mockRejectedValue({
      code: '23505',
      constraint: 'root_public_slugs_pkey',
    });

    await expect(
      service.create({ name: 'Campaign', slug: 'taken' }),
    ).rejects.toBeInstanceOf(ConflictException);
    // The page never landed, so nothing may be purged as though it had.
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('reports a lost root-slug race on update as a conflict', async () => {
    (linktrees.getLinktreeById as jest.Mock).mockResolvedValue({
      uid: 'uid-1',
      seo_name: 'before',
    });
    (linktrees.updateLinktree as jest.Mock).mockRejectedValue({
      code: '23505',
      constraint: 'root_public_slugs_pkey',
    });

    await expect(
      service.update('page-id', {
        name: 'Campaign',
        slug: 'taken',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(linktrees.syncSubmittedLinks).not.toHaveBeenCalled();
  });

  it('does not disguise an unrelated failure as a slug conflict', async () => {
    const failure = new Error('connection terminated');
    (linktrees.createLinktree as jest.Mock).mockRejectedValue(failure);

    await expect(service.create({ name: 'Campaign' })).rejects.toBe(failure);
  });

  it('does not expose the internal owner id in dashboard context', async () => {
    await expect(service.getContext()).resolves.toEqual({
      branding,
      defaults: {
        default_footer_text: 'Footer',
        default_footer_phone: null,
        default_template: 'glass',
        default_background_color: '#ffffff',
        default_footer_hidden: false,
        default_whatsapp_enabled: false,
        default_avatar: branding.avatar,
      },
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

  it('forwards date ranges to summary and action analytics', async () => {
    (linktrees.getLinktreeById as jest.Mock).mockResolvedValue({
      id: 'page-id',
    });
    (analytics.getSummary as jest.Mock).mockResolvedValue({ total_views: 4 });
    (analyticsReads.getActions as jest.Mock).mockResolvedValue([
      { id: 'action-id' },
    ]);

    await service.getAnalytics('page-id', {
      from: '2026-09-01',
      to: '2026-09-08',
    });
    await service.getAnalyticsActions('page-id', {
      from: '2026-09-01',
      to: '2026-09-08',
    });

    expect(analytics.getSummary).toHaveBeenCalledWith(workspaceId, {
      pageId: 'page-id',
      pageType: 'linktree',
      from: '2026-09-01',
      to: '2026-09-08',
    });
    expect(analyticsReads.getActions).toHaveBeenCalledWith(workspaceId, {
      pageId: 'page-id',
      pageType: 'linktree',
      from: '2026-09-01',
      to: '2026-09-08',
    });
  });

  it('uses the shared tenant-scoped campaign and archive mutations', async () => {
    (linktrees.toggleCampaignActive as jest.Mock).mockResolvedValue({
      uid: 'one',
      seo_name: 'page',
    });
    (linktrees.toggleArchive as jest.Mock).mockResolvedValue({
      uid: 'one',
      seo_name: 'page',
    });

    await service.toggleCampaign('page-id', true);
    await service.toggleArchive('page-id', true);

    expect(linktrees.toggleCampaignActive).toHaveBeenCalledWith(
      'page-id',
      workspaceId,
      true,
    );
    expect(linktrees.toggleArchive).toHaveBeenCalledWith(
      'page-id',
      workspaceId,
      true,
    );
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

  it('duplicates through the shared Linktree service with platform policy', async () => {
    const input = { name: 'Campaign Copy', slug: 'campaign-copy' };
    (linktrees.duplicateLinktree as jest.Mock).mockResolvedValue({
      uid: 'random-id-copy',
      seo_name: 'campaign-copy',
    });

    await service.duplicate('page-id', input);

    expect(linktrees.duplicateLinktree).toHaveBeenCalledWith(
      'page-id',
      workspaceId,
      input,
      'platform',
    );
    expect(redis.del).toHaveBeenCalledWith(
      'cache:platform-linktree:random-id-copy',
    );
    expect(redis.del).toHaveBeenCalledWith(
      'cache:platform-linktree:campaign-copy',
    );
  });

  it('reports a lost root-slug race on duplicate as a conflict', async () => {
    (linktrees.duplicateLinktree as jest.Mock).mockRejectedValue({
      code: '23505',
      constraint: 'root_public_slugs_pkey',
    });

    await expect(
      service.duplicate('page-id', { name: 'Campaign', slug: 'taken' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(redis.del).not.toHaveBeenCalled();
  });
});
