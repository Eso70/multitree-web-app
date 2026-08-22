import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreatorAccountRecord {
  id: string;
  user_id: string;
  business_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
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
  last_login_at: string | null;
  created_at: string;
  risk_level: string;
  logo: string | null;
  avatar: string | null;
  accent_color: string | null;
  page_slug: string | null;
  google_email: string | null;
  google_email_verified: boolean;
  google_last_authenticated_at: string | null;
  billingStatus:
    'not_started' | 'trialing' | 'grace_period' | 'expired' | 'active';
  remainingTrialDays: number;
}

@Injectable()
export class CreatorAccountService {
  constructor(private readonly database: DatabaseService) {}

  async profile(businessId: string): Promise<CreatorAccountRecord | null> {
    const result = await this.database.query<CreatorAccountRecord>(
      `SELECT creator.id, creator.user_id, creator.business_id,
              user_account.email, user_account.display_name,
              user_account.avatar_url, creator.status,
              creator.phone_last_four, creator.phone_verified_at,
              creator.page_type, creator.linktree_id, creator.mini_website_id,
              creator.trial_days, creator.trial_started_at,
              creator.trial_ends_at, creator.grace_ends_at,
              creator.paid_started_at, creator.last_login_at,
              creator.created_at, creator.risk_level,
              branding.logo, branding.default_avatar AS avatar,
              branding.website_color AS accent_color,
              COALESCE(linktree.seo_name, website.slug) AS page_slug,
              google_identity.provider_email AS google_email,
              COALESCE(google_identity.email_verified, false) AS google_email_verified,
              google_identity.last_authenticated_at AS google_last_authenticated_at
         FROM creator_accounts creator
         JOIN users user_account ON user_account.id = creator.user_id
         JOIN businesses business ON business.id = creator.business_id
         LEFT JOIN user_identities google_identity
           ON google_identity.user_id = user_account.id
          AND google_identity.provider = 'google'
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
    const billingStatus: CreatorAccountRecord['billingStatus'] =
      profile.paid_started_at
        ? 'active'
        : trialEnds === null
          ? 'not_started'
          : trialEnds > now
            ? 'trialing'
            : graceEnds && graceEnds > now
              ? 'grace_period'
              : 'expired';
    return {
      ...profile,
      billingStatus,
      remainingTrialDays:
        trialEnds && trialEnds > now
          ? Math.ceil((trialEnds - now) / 86_400_000)
          : 0,
    };
  }

  async accountView(businessId: string) {
    const profile = await this.profile(businessId);
    if (!profile) return null;
    return this.accountViewFromProfile(profile);
  }

  accountViewFromProfile(profile: CreatorAccountRecord) {
    return {
      display_name: profile.display_name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      status: profile.status,
      phone_last_four: profile.phone_last_four,
      phone_verified_at: profile.phone_verified_at,
      page_type: profile.page_type,
      page_slug: profile.page_slug,
      trial_days: profile.trial_days,
      trial_started_at: profile.trial_started_at,
      trial_ends_at: profile.trial_ends_at,
      grace_ends_at: profile.grace_ends_at,
      paid_started_at: profile.paid_started_at,
      last_login_at: profile.last_login_at,
      created_at: profile.created_at,
      billingStatus: profile.billingStatus,
      remainingTrialDays: profile.remainingTrialDays,
      google: {
        provider: 'google' as const,
        email: profile.google_email || profile.email,
        emailVerified: profile.google_email_verified,
        lastAuthenticatedAt: profile.google_last_authenticated_at,
      },
    };
  }
}
