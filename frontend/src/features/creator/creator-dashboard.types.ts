export type CreatorBillingStatus =
  "not_started" | "trialing" | "grace_period" | "expired" | "active";

export interface CreatorAccountView {
  display_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  phone_last_four: string | null;
  phone_verified_at: string | null;
  page_type: "linktree" | "mini_website" | null;
  page_slug: string | null;
  trial_days: number;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  paid_started_at: string | null;
  last_login_at: string | null;
  created_at: string;
  billingStatus: CreatorBillingStatus;
  remainingTrialDays: number;
  google: {
    provider: "google";
    email: string;
    emailVerified: boolean;
    lastAuthenticatedAt: string | null;
  };
}

export interface CreatorContext {
  account: CreatorAccountView;
  branding: {
    name: string;
    logo: string | null;
    avatar: string | null;
    favicon: string | null;
    accentColor: string | null;
  };
  publicPathPrefixes: { linktree: string; miniWebsite: string };
}
