import { SessionService } from '../auth/session.service';
import { DatabaseService } from '../database/database.service';
import { LinktreesService } from '../linktrees/linktrees.service';
import { MiniWebsitesService } from '../mini-websites/mini-websites.service';
import { CreatorAdministrationService } from './creator-administration.service';

describe('CreatorAdministrationService', () => {
  const database = { query: jest.fn() } as unknown as DatabaseService;
  const sessions = {} as SessionService;
  const linktrees = {
    deleteLinktree: jest.fn(),
  } as unknown as LinktreesService;
  const miniWebsites = { remove: jest.fn() } as unknown as MiniWebsitesService;
  const service = new CreatorAdministrationService(
    database,
    sessions,
    linktrees,
    miniWebsites,
  );

  beforeEach(() => jest.clearAllMocks());

  it('deletes a Creator linktree only through the shared platform service', async () => {
    (database.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            business_id: 'business-id',
            page_type: 'linktree',
            linktree_id: 'linktree-id',
            mini_website_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.deletePage('creator-id')).resolves.toEqual({
      pageType: 'linktree',
    });
    expect(linktrees.deleteLinktree).toHaveBeenCalledWith(
      'linktree-id',
      'business-id',
      'platform',
    );
    expect(miniWebsites.remove).not.toHaveBeenCalled();
  });

  it('deletes a Creator mini website through the shared mini-website service', async () => {
    (database.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            business_id: 'business-id',
            page_type: 'mini_website',
            linktree_id: null,
            mini_website_id: 'mini-website-id',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    await service.deletePage('creator-id');
    expect(miniWebsites.remove).toHaveBeenCalledWith(
      'mini-website-id',
      'business-id',
    );
    expect(linktrees.deleteLinktree).not.toHaveBeenCalled();
  });
});
