"use client";

import { memo } from "react";
import {
  LinktreePill,
  type LinktreeMetaBadgesProps,
  type PageListTrafficLabels,
} from "@/components/business/LinktreeMeta";
import { MINI_WEBSITE_TEMPLATE_OPTIONS } from "@/components/templates/mini-website";
import { getRecordAgeBadge } from "@/lib/utils/record-age";

export const MINI_WEBSITE_TRAFFIC_LABELS: PageListTrafficLabels = {
  column: "ترافیک",
  views: "بینەری تاک",
  interactions: "کۆی کردار",
};

const STATUS_CLASSES: Record<string, string> = {
  بڵاوکراوە:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  ڕاگیراوە:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  ڕەشنووس:
    "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300",
};

export const MiniWebsiteListMeta = memo(function MiniWebsiteListMeta({
  item,
  showAgeBadge = false,
  showTemplate = false,
  className = "",
}: LinktreeMetaBadgesProps) {
  const statusLabel = item.seo_name?.trim() || null;
  const ageBadge = showAgeBadge ? getRecordAgeBadge(item.created_at) : null;
  const templateName = showTemplate
    ? MINI_WEBSITE_TEMPLATE_OPTIONS.find(
        (option) => option.id === item.template_key,
      )?.name
    : null;

  if (!statusLabel && !ageBadge && !templateName) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {statusLabel && (
        <LinktreePill
          label={statusLabel}
          className={
            STATUS_CLASSES[statusLabel] ||
            "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300"
          }
        />
      )}
      {ageBadge && (
        <LinktreePill
          label={ageBadge.label}
          title={ageBadge.title}
          className={ageBadge.className}
        />
      )}
      {templateName && (
        <LinktreePill
          label={templateName}
          title={`قالبی ${templateName}`}
          className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
        />
      )}
    </div>
  );
});
