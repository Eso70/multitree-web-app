import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CreatorAccountService {
  constructor(private readonly database: DatabaseService) {}

  async profile(businessId: string) {
    const result = await this.database.query<{
      id: string;
      user_id: string;
      business_id: string;
      email: string;
      display_name: string;
      status: string;
      phone_last_four: string | null;
      phone_verified_at: string | null;
      page_type: 'linktree' | 'mini_website' | null;
      linktree_id: string | null;
      mini_website_id: string | null;
      trial_days: number;
      trial_started_at: string | null;
      trial_ends_at: string | null;
      grace_ends_at: string | null;
      paid_started_at: string | null;
      risk_level: string;
      logo: string | null;
      avatar: string | null;
      accent_color: string | null;
      page_slug: string | null;
    }>(
      `SELECT creator.id, creator.user_id, creator.business_id,
              user_account.email, user_account.display_name, creator.status,
              creator.phone_last_four, creator.phone_verified_at,
              creator.page_type, creator.linktree_id, creator.mini_website_id,
              creator.trial_days, creator.trial_started_at,
              creator.trial_ends_at, creator.grace_ends_at,
              creator.paid_started_at, creator.risk_level,
              branding.logo, branding.default_avatar AS avatar,
              branding.website_color AS accent_color,
              COALESCE(linktree.seo_name, website.slug) AS page_slug
         FROM creator_accounts creator
         JOIN users user_account ON user_account.id = creator.user_id
         JOIN businesses business ON business.id = creator.business_id
         LEFT JOIN business_branding branding ON branding.business_id = business.id
         LEFT JOIN linktrees linktree ON linktree.id = creator.linktree_id
         LEFT JOIN mini_websites website ON website.id = creator.mini_website_id
        WHERE creator.business_id = $1 AND business.account_type = 'creator'`,
      [businessId],
    );
    const profile = result.rows[0];
    if (!profile) return null;
    const now = Date.now();
    const trialEnds = profile.trial_ends_at
      ? new Date(profile.trial_ends_at).getTime()
      : null;
    const graceEnds = profile.grace_ends_at
      ? new Date(profile.grace_ends_at).getTime()
      : null;
    return {
      ...profile,
      billingStatus: profile.paid_started_at
        ? 'active'
        : trialEnds === null
          ? 'not_started'
          : trialEnds > now
            ? 'trialing'
            : graceEnds && graceEnds > now
              ? 'grace_period'
              : 'expired',
      remainingTrialDays:
        trialEnds && trialEnds > now
          ? Math.ceil((trialEnds - now) / 86_400_000)
          : 0,
    };
  }
}
