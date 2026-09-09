import { SessionService } from '../auth/session.service';
import { DatabaseService } from '../database/database.service';
import { LinktreesService } from '../linktrees/linktrees.service';
import { CreatorAdministrationService } from './creator-administration.service';

describe('CreatorAdministrationService', () => {
  const database = { query: jest.fn() } as unknown as DatabaseService;
  const sessions = {} as SessionService;
  const linktrees = {
    deleteLinktree: jest.fn(),
  } as unknown as LinktreesService;
  const service = new CreatorAdministrationService(
    database,
    sessions,
    linktrees,
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
  });
});
