import { DatabaseService } from '../database/database.service';
import { CreatorAccountService } from './creator-account.service';

describe('CreatorAccountService safe account view', () => {
  it('returns required Google account data without internal identity claims', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: 'creator-id',
            user_id: 'user-id',
            business_id: 'business-id',
            email: 'creator@example.com',
            display_name: 'Creator Name',
            avatar_url: 'https://example.com/avatar.jpg',
            status: 'active',
            phone_last_four: null,
            phone_verified_at: null,
            page_type: null,
            linktree_id: null,
            mini_website_id: null,
            trial_days: 7,
            trial_started_at: null,
            trial_ends_at: null,
            grace_ends_at: null,
            paid_started_at: null,
            last_login_at: '2026-08-21T00:00:00.000Z',
            created_at: '2026-08-20T00:00:00.000Z',
            risk_level: 'high',
            logo: null,
            avatar: null,
            accent_color: '#b6f20d',
            page_slug: null,
            google_email: 'creator@example.com',
            google_email_verified: true,
            google_last_authenticated_at: '2026-08-21T00:00:00.000Z',
          },
        ],
      }),
    } as unknown as DatabaseService;
    const service = new CreatorAccountService(database);

    const view = await service.accountView('business-id');

    expect(view).toEqual(
      expect.objectContaining({
        display_name: 'Creator Name',
        email: 'creator@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        billingStatus: 'not_started',
        google: {
          provider: 'google',
          email: 'creator@example.com',
          emailVerified: true,
          lastAuthenticatedAt: '2026-08-21T00:00:00.000Z',
        },
      }),
    );
    expect(view).not.toHaveProperty('id');
    expect(view).not.toHaveProperty('business_id');
    expect(view).not.toHaveProperty('user_id');
    expect(view).not.toHaveProperty('risk_level');
    expect(JSON.stringify(view)).not.toContain('provider_subject');
  });
});
