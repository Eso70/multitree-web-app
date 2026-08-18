"use client";

import { memo, useCallback, useState, useMemo } from "react";
import Image from "next/image";
import {
  Trash2,
  Eye,
  Copy,
  Check,
  Edit,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils/clipboard";
import { formatDate, getAbsoluteUrl } from "@/lib/utils/linktree-utils";
import {
  LinktreeMetaBadges,
  LinktreeMetaField,
} from "@/components/business/LinktreeMeta";
import { SkeletonCardGrid } from "@/components/shared/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import type { LinktreeListItem as Linktree } from "@linktree/types";

interface LinktreesGridProps {
  publicPathPrefix?: string;
  data?: Linktree[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
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
  onDelete,
  onViewAnalytics,
  viewActionLabel,
  copiedUid,
  onCopy,
  publicPathPrefix,
  showLinktreeMeta,
}: {
  item: Linktree;
  index: number;
  total: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics?: (id: string, name: string) => void;
  viewActionLabel: string;
  copiedUid: string | null;
  onCopy: (uid: string, e: React.MouseEvent) => void;
  publicPathPrefix: string;
  showLinktreeMeta: boolean;
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

  return (
    <div
      className={`group relative flex h-full flex-col bg-transparent p-4 sm:p-5 md:p-6 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all duration-300 transform-gpu ${borderClasses}`}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "320px",
      }}
    >
      {/* Header Section */}
      <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-gray-200 shrink-0 shadow-sm">
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
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-base font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">
            {item.name}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-2 mb-1 sm:mb-1.5">
            {item.subtitle?.trim() || "—"}
          </p>
          <LinktreeMetaBadges
            item={item}
            showAgeBadge={showLinktreeMeta}
            showTemplate={showLinktreeMeta}
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
          <button
            onClick={(e) => onCopy(publicIdentifier, e)}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
            title="کۆپیکردنی بەستەر"
          >
            {copiedUid === publicIdentifier ? (
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Details Section */}
      {showLinktreeMeta && (
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

      {/* Actions Section */}
      <div className="mt-auto flex items-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-200">
        {onViewAnalytics && (
          <button
            onClick={() => onViewAnalytics(item.id, item.name)}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-700 hover:text-sky-800 transition-all duration-200 text-xs font-medium cursor-pointer"
            title={viewActionLabel}
          >
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline text-xs">{viewActionLabel}</span>
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(item.id)}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-700 hover:text-yellow-800 transition-all duration-200 text-xs font-medium cursor-pointer"
            title="دەستکاریکردن"
          >
            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline text-xs">دەستکاریکردن</span>
          </button>
        )}
        {onDelete && item.uid !== "id" && !item.is_default && (
          <button
            onClick={() => onDelete(item.id, item.uid, item.name)}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-700 hover:text-red-800 transition-all duration-200 text-xs font-medium cursor-pointer"
            title="سڕینەوە"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden lg:inline text-xs">سڕینەوە</span>
          </button>
        )}
        <button
          onClick={handleView}
          className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-700 transition-all duration-200 text-xs font-medium cursor-pointer"
          title="بینین"
        >
          <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
});

export const LinktreesGrid = memo(function LinktreesGrid({
  publicPathPrefix = "/linktree",
  data = [],
  isLoading = false,
  onEdit,
  onDelete,
  onViewAnalytics,
  viewActionLabel = "ئامار",
  emptyTitle = "هیچ پەیجەک نەدۆزرایەوە",
  emptyDescription = "دەست پێ بکە بە دروستکردنی پەیج یەکەم",
  showLinktreeMeta = false,
}: LinktreesGridProps) {
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

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
  if (isLoading) return <SkeletonCardGrid count={6} />;

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
    <div
      className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-0"
      dir="ltr"
    >
      {data.map((item, index) => (
        <LinktreeCard
          key={item.id}
          item={item}
          index={index}
          total={data.length}
          onEdit={onEdit}
          onDelete={handleDelete}
          onViewAnalytics={onViewAnalytics}
          viewActionLabel={viewActionLabel}
          copiedUid={copiedUid}
          onCopy={handleCopyUrl}
          publicPathPrefix={publicPathPrefix}
          showLinktreeMeta={showLinktreeMeta}
        />
      ))}
    </div>
  );
});
