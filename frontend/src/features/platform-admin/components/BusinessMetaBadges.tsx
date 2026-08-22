"use client";

import { memo } from "react";
import {
  CircleDot,
  CirclePause,
  Layers,
  TriangleAlert,
} from "lucide-react";
import { getRecordAgeBadge } from "@/lib/utils/record-age";
import {
  getBusinessPlanBadgeClasses,
  getBusinessPlanLabel,
} from "@/features/platform-admin/utils/business-plan";
import type { PlatformBusiness as Business } from "@linktree/types";

const PILL_BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none";

export const BusinessPill = memo(function BusinessPill({
  label,
  title,
  className = "",
  icon,
}: {
  label: string;
  title?: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span className={`${PILL_BASE} ${className}`} title={title || label}>
      {icon}
      {label}
    </span>
  );
});

interface BusinessMetaBadgesProps {
  item: Business;
  className?: string;
}

/**
 * The pills the platform admin reads a business by: whether it is live, which
 * plan it sits on, how many pages that plan allows, how long it has been
 * registered, and whether it still has no subdomain to be reached at.
 *
 * Shared by the directory's grid card, table row and mobile card, which used to
 * repeat the status and plan markup three times.
 */
export const BusinessMetaBadges = memo(function BusinessMetaBadges({
  item,
  className = "",
}: BusinessMetaBadgesProps) {
  const isActive = item.status === "active";
  const ageBadge = getRecordAgeBadge(item.created_at);
  // -1 is the unlimited sentinel the entitlement service uses.
  const pageAllowance =
    item.max_linktrees === -1 ? "∞" : String(item.max_linktrees ?? 0);

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <BusinessPill
        label={isActive ? "چالاک" : "ڕاگیراو"}
        title={
          isActive
            ? "بزنسەکە چالاکە و پەڕەکانی بەردەستن"
            : "بزنسەکە ڕاگیراوە و پەڕەکانی بەردەست نین"
        }
        className={
          isActive
            ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        }
        icon={
          isActive ? (
            <CircleDot className="h-3 w-3" />
          ) : (
            <CirclePause className="h-3 w-3" />
          )
        }
      />
      <BusinessPill
        label={getBusinessPlanLabel(item)}
        title={`پلانی ئێستا: ${getBusinessPlanLabel(item)}`}
        className={getBusinessPlanBadgeClasses(item.plan)}
      />
      <BusinessPill
        label={`${pageAllowance} پەڕە`}
        title="زۆرترین ژمارەی پەڕەی لینکتری کە پلانەکە ڕێگەی پێدەدات"
        className="border-slate-200 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300"
        icon={<Layers className="h-3 w-3" />}
      />
      {ageBadge && (
        <BusinessPill
          label={ageBadge.label}
          title={ageBadge.title}
          className={ageBadge.className}
        />
      )}
      {!item.subdomain && (
        <BusinessPill
          label="بێ سەب دۆمەین"
          title="بزنسەکە هێشتا سەب دۆمەینی نییە، بۆیە پەڕەکانی بە ناونیشانی خۆی ناکرێنەوە"
          className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
          icon={<TriangleAlert className="h-3 w-3" />}
        />
      )}
    </div>
  );
});

interface BusinessMetaFieldProps {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}

/** Labelled read-only field used by the directory's grid card. */
export const BusinessMetaField = memo(function BusinessMetaField({
  label,
  value,
  mono = false,
  className = "",
}: BusinessMetaFieldProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span
        className={`block truncate text-[11px] text-gray-700 dark:text-gray-300 ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
});
