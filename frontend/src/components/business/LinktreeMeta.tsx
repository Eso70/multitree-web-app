"use client";

import { memo } from "react";
import { Archive, CirclePause, MessageCircle, Star } from "lucide-react";
import { getRecordAgeBadge } from "@/lib/utils/record-age";
import { getTemplateName } from "@/lib/templates/config";
import type { LinktreeListItem } from "@linktree/types";
import { ANALYTICS_TERMS } from "@/components/shared/analytics-terminology";
import { Tooltip } from "@/components/shared/Tooltip";

const PILL_BASE =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold leading-none";

export const LinktreePill = memo(function LinktreePill({
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
  const pill = (
    <span className={`${PILL_BASE} ${className}`}>
      {icon}
      {label}
    </span>
  );
  if (title) {
    return <Tooltip content={title} side="top">{pill}</Tooltip>;
  }
  return pill;
});

export interface LinktreeMetaBadgesProps {
  item: Pick<
    LinktreeListItem,
    | "created_at"
    | "is_default"
    | "seo_name"
    | "status"
    | "template_key"
    | "whatsapp_modal_enabled"
  > & {
    id?: string;
    is_campaign_active?: boolean;
    is_archived?: boolean;
  };
  /**
   * Age badges read `created_at`, which only the Linktree dashboard populates
   * with a real creation date, so callers opt in.
   */
  showAgeBadge?: boolean;
  showTemplate?: boolean;
  className?: string;
  onToggleCampaign?: (id: string, isCampaignActive: boolean) => void;
  hideCampaignBadge?: boolean;
}

export interface LinktreeCampaignButtonProps {
  id?: string;
  isActive?: boolean;
  onToggle?: (id: string, isCampaignActive: boolean) => void;
  className?: string;
}

export const LinktreeCampaignButton = memo(function LinktreeCampaignButton({
  id,
  isActive = false,
  onToggle,
  className = "",
}: LinktreeCampaignButtonProps) {
  if (!onToggle && !isActive) return null;

  const tooltipText = isActive
    ? onToggle
      ? "کەمپەین چالاکە · کلیک بکە بۆ ناچالاککردن"
      : "کەمپەین چالاکە"
    : "کەمپەین ناچالاکە · کلیک بکە بۆ چالاککردن";

  const pillContent = (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-medium leading-none transition-all duration-200 select-none ${
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200 bg-white/90 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
      } ${
        onToggle
          ? isActive
            ? "cursor-pointer hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50"
            : "cursor-pointer hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-gray-200"
          : "cursor-default"
      } ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-gray-600"
        }`}
      />
      <span>{isActive ? "چالاک" : "کەمپەین"}</span>
    </span>
  );

  if (!onToggle || !id) {
    return (
      <Tooltip content={tooltipText} side="top">
        {pillContent}
      </Tooltip>
    );
  }

  return (
    <Tooltip content={tooltipText} side="top">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(id, !isActive);
        }}
        className="cursor-pointer"
        aria-label={isActive ? "Campaign active" : "Campaign inactive"}
      >
        {pillContent}
      </button>
    </Tooltip>
  );
});

export interface PageListTrafficLabels {
  column: string;
  views: string;
  interactions: string;
}

export const LINKTREE_TRAFFIC_LABELS: PageListTrafficLabels = {
  column: "ترافیک",
  views: ANALYTICS_TERMS.uniqueViewer,
  interactions: ANALYTICS_TERMS.uniqueClicker,
};

/**
 * Status pills shared by the Linktree grid card, table row and mobile card.
 * Every pill is field-gated so consumers that reuse the list components with a
 * partial projection simply render fewer pills.
 */
export const LinktreeMetaBadges = memo(function LinktreeMetaBadges({
  item,
  showAgeBadge = false,
  showTemplate = false,
  className = "",
  onToggleCampaign,
  hideCampaignBadge = false,
}: LinktreeMetaBadgesProps) {
  const ageBadge = showAgeBadge && item.created_at ? getRecordAgeBadge(item.created_at) : null;
  const templateName = showTemplate ? getTemplateName(item.template_key) : null;
  const isInactive = item.status === "inactive";
  const hasWhatsappModal = item.whatsapp_modal_enabled === true;
  const isCampaignActive = !!item.is_campaign_active;
  const isArchived = !!item.is_archived;

  if (
    !item.is_default &&
    !ageBadge &&
    !templateName &&
    !isInactive &&
    !hasWhatsappModal &&
    !isArchived &&
    (hideCampaignBadge || (!isCampaignActive && !onToggleCampaign))
  )
    return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {item.is_default && (
        <Tooltip content="پەیجی بنەڕەتی بزنسەکە" side="top">
          <span
            className={`${PILL_BASE} border-transparent cursor-default`}
            style={{
              background:
                "color-mix(in srgb, var(--theme-primary, #64748b) 14%, white)",
              color: "var(--theme-primary, #64748b)",
            }}
          >
            <Star className="h-2.5 w-2.5" />
            بنەڕەت
          </span>
        </Tooltip>
      )}

      {ageBadge && (
        <LinktreePill
          label={ageBadge.label}
          title={ageBadge.title}
          className={ageBadge.className}
        />
      )}
      {isInactive && (
        <LinktreePill
          label="ناچالاک"
          title="پەڕەکە بۆ سەردانکەران بەردەست نییە"
          className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          icon={<CirclePause className="h-2.5 w-2.5" />}
        />
      )}
      {hasWhatsappModal && (
        <LinktreePill
          label="واتساپ"
          title="مۆداڵی واتساپ چالاکە لەم پەڕەیە"
          className="border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
          icon={<MessageCircle className="h-2.5 w-2.5" />}
        />
      )}
      {templateName && (
        <LinktreePill
          label={templateName}
          title={`قالبی ${templateName}`}
          className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
        />
      )}
      {isArchived && (
        <Tooltip content="ئەم پەیجە ئەرشیفکراوە" side="top">
          <span
            className={`${PILL_BASE} border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300 cursor-default text-[9.5px] px-2 py-0.5`}
          >
            <Archive className="h-2.5 w-2.5" />
            ئەرشیف
          </span>
        </Tooltip>
      )}

      {/* Campaign toggle badge rendered at the end, not first */}
      {!hideCampaignBadge && !isArchived && (
        <LinktreeCampaignButton
          id={item.id}
          isActive={isCampaignActive}
          onToggle={onToggleCampaign}
        />
      )}
    </div>
  );
});

interface LinktreeMetaFieldProps {
  label: string;
  value: string;
  className?: string;
}

/** Labelled read-only field used by the Linktree card and mobile list views. */
export const LinktreeMetaField = memo(function LinktreeMetaField({
  label,
  value,
  className = "",
}: LinktreeMetaFieldProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <span className="block text-[9px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <Tooltip content={value} side="top">
        <span className="block truncate text-[11px] text-gray-700 dark:text-gray-300">
          {value}
        </span>
      </Tooltip>
    </div>
  );
});
