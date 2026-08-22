import { StorageService } from '../storage/storage.service';
import { CreatorContentController } from './creator-content.controller';
import { CreatorContentService } from './creator-content.service';
import type { CreatorRequest } from './creator.guard';

describe('CreatorContentController TikTok settings', () => {
  const content = {
    updateTikTokSettings: jest.fn(),
  } as unknown as CreatorContentService;
  const controller = new CreatorContentController(
    content,
    {} as StorageService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('derives TikTok ownership only from the guarded Creator request', async () => {
    const request = {
      creator: {
        id: 'creator-id',
        businessId: 'authenticated-business-id',
        status: 'active',
        canWrite: true,
      },
    } as CreatorRequest;
    const body = { tiktok_configs: [{ pixel_id: 'PIXEL123' }] };
    (content.updateTikTokSettings as jest.Mock).mockResolvedValue({
      tiktok_configs: body.tiktok_configs,
    });

    await controller.updateTikTokSettings(request, body);

    expect(content.updateTikTokSettings).toHaveBeenCalledWith(
      'authenticated-business-id',
      body.tiktok_configs,
    );
  });
});

describe('CreatorContentController analytics actions', () => {
  const content = {
    pageActions: jest.fn(),
  } as unknown as CreatorContentService;
  const controller = new CreatorContentController(
    content,
    {} as StorageService,
  );
  const request = {
    creator: {
      id: 'creator-id',
      businessId: 'authenticated-business-id',
      status: 'active',
      canWrite: true,
    },
  } as CreatorRequest;

  beforeEach(() => jest.clearAllMocks());

  it('reads linktree action rows for the authenticated workspace only', async () => {
    (content.pageActions as jest.Mock).mockResolvedValue([]);

    await controller.linktreeAnalyticsActions(request, 'page-id');

    expect(content.pageActions).toHaveBeenCalledWith(
      'authenticated-business-id',
      'linktree',
      'page-id',
    );
  });

  it('reads mini-website action rows for the authenticated workspace only', async () => {
    (content.pageActions as jest.Mock).mockResolvedValue([]);

    await controller.miniWebsiteAnalyticsActions(request, 'page-id');

    expect(content.pageActions).toHaveBeenCalledWith(
      'authenticated-business-id',
      'mini_website',
      'page-id',
    );
  });
});
