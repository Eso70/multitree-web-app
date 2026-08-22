import { formatDate } from "@/lib/utils/linktree-utils";
import type {
  CreatorBillingStatus,
  CreatorRiskLevel,
  CreatorStatus,
} from "@/features/platform-admin/components/CreatorMetaBadges";

/**
 * One Creator account as the platform list endpoint returns it, plus the few
 * derivations the table and the detail modal both need.
 *
 * Kept out of either component so neither has to import the other: the table
 * opens the modal, and the modal reads the same record.
 */
export type Creator = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  google_email_verified: boolean;
  google_last_authenticated_at: string | null;
  last_login_at: string | null;
  active_session_count: number;
  status: CreatorStatus;
  risk_level: CreatorRiskLevel;
  page_type: "linktree" | "mini_website" | null;
  page_slug: string | null;
  phone_last_four: string | null;
  phone_verified_at: string | null;
  billing_status: CreatorBillingStatus;
  trial_days: number;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  paid_started_at: string | null;
  created_at: string;
};

export type CreatorManageAction =
  | "suspend"
  | "reactivate"
  | "activate_paid"
  | "cancel_paid"
  | "extend_trial";

export const PAGE_TYPE_LABELS: Record<"linktree" | "mini_website", string> = {
  linktree: "لینکتری",
  mini_website: "مینی وێبسایت",
};

/** `formatDate` echoes whatever it is handed back when it cannot parse it, so
 *  the nullable timestamps get their dash here rather than the string "null". */
export function formatOptionalDate(value: string | null) {
  return value ? formatDate(value) : "—";
}

/** The public address of the account's page, or `null` when it has none. */
export function creatorPageHref(creator: Creator) {
  if (!creator.page_slug) return null;
  const prefix = creator.page_type === "linktree" ? "linktree" : "bio";
  return `/${prefix}/${creator.page_slug}`;
}

/**
 * The one date that matters for the state the account is actually in.
 *
 * The list query's `CASE` already decides which timestamp is authoritative —
 * this mirrors it rather than stacking trial, grace and paid dates in one cell,
 * which reads as noise twenty rows deep.
 */
export function subscriptionDeadline(creator: Creator): {
  label: string;
  value: string | null;
} {
  switch (creator.billing_status) {
    case "active":
      return { label: "پارەدان لە", value: creator.paid_started_at };
    case "trialing":
      return { label: "کۆتایی تاقیکردنەوە", value: creator.trial_ends_at };
    case "grace_period":
      return { label: "کۆتایی لێبوردن", value: creator.grace_ends_at };
    case "expired":
      return {
        label: "بەسەرچووە لە",
        value: creator.grace_ends_at || creator.trial_ends_at,
      };
    case "not_started":
      // No date to show, and the billing pill already says this account has
      // not started — repeating it in the date column reads as a bug.
      return { label: "بەروار", value: null };
  }
}
