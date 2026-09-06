"use client";

import {
  memo,
  useCallback,
  useState,
  useMemo,
  type ComponentType,
} from "react";
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
  ExternalLink,
  Link as LinkIcon,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils/clipboard";
import { formatDate, getAbsoluteUrl } from "@/lib/utils/linktree-utils";
import {
  LINKTREE_TRAFFIC_LABELS,
  LinktreeCampaignButton,
  LinktreeMetaBadges,
  LinktreeMetaField,
  type LinktreeMetaBadgesProps,
  type PageListTrafficLabels,
} from "@/components/business/LinktreeMeta";
import { SkeletonLinktreeGrid } from "@/components/shared/SkeletonPageLayouts";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tooltip } from "@/components/shared/Tooltip";
import {
  useManagementPagination,
  type ManagementTablePagination,
} from "@/components/shared/ManagementTable";
import type { LinktreeListItem as Linktree } from "@linktree/types";

interface LinktreesGridProps {
  publicPathPrefix?: string;
  data?: Linktree[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDuplicate?: (item: Linktree) => void;
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics?: (id: string, name: string) => void;
  viewActionLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * Opt in when `data` holds real Linktree records. It unlocks the fields that
   * only that projection fills in: slug, creation and update dates, template
   * and the age badge.
   */
  showLinktreeMeta?: boolean;
  /**
   * Enables the complete shared public-page card treatment for another page
   * domain without pretending that its metadata belongs to a Linktree.
   */
  showPageMeta?: boolean;
  MetaBadgesComponent?: ComponentType<LinktreeMetaBadgesProps>;
  trafficLabels?: PageListTrafficLabels;
  pagination?: ManagementTablePagination;
  onToggleCampaign?: (id: string, isCampaignActive: boolean) => void;
  onToggleArchive?: (id: string, isArchived: boolean) => void;
  onToggleStatus?: (id: string, status: "active" | "inactive") => void;
}

function getPublicIdentifier(item: Linktree): string {
  return item.public_identifier?.trim() || item.seo_name?.trim() || item.uid;
}

// Memoized card component for better performance
const LinktreeCard = memo(function LinktreeCard({
  item,
  index,
  total,
  onEdit,
  onDuplicate,
  onDelete,
  onViewAnalytics,
  onToggleCampaign,
  onToggleArchive,
  onToggleStatus,
  viewActionLabel,
  copiedUid,
  onCopy,
  publicPathPrefix,
  showPageMeta,
  MetaBadgesComponent,
  trafficLabels,
}: {
  item: Linktree;
  index: number;
  total: number;
  onEdit?: (id: string) => void;
  onDuplicate?: (item: Linktree) => void;
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics?: (id: string, name: string) => void;
  onToggleCampaign?: (id: string, isCampaignActive: boolean) => void;
  onToggleArchive?: (id: string, isArchived: boolean) => void;
  onToggleStatus?: (id: string, status: "active" | "inactive") => void;
  viewActionLabel: string;
  copiedUid: string | null;
  onCopy: (uid: string, e: React.MouseEvent) => void;
  publicPathPrefix: string;
  showPageMeta: boolean;
  MetaBadgesComponent: ComponentType<LinktreeMetaBadgesProps>;
  trafficLabels: PageListTrafficLabels;
}) {
  const publicIdentifier = getPublicIdentifier(item);
  const url = useMemo(
    () => getAbsoluteUrl(publicIdentifier, publicPathPrefix),
    [publicIdentifier, publicPathPrefix],
  );
  const borderClasses = [
    index !== total - 1 ? "border-b border-slate-100 dark:border-white/5" : "",
    index % 2 === 0 ? "lg:border-r lg:border-b-0" : "lg:border-r-0",
    index < total - (total % 2 === 0 ? 2 : 1) ? "lg:border-b" : "lg:border-b-0",
    index % 3 !== 2 ? "xl:border-r xl:border-b-0" : "xl:border-r-0",
    index < total - (total % 3 === 0 ? 3 : total % 3)
      ? "xl:border-b"
      : "xl:border-b-0",
  ].join(" ");

  const handleView = useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, [url]);

  const isCampaignActive = !!item.is_campaign_active;

  return (
    <div
      className={`group relative flex h-full flex-col p-4 sm:p-5 md:p-6 transition-all duration-300 transform-gpu bg-transparent hover:bg-slate-50/50 dark:hover:bg-white/5 ${borderClasses}`}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "320px",
      }}
    >
      {/* Top right Campaign button */}
      {!item.is_archived && (onToggleCampaign || isCampaignActive) && (
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-10">
          <LinktreeCampaignButton
            id={item.id}
            isActive={isCampaignActive}
            onToggle={onToggleCampaign}
          />
        </div>
      )}

      {/* Header Section */}
      <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="relative shrink-0">
          <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
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
              sizes="(max-width: 640px) 64px, 80px"
              quality={75}
              unoptimized
            />
          </div>
          {isCampaignActive && (
            <span
              className="absolute bottom-0 right-0 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
              title="کەمپەین چالاکە"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 pr-20 sm:pr-24">
          <h3 className="text-xs sm:text-base font-bold text-gray-900 truncate mb-0.5 sm:mb-1">
            {item.name}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-2 mb-1 sm:mb-1.5">
            {item.subtitle?.trim() || "—"}
          </p>
          <MetaBadgesComponent
            item={item}
            showAgeBadge={showPageMeta}
            showTemplate={showPageMeta}
            onToggleCampaign={onToggleCampaign}
            hideCampaignBadge={true}
          />
        </div>
      </div>

      <p className="mb-2 line-clamp-2 text-xs text-gray-500 sm:mb-3">
        {item.description?.trim() || "—"}
      </p>

      {/* URL Section */}
      <div className="mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
          <LinkIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            URL
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              handleView();
            }}
            className="flex-1 text-xs text-gray-700 hover:text-gray-900 font-mono truncate underline decoration-gray-300 hover:decoration-gray-500 transition-colors"
          >
            {url}
          </a>
          <Tooltip content={copiedUid === publicIdentifier ? "کۆپیکرا" : "کۆپیکردنی بەستەر"} side="top">
            <button
              onClick={(e) => onCopy(publicIdentifier, e)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
              aria-label="کۆپیکردنی بەستەر"
            >
              {copiedUid === publicIdentifier ? (
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Details Section */}
      {showPageMeta && (
        <div className="mb-2 grid grid-cols-2 gap-2 sm:mb-3">
          <LinktreeMetaField
            label="دروستکراوە"
            value={formatDate(item.created_at)}
          />
          <LinktreeMetaField
            label="نوێکراوە"
            value={formatDate(item.updated_at)}
          />
        </div>
      )}

      {/* Traffic Section */}
      {showPageMeta && item.analytics && (
        <div className="mb-2 grid grid-cols-2 gap-2 sm:mb-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5 px-2 py-1.5 transition-colors">
            <Eye className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
              {item.analytics.unique_views.toLocaleString()}
            </span>
            <span className="truncate text-[10px] text-gray-500 dark:text-gray-400">
              {trafficLabels.views}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5 px-2 py-1.5 transition-colors">
            <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
              {item.analytics.unique_clicks.toLocaleString()}
            </span>
            <span className="truncate text-[10px] text-gray-500 dark:text-gray-400">
              {trafficLabels.interactions}
            </span>
          </div>
        </div>
      )}

      {/* Actions Section */}
      <div className="mt-auto flex items-center gap-1 sm:gap-1.5 pt-2 sm:pt-2.5 border-t border-gray-200">
        {onViewAnalytics && (
          <Tooltip content={viewActionLabel} side="top" className="flex-1 min-w-0">
            <button
              onClick={() => onViewAnalytics(item.id, item.name)}
              className="w-full flex items-center justify-center gap-1 px-1.5 sm:px-2 h-7.5 sm:h-8 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-700 hover:text-sky-800 transition-all duration-200 text-[10px] sm:text-[11px] font-medium cursor-pointer min-w-0"
              aria-label={viewActionLabel}
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{viewActionLabel}</span>
            </button>
          </Tooltip>
        )}
        {onEdit && (
          <Tooltip content="دەستکاری" side="top" className="flex-1 min-w-0">
            <button
              onClick={() => onEdit(item.id)}
              className="w-full flex items-center justify-center gap-1 px-1.5 sm:px-2 h-7.5 sm:h-8 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-700 hover:text-yellow-800 transition-all duration-200 text-[10px] sm:text-[11px] font-medium cursor-pointer min-w-0"
              aria-label="دەستکاری"
            >
              <Edit className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">دەستکاری</span>
            </button>
          </Tooltip>
        )}
        {onDuplicate && (
          <Tooltip content="لەبەرگرتنەوە" side="top">
            <button
              onClick={() => onDuplicate(item)}
              className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer hover:brightness-95"
              style={{
                background: "color-mix(in srgb, var(--theme-primary, #6366f1) 12%, transparent)",
                borderColor: "color-mix(in srgb, var(--theme-primary, #6366f1) 28%, transparent)",
                color: "var(--theme-primary, #6366f1)",
              }}
              aria-label="لەبەرگرتنەوە"
            >
              <CopyPlus className="h-3.5 w-3.5" />
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
              className={`flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer ${
                item.is_archived
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                  : "bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/30 text-slate-600 hover:text-slate-800 dark:text-gray-300"
              }`}
              aria-label={item.is_archived ? "Restore from archive" : "Archive"}
            >
              {item.is_archived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
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
              className={`flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer ${
                item.status === "inactive"
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-700 hover:text-rose-800 dark:text-rose-300"
              }`}
              aria-label={
                item.status === "inactive" ? "Activate page" : "Deactivate page"
              }
            >
              {item.status === "inactive" ? (
                <CirclePlay className="h-3.5 w-3.5" />
              ) : (
                <CirclePause className="h-3.5 w-3.5" />
              )}
            </button>
          </Tooltip>
        )}
        {onDelete && item.uid !== "id" && !item.is_default && (
          <Tooltip content="سڕینەوە" side="top">
            <button
              onClick={() => onDelete(item.id, item.uid, item.name)}
              className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-700 hover:text-red-800 transition-all duration-200 cursor-pointer"
              aria-label="سڕینەوە"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}
        <Tooltip content="بینینی پەڕە" side="top">
          <button
            onClick={handleView}
            className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-700 transition-all duration-200 cursor-pointer"
            aria-label="بینین"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
});

export const LinktreesGrid = memo(function LinktreesGrid({
  publicPathPrefix = "/linktree",
  data = [],
  isLoading = false,
  onEdit,
  onDuplicate,
  onDelete,
  onViewAnalytics,
  viewActionLabel = "ئامار",
  emptyTitle = "هیچ پەیجەک نەدۆزرایەوە",
  emptyDescription = "دەست پێ بکە بە دروستکردنی پەیج یەکەم",
  showLinktreeMeta = false,
  showPageMeta,
  MetaBadgesComponent = LinktreeMetaBadges,
  trafficLabels = LINKTREE_TRAFFIC_LABELS,
  pagination = { mode: "client" },
  onToggleCampaign,
  onToggleArchive,
  onToggleStatus,
}: LinktreesGridProps) {
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const displaysPageMeta = showPageMeta ?? showLinktreeMeta;
  // Paged on the same terms as the table, so the view toggle no longer changes
  // how many records the reader is looking at.
  const { visibleData, footer } = useManagementPagination(data, pagination);

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

  // Cards outlined where the real ones will land, so the grid does not jump
  // when they arrive.
  if (isLoading)
    return <SkeletonLinktreeGrid count={6} showPageMeta={displaysPageMeta} />;

  if (data.length === 0) {
    return (
      <EmptyState
        icon={LinkIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div dir="ltr">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-0">
        {visibleData.map((item, index) => (
          <LinktreeCard
            key={item.id}
            item={item}
            index={index}
            total={visibleData.length}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={handleDelete}
            onViewAnalytics={onViewAnalytics}
            onToggleCampaign={onToggleCampaign}
            onToggleArchive={onToggleArchive}
            onToggleStatus={onToggleStatus}
            viewActionLabel={viewActionLabel}
            copiedUid={copiedUid}
            onCopy={handleCopyUrl}
            publicPathPrefix={publicPathPrefix}
            showPageMeta={displaysPageMeta}
            MetaBadgesComponent={MetaBadgesComponent}
            trafficLabels={trafficLabels}
          />
        ))}
      </div>
      {footer}
    </div>
  );
});
