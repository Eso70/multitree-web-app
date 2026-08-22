"use client";

import { memo, useCallback, useState, type ComponentType } from "react";
import Image from "next/image";
import {
  Trash2,
  Eye,
  Copy,
  Check,
  Edit,
  Link as LinkIcon,
  MousePointerClick,
} from "lucide-react";
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

interface LinktreesTableProps {
  publicPathPrefix?: string;
  data?: Linktree[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
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
  onDelete,
  onViewAnalytics,
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
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics?: (id: string, name: string) => void;
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

  return (
    <tr
      className={MANAGEMENT_TABLE_ROW_CLASS}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "80px",
      }}
    >
      <td className="px-2 sm:px-3 py-3">
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-gray-200 mx-auto">
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
      </td>
      <td className="px-2 sm:px-3 py-3">
        <div className="text-xs sm:text-sm font-medium text-gray-900 wrap-break-word">
          {item.name}
        </div>
        <MetaBadgesComponent
          item={item}
          showAgeBadge={showPageMeta}
          showTemplate={showPageMeta}
          className="mt-1"
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
          <button
            onClick={(e) => onCopy(publicIdentifier, e)}
            className="p-0.5 sm:p-1 rounded hover:bg-gray-100 transition-colors duration-200 shrink-0 cursor-pointer"
            title="کۆپیکردنی بەستەر"
          >
            {copiedUid === publicIdentifier ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-gray-500 hover:text-gray-700" />
            )}
          </button>
        </div>
      </td>
      {showTraffic && (
        <td className="px-2 sm:px-3 py-3 hidden sm:table-cell">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1"
              title={trafficLabels.views}
            >
              <Eye className="h-3 w-3 shrink-0 text-gray-400" />
              <span className="text-xs font-bold text-gray-700">
                {(item.analytics?.unique_views ?? 0).toLocaleString()}
              </span>
            </span>
            <span
              className="inline-flex items-center gap-1"
              title={trafficLabels.interactions}
            >
              <MousePointerClick className="h-3 w-3 shrink-0 text-gray-400" />
              <span className="text-xs font-bold text-gray-700">
                {(item.analytics?.unique_clicks ?? 0).toLocaleString()}
              </span>
            </span>
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
            <button
              onClick={() => onViewAnalytics(item.id, item.name)}
              className="p-1 sm:p-1.5 rounded hover:bg-sky-50 transition-colors duration-200 shrink-0 cursor-pointer"
              title={viewActionLabel}
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-600 hover:text-sky-700" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(item.id)}
              className="p-1 sm:p-1.5 rounded hover:bg-yellow-50 transition-colors duration-200 shrink-0 cursor-pointer"
              title="دەستکاریکردن"
            >
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 hover:text-yellow-700" />
            </button>
          )}
          {onDelete && item.uid !== "id" && !item.is_default && (
            <button
              onClick={() => onDelete(item.id, item.uid, item.name)}
              className="p-1 sm:p-1.5 rounded hover:bg-red-50 transition-colors duration-200 shrink-0 cursor-pointer"
              title="سڕینەوە"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 hover:text-red-700" />
            </button>
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
  onDelete,
  onViewAnalytics,
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
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics?: (id: string, name: string) => void;
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
  return (
    <div
      className={MANAGEMENT_TABLE_CARD_CLASS}
      onClick={() => onView(publicIdentifier)}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "150px",
      }}
    >
      <div className="relative h-16 w-16 rounded-full overflow-hidden border border-gray-200 shrink-0">
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
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-semibold text-gray-900 leading-tight wrap-break-word">
              {item.name}
            </div>
            <div className="text-xs text-gray-600 wrap-break-word line-clamp-2">
              {item.subtitle || "—"}
            </div>
            <MetaBadgesComponent
              item={item}
              showAgeBadge={showPageMeta}
              showTemplate={showPageMeta}
              className="mt-1.5"
            />
          </div>
          <div className="flex items-center gap-1">
            {onViewAnalytics && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAnalytics(item.id, item.name);
                }}
                className="flex items-center justify-center p-2 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
                title={viewActionLabel}
                aria-label={viewActionLabel}
              >
                <Eye className="h-4 w-4 text-sky-600" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item.id);
                }}
                className="flex items-center justify-center p-2 rounded-lg hover:bg-yellow-50 transition-colors cursor-pointer"
              >
                <Edit className="h-4 w-4 text-yellow-600" />
              </button>
            )}
            {onDelete && item.uid !== "id" && !item.is_default && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id, item.uid, item.name);
                }}
                className="flex items-center justify-center p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
          <button
            onClick={(e) => onCopy(publicIdentifier, e)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {copiedUid === publicIdentifier ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-gray-500" />
            )}
            <span className="font-mono">
              {publicPathPrefix}/{publicIdentifier}
            </span>
          </button>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-gray-600 bg-gray-50">
            دروستکراوە {formatDate(item.created_at)}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-gray-600 bg-gray-50">
            نوێکراوە {formatDate(item.updated_at)}
          </span>
          {showPageMeta && item.analytics && (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
              <span
                className="inline-flex items-center gap-1"
                title={trafficLabels.views}
              >
                <Eye className="h-3.5 w-3.5 text-gray-400" />
                {item.analytics.unique_views.toLocaleString()}
              </span>
              <span
                className="inline-flex items-center gap-1"
                title={trafficLabels.interactions}
              >
                <MousePointerClick className="h-3.5 w-3.5 text-gray-400" />
                {item.analytics.unique_clicks.toLocaleString()}
              </span>
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
          onDelete={handleDelete}
          onViewAnalytics={onViewAnalytics}
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
          onDelete={handleDelete}
          onViewAnalytics={onViewAnalytics}
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
