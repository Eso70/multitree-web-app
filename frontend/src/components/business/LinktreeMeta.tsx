"use client";

import { memo } from "react";
import { CirclePause, MessageCircle, Star } from "lucide-react";
import { getRecordAgeBadge } from "@/lib/utils/record-age";
import { getTemplateName } from "@/lib/templates/config";
import type { LinktreeListItem } from "@linktree/types";

const PILL_BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none";

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
  return (
    <span className={`${PILL_BASE} ${className}`} title={title || label}>
      {icon}
      {label}
    </span>
  );
});

interface LinktreeMetaBadgesProps {
  item: Pick<
    LinktreeListItem,
    | "created_at"
    | "is_default"
    | "status"
    | "template_key"
    | "whatsapp_modal_enabled"
  >;
  /**
   * Age badges read `created_at`, which only the Linktree dashboard populates
   * with a real creation date, so callers opt in.
   */
  showAgeBadge?: boolean;
  showTemplate?: boolean;
  className?: string;
}

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
}: LinktreeMetaBadgesProps) {
  const ageBadge = showAgeBadge ? getRecordAgeBadge(item.created_at) : null;
  const templateName = showTemplate ? getTemplateName(item.template_key) : null;
  const isInactive = item.status === "inactive";
  const hasWhatsappModal = item.whatsapp_modal_enabled === true;

  if (
    !item.is_default &&
    !ageBadge &&
    !templateName &&
    !isInactive &&
    !hasWhatsappModal
  )
    return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {item.is_default && (
        <span
          className={`${PILL_BASE} border-transparent`}
          title="پەیجی بنەڕەتی بزنسەکە"
          style={{
            background:
              "color-mix(in srgb, var(--theme-primary, #64748b) 14%, white)",
            color: "var(--theme-primary, #64748b)",
          }}
        >
          <Star className="h-2.5 w-2.5" />
          بنەڕەت
        </span>
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
      <span
        className="block truncate text-[11px] text-gray-700 dark:text-gray-300"
        title={value}
      >
        {value}
      </span>
    </div>
  );
});
