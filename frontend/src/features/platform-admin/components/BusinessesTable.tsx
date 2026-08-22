"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { Edit, Trash2, Eye, ShieldCheck, LogIn } from "lucide-react";
import {
  ManagementTable,
  MANAGEMENT_TABLE_CARD_CLASS,
  MANAGEMENT_TABLE_ROW_CLASS,
  hideBelowClass,
  type ManagementTableColumn,
  type ManagementTablePagination,
} from "@/components/shared/ManagementTable";
import { formatDate, getRootDomain } from "@/lib/utils/linktree-utils";
import type { PlatformBusiness as Business } from "@linktree/types";
import { BusinessMetaBadges } from "@/features/platform-admin/components/BusinessMetaBadges";

interface BusinessesTableProps {
  data?: Business[];
  isLoading?: boolean;
  pagination?: ManagementTablePagination;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
  onOpenDashboard?: (business: Business) => void;
}

/**
 * Header and cell hiding come from one list, so a column that disappears at a
 * breakpoint cannot take its header with it and shear the row.
 */
const COLUMNS: ManagementTableColumn[] = [
  { key: "avatar", width: "w-14" },
  { key: "name", header: "ناو" },
  { key: "contact", header: "بەکارهێنەر / پەیوەندی" },
  { key: "subdomain", header: "سەب دۆمەین", width: "w-48", hideBelow: "lg" },
  { key: "meta", header: "ڕەوشت / پلان", width: "w-64" },
  {
    key: "dates",
    header: "دروستکراوە / نوێکراوە",
    width: "w-28",
    hideBelow: "xl",
  },
  { key: "actions", header: "کارەکان", width: "w-28" },
];

function AvatarCell({ item }: { item: Business }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = item.logo || item.default_avatar;

  return (
    <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-gray-200 mx-auto">
      {avatarUrl && !imgError ? (
        <Image
          src={avatarUrl}
          alt={item.name}
          fill
          sizes="(min-width: 640px) 40px, 32px"
          unoptimized
          onError={() => setImgError(true)}
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs sm:text-sm font-bold text-white">
          {item.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

const TableRow = memo(function TableRow({
  item,
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
  onOpenDashboard,
}: {
  item: Business;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
  onOpenDashboard?: (business: Business) => void;
}) {
  return (
    <tr
      className={MANAGEMENT_TABLE_ROW_CLASS}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "90px",
      }}
    >
      <td className="px-3 py-3">
        <AvatarCell item={item} />
      </td>
      <td className="px-3 py-3">
        <div className="text-sm font-medium text-gray-900 truncate">
          {item.name}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="text-xs text-gray-600 truncate">
          @{item.username}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-400 truncate" title={item.email?.trim() || "—"}>
          {item.email?.trim() || "—"}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-gray-400 truncate">
          {item.phone?.trim() || "—"}
        </div>
      </td>
      <td className={`px-3 py-3 ${hideBelowClass("lg")}`}>
        {item.subdomain ? (
          <div className="text-xs text-gray-600 font-mono truncate">
            {item.subdomain}.{getRootDomain()}
          </div>
        ) : (
          <div className="text-xs text-gray-400">—</div>
        )}
      </td>
      <td className="px-3 py-3">
        <BusinessMetaBadges item={item} />
      </td>
      <td className={`px-3 py-3 ${hideBelowClass("xl")}`}>
        <div className="text-xs text-gray-600">
          {formatDate(item.created_at)}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-400">
          {formatDate(item.updated_at)}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-start">
          {onViewAnalytics && (
            <button
              onClick={() => onViewAnalytics(item)}
              className="p-1 sm:p-1.5 rounded hover:bg-sky-50 transition-colors duration-200 shrink-0 cursor-pointer"
              title="بینینی ئامار"
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-600 hover:text-sky-700" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="p-1 sm:p-1.5 rounded hover:bg-yellow-50 transition-colors duration-200 shrink-0 cursor-pointer"
              title="دەستکاریکردن"
            >
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 hover:text-yellow-700" />
            </button>
          )}
          {onOpenDashboard && item.subdomain && item.status === "active" && (
            <button
              onClick={() => onOpenDashboard(item)}
              className="p-1 sm:p-1.5 rounded hover:bg-indigo-50 transition-colors duration-200 shrink-0 cursor-pointer"
              title="Open dashboard as this business"
              aria-label={`Open the dashboard as ${item.name}`}
            >
              <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 hover:text-indigo-700" />
            </button>
          )}
          {onManageSessions && (
            <button onClick={() => onManageSessions(item)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-emerald-50 transition-colors duration-200 shrink-0 cursor-pointer sm:h-9 sm:w-9" title="Manage sessions" aria-label={`Manage sessions for ${item.name}`}>
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item.id, item.name)}
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

const MobileCard = memo(function MobileCard({
  item,
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
  onOpenDashboard,
}: {
  item: Business;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
  onOpenDashboard?: (business: Business) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = item.logo || item.default_avatar;

  return (
    <div
      className={MANAGEMENT_TABLE_CARD_CLASS}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "175px",
      }}
    >
      <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden border border-gray-200">
        {avatarUrl && !imgError ? (
          <Image src={avatarUrl} alt={item.name} fill sizes="56px" unoptimized onError={() => setImgError(true)} className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">{item.name.charAt(0).toUpperCase()}</div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-base font-semibold text-gray-900 leading-tight truncate">{item.name}</div>
            <div className="text-xs text-gray-600 truncate mt-0.5">@{item.username}</div>
            <div className="mt-0.5 text-[11px] text-gray-400 truncate">{item.email?.trim() || "—"}</div>
            <div className="mt-0.5 font-mono text-[11px] text-gray-400 truncate">{item.phone?.trim() || "—"}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onViewAnalytics && <button onClick={() => onViewAnalytics(item)} className="flex items-center justify-center p-2 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"><Eye className="h-4 w-4 text-sky-600" /></button>}
            {onEdit && <button onClick={() => onEdit(item)} className="flex items-center justify-center p-2 rounded-lg hover:bg-yellow-50 transition-colors cursor-pointer"><Edit className="h-4 w-4 text-yellow-600" /></button>}
            {onOpenDashboard && item.subdomain && item.status === "active" && <button onClick={() => onOpenDashboard(item)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer" title="Open dashboard as this business" aria-label={`Open the dashboard as ${item.name}`}><LogIn className="h-4 w-4 text-indigo-600" /></button>}
            {onManageSessions && <button onClick={() => onManageSessions(item)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer" title="Manage sessions" aria-label={`Manage sessions for ${item.name}`}><ShieldCheck className="h-4 w-4 text-emerald-600" /></button>}
            {onDelete && <button onClick={() => onDelete(item.id, item.name)} className="flex items-center justify-center p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><Trash2 className="h-4 w-4 text-red-600" /></button>}
          </div>
        </div>
        <BusinessMetaBadges item={item} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
          {item.subdomain ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 font-mono text-gray-700">
              {item.subdomain}.{getRootDomain()}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 font-mono text-gray-400">
              no-subdomain
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
            دروستکراوە {formatDate(item.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
});

export const BusinessesTable = memo(function BusinessesTable({
  data = [],
  isLoading = false,
  pagination,
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
  onOpenDashboard,
}: BusinessesTableProps) {
  return (
    <ManagementTable
      data={data}
      columns={COLUMNS}
      getRowKey={(item) => item.id}
      isLoading={isLoading}
      pagination={pagination}
      renderRow={(item) => (
        <TableRow
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAnalytics={onViewAnalytics}
          onManageSessions={onManageSessions}
          onOpenDashboard={onOpenDashboard}
        />
      )}
      renderCard={(item) => (
        <MobileCard
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAnalytics={onViewAnalytics}
          onManageSessions={onManageSessions}
          onOpenDashboard={onOpenDashboard}
        />
      )}
    />
  );
});
