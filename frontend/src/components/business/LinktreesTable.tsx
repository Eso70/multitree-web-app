"use client";

import { memo, useCallback, useState, type ComponentType } from "react";
import Image from "next/image";
import {
  Archive,
  ArchiveRestore,
  CirclePause,
  CirclePlay,
  Trash2,
  Eye,
  Copy,
  CopyPlus,
  Check,
  Edit,
  Link as LinkIcon,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils/clipboard";
import { formatDate, getAbsoluteUrl } from "@/lib/utils/linktree-utils";
import {
  ManagementTable,
  MANAGEMENT_TABLE_CARD_CLASS,
  MANAGEMENT_TABLE_ROW_CLASS,
  type ManagementTableColumn,
  type ManagementTablePagination,
} from "@/components/shared/ManagementTable";
import {
  LINKTREE_TRAFFIC_LABELS,
  LinktreeMetaBadges,
  type LinktreeMetaBadgesProps,
  type PageListTrafficLabels,
} from "@/components/business/LinktreeMeta";
import type { LinktreeListItem as Linktree } from "@linktree/types";
import { Tooltip } from "@/components/shared/Tooltip";

interface LinktreesTableProps {
  publicPathPrefix?: string;
  data?: Linktree[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDuplicate?: (item: Linktree) => void;
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics?: (id: string, name: string) => void;
  viewActionLabel?: string;
  emptyTitle?: string;
  /**
   * Opt in when `data` holds real Linktree records. It unlocks the fields that
   * only that projection fills in: template and the age badge.
   */
  showLinktreeMeta?: boolean;
  /** Use the complete shared list treatment for any supported public page. */
  showPageMeta?: boolean;
  MetaBadgesComponent?: ComponentType<LinktreeMetaBadgesProps>;
  trafficLabels?: PageListTrafficLabels;
  emptyDescription?: string;
  pagination?: ManagementTablePagination;
  onToggleCampaign?: (id: string, isCampaignActive: boolean) => void;
  onToggleArchive?: (id: string, isArchived: boolean) => void;
  onToggleStatus?: (id: string, status: "active" | "inactive") => void;
}

/**
 * The header cells, in order.
 *
 * Both optional columns are table-level decisions rather than per-row ones, and
 * they are dropped from this list rather than rendered conditionally, so the
 * header count and the `<td>`s in `TableRow` cannot drift apart and shear the
 * columns.
 */
function buildColumns(
  displaysPageMeta: boolean,
  showTraffic: boolean,
  trafficLabels: PageListTrafficLabels,
): ManagementTableColumn[] {
  return [
    { key: "image", header: "وێنە", width: "w-16 sm:w-20" },
    { key: "name", header: "ناو", width: "w-32 sm:w-40" },
    {
      key: "subtitle",
      header: "ناونیشانی کورت",
      width: "w-32 lg:w-40",
      hideBelow: "md",
    },
    ...(displaysPageMeta
      ? []
      : ([
          { key: "slug", header: "Slug", width: "w-24", hideBelow: "lg" },
        ] as ManagementTableColumn[])),
    { key: "link", header: "بەستەر", width: "w-32 sm:w-40 lg:w-48" },
    ...(showTraffic
      ? ([
          {
            key: "traffic",
            header: trafficLabels.column,
            width: "w-24",
          },
        ] as ManagementTableColumn[])
      : []),
    { key: "created", header: "دروستکراوە", width: "w-28", hideBelow: "xl" },
    { key: "updated", header: "نوێکراوە", width: "w-28", hideBelow: "xl" },
    { key: "actions", header: "کارەکان", width: "w-28 sm:w-32" },
  ];
}

function getPublicIdentifier(item: Linktree): string {
  return item.public_identifier?.trim() || item.seo_name?.trim() || item.uid;
}

// 1. Memoized table row component for better performance
// Uses GPU rendering and content-visibility to prevent scrolling lag
const TableRow = memo(function TableRow({
  item,
  onEdit,
  onDuplicate,
  onDelete,
  onViewAnalytics,
  onToggleCampaign,
  onToggleArchive,
  onToggleStatus,
  copiedUid,
  onCopy,
  formatDate,
  viewActionLabel,
  publicPathPrefix,
  showPageMeta,
  showTraffic,
  MetaBadgesComponent,
  trafficLabels,
}: {
  item: Linktree;
  onEdit?: (id: string) => void;
  onDuplicate?: (item: Linktree) => void;
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics?: (id: string, name: string) => void;
  onToggleCampaign?: (id: string, isCampaignActive: boolean) => void;
  onToggleArchive?: (id: string, isArchived: boolean) => void;
  onToggleStatus?: (id: string, status: "active" | "inactive") => void;
  copiedUid: string | null;
  onCopy: (uid: string, e: React.MouseEvent) => void;
  formatDate: (dateString: string) => string;
  viewActionLabel: string;
  publicPathPrefix: string;
  showPageMeta: boolean;
  showTraffic: boolean;
  MetaBadgesComponent: ComponentType<LinktreeMetaBadgesProps>;
  trafficLabels: PageListTrafficLabels;
}) {
  const publicIdentifier = getPublicIdentifier(item);
  const getLinktreeUrl = useCallback(
    (uid: string) => `${publicPathPrefix}/${encodeURIComponent(uid)}`,
    [publicPathPrefix],
  );

  const handleView = useCallback(
    (uid: string) => {
      const url = getAbsoluteUrl(uid, publicPathPrefix);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [publicPathPrefix],
  );

  const isCampaignActive = !!item.is_campaign_active;

  return (
    <tr
      className={`${MANAGEMENT_TABLE_ROW_CLASS} ${
        isCampaignActive
          ? "bg-emerald-50/35 dark:bg-emerald-500/[0.04] hover:bg-emerald-50/55 dark:hover:bg-emerald-500/[0.07]"
          : ""
      }`}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "80px",
      }}
    >
      <td className="px-2 sm:px-3 py-3">
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 mx-auto">
          <div className="relative w-full h-full rounded-full overflow-hidden border border-gray-200">
            <Image
              src={
                item.image ||
                item.business_default_avatar ||
                item.business_logo ||
                "/images/DefaultAvatar.png"
              }
              alt={item.name}
              fill
              className="object-cover"
              loading="lazy"
              sizes="(max-width: 640px) 32px, 40px"
              quality={75}
              unoptimized
            />
          </div>
          {isCampaignActive && (
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
              title="کەمپەین چالاکە"
            />
          )}
        </div>
      </td>
      <td className="px-2 sm:px-3 py-3">
        <span className="text-xs sm:text-sm font-semibold text-gray-900 wrap-break-word block mb-1">
          {item.name}
        </span>
        <MetaBadgesComponent
          item={item}
          showAgeBadge={showPageMeta}
          showTemplate={showPageMeta}
          onToggleCampaign={onToggleCampaign}
        />
      </td>
      <td className="px-2 sm:px-3 py-3 hidden md:table-cell">
        <div className="text-xs text-gray-600 wrap-break-word line-clamp-2">
          {item.subtitle || "—"}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-400 wrap-break-word line-clamp-2">
          {item.description?.trim() || "—"}
        </div>
      </td>
      {!showPageMeta && (
        <td className="px-2 sm:px-3 py-3 hidden lg:table-cell">
          <div className="text-xs text-gray-700 font-mono break-all">
            {item.seo_name || "—"}
          </div>
        </td>
      )}
      <td className="px-2 sm:px-3 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <a
            href={getLinktreeUrl(publicIdentifier)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-600 hover:text-slate-700 font-mono underline decoration-slate-400 hover:decoration-slate-600 transition-colors duration-200 break-all"
            onClick={(e) => {
              e.preventDefault();
              handleView(publicIdentifier);
            }}
          >
            {publicPathPrefix}/{publicIdentifier}
          </a>
          <Tooltip content={copiedUid === publicIdentifier ? "کۆپیکرا" : "کۆپیکردنی بەستەر"} side="top">
            <button
              onClick={(e) => onCopy(publicIdentifier, e)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-150 active:scale-90 shrink-0 cursor-pointer"
              aria-label="کۆپیکردنی بەستەر"
            >
              {copiedUid === publicIdentifier ? (
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </Tooltip>
        </div>
      </td>
      {showTraffic && (
        <td className="px-2 sm:px-3 py-3 hidden sm:table-cell">
          <div className="flex items-center gap-3">
            <Tooltip content={trafficLabels.views} side="top">
              <span className="inline-flex items-center gap-1 cursor-default">
                <Eye className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="text-xs font-bold text-gray-700">
                  {(item.analytics?.unique_views ?? 0).toLocaleString()}
                </span>
              </span>
            </Tooltip>
            <Tooltip content={trafficLabels.interactions} side="top">
              <span className="inline-flex items-center gap-1 cursor-default">
                <MousePointerClick className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="text-xs font-bold text-gray-700">
                  {(item.analytics?.unique_clicks ?? 0).toLocaleString()}
                </span>
              </span>
            </Tooltip>
          </div>
        </td>
      )}
      <td className="px-2 sm:px-3 py-3 hidden xl:table-cell">
        <div className="text-xs text-gray-600 wrap-break-word">
          {formatDate(item.created_at)}
        </div>
      </td>
      <td className="px-2 sm:px-3 py-3 hidden xl:table-cell">
        <div className="text-xs text-gray-600 wrap-break-word">
          {formatDate(item.updated_at)}
        </div>
      </td>
      <td className="px-2 sm:px-3 py-3">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-start">
          {onViewAnalytics && (
            <Tooltip content={viewActionLabel} side="top">
              <button
                onClick={() => onViewAnalytics(item.id, item.name)}
                className="p-1.5 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:text-sky-300 dark:hover:bg-sky-500/15 transition-all duration-150 active:scale-90 shrink-0 cursor-pointer"
                aria-label={viewActionLabel}
              >
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip content="دەستکاریکردن" side="top">
              <button
                onClick={() => onEdit(item.id)}
                className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-500/15 transition-all duration-150 active:scale-90 shrink-0 cursor-pointer"
                aria-label="دەستکاریکردن"
              >
                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </Tooltip>
          )}
          {onDuplicate && (
            <Tooltip content="لەبەرگرتنەوە" side="top">
              <button
                onClick={() => onDuplicate(item)}
                className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-500/15 transition-all duration-150 active:scale-90 shrink-0 cursor-pointer"
                aria-label="لەبەرگرتنەوە"
              >
                <CopyPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </Tooltip>
          )}
          {onToggleArchive && !item.is_default && (
            <Tooltip
              content={item.is_archived ? "گەڕاندنەوە لە ئەرشیف" : "ئەرشیفکردن"}
              side="top"
            >
              <button
                onClick={() => onToggleArchive(item.id, !item.is_archived)}
                className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 shrink-0 cursor-pointer ${
                  item.is_archived
                    ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/15"
                    : "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-500/15"
                }`}
                aria-label={item.is_archived ? "Restore from archive" : "Archive"}
              >
                {item.is_archived ? (
                  <ArchiveRestore className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <Archive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </button>
            </Tooltip>
          )}
          {onToggleStatus && !item.is_default && (
            <Tooltip
              content={
                item.status === "inactive"
                  ? "چالاککردنی پەڕە"
                  : "ناچالاککردنی پەڕە"
              }
              side="top"
            >
              <button
                onClick={() =>
                  onToggleStatus(
                    item.id,
                    item.status === "inactive" ? "active" : "inactive",
                  )
                }
                className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 shrink-0 cursor-pointer ${
                  item.status === "inactive"
                    ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/15"
                    : "hover:bg-rose-50 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/15"
                }`}
                aria-label={
                  item.status === "inactive" ? "Activate page" : "Deactivate page"
                }
              >
                {item.status === "inactive" ? (
                  <CirclePlay className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <CirclePause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </button>
            </Tooltip>
          )}
          {onDelete && item.uid !== "id" && !item.is_default && (
            <Tooltip content="سڕینەوە" side="top">
              <button
                onClick={() => onDelete(item.id, item.uid, item.name)}
                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/15 transition-all duration-150 active:scale-90 shrink-0 cursor-pointer"
                aria-label="سڕینەوە"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </td>
    </tr>
  );
});

// 2. Mobile-friendly card view defined OUTSIDE the parent component for react optimization
// Wrapped in React.memo to prevent garbage collection and unmounting/mounting overhead on parent render
const MobileCard = memo(function MobileCard({
  item,
  onEdit,
  onDuplicate,
  onDelete,
  onViewAnalytics,
  onToggleCampaign,
  onToggleArchive,
  onToggleStatus,
  copiedUid,
  onCopy,
  onView,
  formatDate,
  viewActionLabel,
  publicPathPrefix,
  showPageMeta,
  MetaBadgesComponent,
  trafficLabels,
}: {
  item: Linktree;
  onEdit?: (id: string) => void;
  onDuplicate?: (item: Linktree) => void;
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics?: (id: string, name: string) => void;
  onToggleCampaign?: (id: string, isCampaignActive: boolean) => void;
  onToggleArchive?: (id: string, isArchived: boolean) => void;
  onToggleStatus?: (id: string, status: "active" | "inactive") => void;
  copiedUid: string | null;
  onCopy: (uid: string, e: React.MouseEvent) => void;
  onView: (uid: string) => void;
  formatDate: (dateString: string) => string;
  viewActionLabel: string;
  publicPathPrefix: string;
  showPageMeta: boolean;
  MetaBadgesComponent: ComponentType<LinktreeMetaBadgesProps>;
  trafficLabels: PageListTrafficLabels;
}) {
  const publicIdentifier = getPublicIdentifier(item);
  const isCampaignActive = !!item.is_campaign_active;
  return (
    <div
      className={`${MANAGEMENT_TABLE_CARD_CLASS} ${
        isCampaignActive
          ? "bg-emerald-50/35 dark:bg-emerald-500/[0.04] hover:bg-emerald-50/55 dark:hover:bg-emerald-500/[0.07]"
          : ""
      }`}
      onClick={() => onView(publicIdentifier)}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "150px",
      }}
    >
      <div className="relative h-16 w-16 shrink-0">
        <div className="relative w-full h-full rounded-full overflow-hidden border border-gray-200">
          <Image
            src={
              item.image ||
              item.business_default_avatar ||
              item.business_logo ||
              "/images/DefaultAvatar.png"
            }
            alt={item.name}
            fill
            className="object-cover"
            sizes="64px"
            quality={80}
            unoptimized
          />
        </div>
        {isCampaignActive && (
          <span
            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
            title="کەمپەین چالاکە"
          />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-base font-semibold text-gray-900 leading-tight wrap-break-word block mb-1">
              {item.name}
            </span>
            <div className="text-xs text-gray-600 wrap-break-word line-clamp-2">
              {item.subtitle || "—"}
            </div>
            <MetaBadgesComponent
              item={item}
              showAgeBadge={showPageMeta}
              showTemplate={showPageMeta}
              onToggleCampaign={onToggleCampaign}
              className="mt-1.5"
            />
          </div>
          <div className="flex items-center gap-1">
            {onViewAnalytics && (
              <Tooltip content={viewActionLabel} side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewAnalytics(item.id, item.name);
                  }}
                  className="flex items-center justify-center p-2 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:text-sky-300 dark:hover:bg-sky-500/15 transition-all duration-150 active:scale-90 cursor-pointer"
                  aria-label={viewActionLabel}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip content="دەستکاریکردن" side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item.id);
                  }}
                  className="flex items-center justify-center p-2 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-500/15 transition-all duration-150 active:scale-90 cursor-pointer"
                  aria-label="دەستکاریکردن"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            {onDuplicate && (
              <Tooltip content="لەبەرگرتنەوە" side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(item);
                  }}
                  className="flex items-center justify-center p-2 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-500/15 transition-all duration-150 active:scale-90 cursor-pointer"
                  aria-label="لەبەرگرتنەوە"
                >
                  <CopyPlus className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            {onToggleArchive && !item.is_default && (
              <Tooltip content={item.is_archived ? "هێنانەدەرەوە لە ئەرشیف" : "ئەرشیفکردن"} side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleArchive(item.id, !item.is_archived);
                  }}
                  className={`flex items-center justify-center p-2 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
                    item.is_archived
                      ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/15"
                      : "hover:bg-purple-50 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-500/15"
                  }`}
                  aria-label={item.is_archived ? "هێنانەدەرەوە لە ئەرشیف" : "ئەرشیفکردن"}
                >
                  {item.is_archived ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </button>
              </Tooltip>
            )}
            {onToggleStatus && !item.is_default && (
              <Tooltip
                content={
                  item.status === "inactive"
                    ? "چالاککردنی پەڕە"
                    : "ناچالاککردنی پەڕە"
                }
                side="top"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(
                      item.id,
                      item.status === "inactive" ? "active" : "inactive",
                    );
                  }}
                  className={`flex items-center justify-center p-2 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
                    item.status === "inactive"
                      ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/15"
                      : "hover:bg-rose-50 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/15"
                  }`}
                  aria-label={
                    item.status === "inactive" ? "چالاککردن" : "ناچالاککردن"
                  }
                >
                  {item.status === "inactive" ? (
                    <CirclePlay className="h-4 w-4" />
                  ) : (
                    <CirclePause className="h-4 w-4" />
                  )}
                </button>
              </Tooltip>
            )}
            {onDelete && item.uid !== "id" && !item.is_default && (
              <Tooltip content="سڕینەوە" side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id, item.uid, item.name);
                  }}
                  className="flex items-center justify-center p-2 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/15 transition-all duration-150 active:scale-90 cursor-pointer"
                  aria-label="سڕینەوە"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
          <Tooltip content={copiedUid === publicIdentifier ? "کۆپیکرا" : "کۆپیکردنی بەستەر"} side="top">
            <button
              onClick={(e) => onCopy(publicIdentifier, e)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="کۆپیکردنی بەستەر"
            >
              {copiedUid === publicIdentifier ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-gray-500" />
              )}
              <span className="font-mono text-gray-700">
                {publicPathPrefix}/{publicIdentifier}
              </span>
            </button>
          </Tooltip>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-gray-600 bg-gray-50">
            دروستکراوە {formatDate(item.created_at)}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-gray-600 bg-gray-50">
            نوێکراوە {formatDate(item.updated_at)}
          </span>
          {showPageMeta && item.analytics && (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
              <Tooltip content={trafficLabels.views} side="top">
                <span className="inline-flex items-center gap-1 cursor-default">
                  <Eye className="h-3.5 w-3.5 text-gray-400" />
                  {item.analytics.unique_views.toLocaleString()}
                </span>
              </Tooltip>
              <Tooltip content={trafficLabels.interactions} side="top">
                <span className="inline-flex items-center gap-1 cursor-default">
                  <MousePointerClick className="h-3.5 w-3.5 text-gray-400" />
                  {item.analytics.unique_clicks.toLocaleString()}
                </span>
              </Tooltip>
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export const LinktreesTable = memo(function LinktreesTable({
  publicPathPrefix = "/linktree",
  data = [],
  isLoading = false,
  onEdit,
  onDuplicate,
  onDelete,
  onViewAnalytics,
  viewActionLabel = "ئامار",
  emptyTitle = "هیچ داتایەک نەدۆزرایەوە",
  emptyDescription = "هیچ داتایەک بۆ پیشاندان نییە.",
  pagination = { mode: "client" },
  showLinktreeMeta = false,
  showPageMeta,
  MetaBadgesComponent = LinktreeMetaBadges,
  trafficLabels = LINKTREE_TRAFFIC_LABELS,
  onToggleCampaign,
  onToggleArchive,
  onToggleStatus,
}: LinktreesTableProps) {
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const displaysPageMeta = showPageMeta ?? showLinktreeMeta;

  // The optional slug and traffic columns are table-level decisions so every
  // body row remains aligned with the header, even when one row has no totals.
  const showTraffic = displaysPageMeta && data.some((item) => item.analytics);
  const columns = buildColumns(displaysPageMeta, showTraffic, trafficLabels);

  const formatDateString = useCallback((dateString: string) => {
    return formatDate(dateString);
  }, []);

  const handleCopyUrl = useCallback(
    async (uid: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const url = getAbsoluteUrl(uid, publicPathPrefix);
      const success = await copyToClipboard(url);
      if (success) {
        setCopiedUid(uid);
        setTimeout(() => {
          setCopiedUid(null);
        }, 2000);
        toast.success("بەستەرەکە کۆپی کرا");
      } else {
        toast.error("کۆپیکردنی بەستەر سەرکەوتوو نەبوو");
      }
    },
    [publicPathPrefix],
  );

  const handleView = useCallback(
    (uid: string) => {
      const url = getAbsoluteUrl(uid, publicPathPrefix);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [publicPathPrefix],
  );

  const handleDelete = useCallback(
    (id: string, uid: string, name: string) => {
      if (uid === "id") {
        return;
      }
      if (onDelete) {
        onDelete(id, uid, name);
      }
    },
    [onDelete],
  );

  return (
    <ManagementTable
      data={data}
      columns={columns}
      getRowKey={(item) => item.id}
      isLoading={isLoading}
      minWidth="min-w-180"
      pagination={pagination}
      empty={{
        icon: LinkIcon,
        title: emptyTitle,
        description: emptyDescription,
      }}
      renderRow={(item) => (
        <TableRow
          item={item}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={handleDelete}
          onViewAnalytics={onViewAnalytics}
          onToggleCampaign={onToggleCampaign}
          onToggleArchive={onToggleArchive}
          onToggleStatus={onToggleStatus}
          copiedUid={copiedUid}
          onCopy={handleCopyUrl}
          formatDate={formatDateString}
          viewActionLabel={viewActionLabel}
          publicPathPrefix={publicPathPrefix}
          showPageMeta={displaysPageMeta}
          showTraffic={showTraffic}
          MetaBadgesComponent={MetaBadgesComponent}
          trafficLabels={trafficLabels}
        />
      )}
      renderCard={(item) => (
        <MobileCard
          item={item}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={handleDelete}
          onViewAnalytics={onViewAnalytics}
          onToggleCampaign={onToggleCampaign}
          onToggleArchive={onToggleArchive}
          onToggleStatus={onToggleStatus}
          copiedUid={copiedUid}
          onCopy={handleCopyUrl}
          onView={handleView}
          formatDate={formatDateString}
          viewActionLabel={viewActionLabel}
          publicPathPrefix={publicPathPrefix}
          showPageMeta={displaysPageMeta}
          MetaBadgesComponent={MetaBadgesComponent}
          trafficLabels={trafficLabels}
        />
      )}
    />
  );
});
