"use client";

import { memo } from "react";
import {
  Archive,
  CircleDot,
  CirclePause,
  Clock3,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { getRecordAgeBadge } from "@/lib/utils/record-age";
import { BusinessPill } from "@/features/platform-admin/components/BusinessMetaBadges";

/** The account states `creator_accounts.status` stores. */
export type CreatorStatus = "active" | "suspended" | "expired" | "archived";

/** The risk tiers `creator_accounts.risk_level` stores. */
export type CreatorRiskLevel = "low" | "medium" | "high";

/**
 * The subscription states the platform list query derives. Kept as a union
 * rather than `string` so a value added to the SQL `CASE` without a label here
 * fails the build instead of rendering an empty pill.
 */
export type CreatorBillingStatus =
  | "active"
  | "trialing"
  | "grace_period"
  | "expired"
  | "not_started";

interface PillStyle {
  label: string;
  title: string;
  className: string;
}

const STATUS_STYLES: Record<CreatorStatus, PillStyle> = {
  active: {
    label: "چالاک",
    title: "هەژمارەکە چالاکە و دەتوانێت بچێتە ژوورەوە",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  suspended: {
    label: "ڕاگیراو",
    title: "هەژمارەکە ڕاگیراوە و دانیشتنەکانی هەڵوەشێنراونەتەوە",
    className:
      "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  },
  expired: {
    label: "بەسەرچوو",
    title: "ماوەی هەژمارەکە تەواو بووە",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
  },
  archived: {
    label: "ئەرشیفکراو",
    title: "هەژمارەکە ئەرشیف کراوە",
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300",
  },
};

const STATUS_ICONS: Record<CreatorStatus, React.ReactNode> = {
  active: <CircleDot className="h-3 w-3" />,
  suspended: <CirclePause className="h-3 w-3" />,
  expired: <Clock3 className="h-3 w-3" />,
  archived: <Archive className="h-3 w-3" />,
};

const BILLING_STYLES: Record<CreatorBillingStatus, PillStyle> = {
  active: {
    label: "پارەدراو",
    title: "بەشداری پارەدراوی چالاک",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  trialing: {
    label: "تاقیکردنەوە",
    title: "لە ماوەی تاقیکردنەوەدایە",
    className:
      "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  },
  grace_period: {
    label: "ماوەی لێبوردن",
    title: "تاقیکردنەوەکە کۆتایی هاتووە بەڵام هێشتا لە ماوەی لێبوردندایە",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
  },
  expired: {
    label: "بەسەرچوو",
    title: "بەشدارییەکە بەسەرچووە",
    className:
      "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  },
  not_started: {
    label: "دەستی پێنەکردووە",
    title: "هێشتا تاقیکردنەوە یان بەشداری دەستی پێنەکردووە",
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300",
  },
};

const RISK_STYLES: Record<Exclude<CreatorRiskLevel, "low">, PillStyle> = {
  medium: {
    label: "مەترسی ناوەند",
    title: "هەژمارەکە بە مەترسی ناوەند نیشانە کراوە",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
  },
  high: {
    label: "مەترسی بەرز",
    title: "هەژمارەکە بە مەترسی بەرز نیشانە کراوە",
    className:
      "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  },
};

/** The same labels the pills carry, for callers that need plain text. */
export const CREATOR_STATUS_LABELS: Record<CreatorStatus, string> =
  Object.fromEntries(
    Object.entries(STATUS_STYLES).map(([key, style]) => [key, style.label]),
  ) as Record<CreatorStatus, string>;

export const CREATOR_BILLING_LABELS: Record<CreatorBillingStatus, string> =
  Object.fromEntries(
    Object.entries(BILLING_STYLES).map(([key, style]) => [key, style.label]),
  ) as Record<CreatorBillingStatus, string>;

/** Kurdish labels for the risk tiers, including the default one. */
export const CREATOR_RISK_LABELS: Record<CreatorRiskLevel, string> = {
  low: "مەترسی نزم",
  medium: "مەترسی ناوەند",
  high: "مەترسی بەرز",
};

interface CreatorMetaBadgesProps {
  status: CreatorStatus;
  billingStatus: CreatorBillingStatus;
  createdAt: string;
  /** Only `medium` and `high` earn a pill; `low` is the default and is noise. */
  riskLevel?: CreatorRiskLevel;
  className?: string;
}

/**
 * The pills the platform admin reads a Creator account by: whether the account
 * itself is usable, which subscription state it sits in, and how long it has
 * been registered.
 *
 * Mirrors `BusinessMetaBadges` so the users table and the business directory
 * read the same way, and reuses its `BusinessPill` rather than restating the
 * pill markup.
 */
export const CreatorMetaBadges = memo(function CreatorMetaBadges({
  status,
  billingStatus,
  createdAt,
  riskLevel,
  className = "",
}: CreatorMetaBadgesProps) {
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.archived;
  const billingStyle =
    BILLING_STYLES[billingStatus] ?? BILLING_STYLES.not_started;
  const ageBadge = getRecordAgeBadge(createdAt);
  const riskStyle =
    riskLevel && riskLevel !== "low" ? RISK_STYLES[riskLevel] : null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <BusinessPill
        label={statusStyle.label}
        title={statusStyle.title}
        className={statusStyle.className}
        icon={STATUS_ICONS[status]}
      />
      <BusinessPill
        label={billingStyle.label}
        title={billingStyle.title}
        className={billingStyle.className}
      />
      {riskStyle && (
        <BusinessPill
          label={riskStyle.label}
          title={riskStyle.title}
          className={riskStyle.className}
          icon={<TriangleAlert className="h-3 w-3" />}
        />
      )}
      {ageBadge && (
        <BusinessPill
          label={ageBadge.label}
          title={ageBadge.title}
          className={ageBadge.className}
        />
      )}
    </div>
  );
});

/**
 * The Google verification pill. Icon and colour follow the flag, not only the
 * label: a green check beside the word "Unverified" reads as verified to
 * anyone scanning the column.
 */
export const CreatorVerificationBadge = memo(function CreatorVerificationBadge({
  verified,
}: {
  verified: boolean;
}) {
  return (
    <BusinessPill
      label={verified ? "Google verified" : "Unverified"}
      title={
        verified
          ? "ئیمەیڵەکە لەلایەن گوگڵەوە پشتڕاست کراوەتەوە"
          : "ئیمەیڵەکە پشتڕاست نەکراوەتەوە"
      }
      className={
        verified
          ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
      }
      icon={
        verified ? (
          <ShieldCheck className="h-3 w-3" />
        ) : (
          <ShieldAlert className="h-3 w-3" />
        )
      }
    />
  );
});
