"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { Edit, Trash2, Eye, Globe, ShieldCheck, LogIn, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useManagementPagination,
  type ManagementTablePagination,
} from "@/components/shared/ManagementTable";
import { formatDate, getRootDomain } from "@/lib/utils/linktree-utils";
import type { PlatformBusiness as Business } from "@linktree/types";
import {
  BusinessMetaBadges,
  BusinessMetaField,
} from "@/features/platform-admin/components/BusinessMetaBadges";
import { Tooltip } from "@/components/shared/Tooltip";

interface BusinessesGridProps {
  data?: Business[];
  pagination?: ManagementTablePagination;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
  onOpenDashboard?: (business: Business) => void;
}

const BusinessCard = memo(function BusinessCard({
  item,
  index,
  total,
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
  onOpenDashboard,
}: {
  item: Business;
  index: number;
  total: number;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
  onOpenDashboard?: (business: Business) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = item.logo || item.default_avatar;

  const borderClasses = [
    index !== total - 1 ? "border-b border-slate-100 dark:border-white/5" : "",
    index % 2 === 0 ? "lg:border-r lg:border-b-0" : "lg:border-r-0",
    index < total - (total % 2 === 0 ? 2 : 1) ? "lg:border-b" : "lg:border-b-0",
    index % 3 !== 2 ? "xl:border-r xl:border-b-0" : "xl:border-r-0",
    index < total - (total % 3 === 0 ? 3 : total % 3)
      ? "xl:border-b"
      : "xl:border-b-0",
  ].join(" ");

  return (
    <div
      className={`group relative flex h-full flex-col bg-transparent p-4 sm:p-5 md:p-6 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all duration-300 transform-gpu ${borderClasses}`}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "330px",
      }}
    >
      {/* Header Section */}
      <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-gray-200 shrink-0 shadow-sm">
          {avatarUrl && !imgError ? (
            <Image
              src={avatarUrl}
              alt={item.name}
              fill
              sizes="(min-width: 640px) 56px, 40px"
              unoptimized
              onError={() => setImgError(true)}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm sm:text-lg font-bold text-white">
              {item.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-base font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">
            {item.name}
          </h3>
          <p className="text-xs text-gray-600 truncate">
            @{item.username}
          </p>
          <BusinessMetaBadges item={item} className="mt-1.5" />
        </div>
      </div>

      {/* Subdomain Section */}
      <div className="mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0">سەب دۆمەین</span>
          <span className="text-xs text-gray-700 font-mono truncate">{item.subdomain ? `${item.subdomain}.${getRootDomain()}` : "دیاری نەکراوە"}</span>
        </div>
      </div>

      {/* Details Section */}
      <div className="mb-2 grid grid-cols-2 gap-2 sm:mb-3">
        <BusinessMetaField label="ئیمەیڵ" value={item.email?.trim() || "—"} />
        <BusinessMetaField label="مۆبایل" value={item.phone?.trim() || "—"} mono />
        <BusinessMetaField label="دروستکراوە" value={formatDate(item.created_at)} />
        <BusinessMetaField label="نوێکراوە" value={formatDate(item.updated_at)} />
      </div>

      {/* Actions Section */}
      <div className="mt-auto flex items-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-200">
        {onViewAnalytics && (
          <Tooltip content="بینینی ئامار" side="top" className="flex-1">
            <button
              type="button"
              onClick={() => onViewAnalytics(item)}
              className="w-full flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-700 hover:text-sky-800 transition-all duration-200 text-xs font-medium cursor-pointer"
              title="بینینی ئامار"
              aria-label={`بینینی ئاماری ${item.name}`}
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden lg:inline text-xs">ئامار</span>
            </button>
          </Tooltip>
        )}
        {onEdit && (
          <Tooltip content="دەستکاریکردن" side="top" className="flex-1">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="w-full flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-700 hover:text-yellow-800 transition-all duration-200 text-xs font-medium cursor-pointer"
              title="دەستکاریکردن"
              aria-label={`دەستکاریکردنی ${item.name}`}
            >
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden lg:inline text-xs">دەستکاریکردن</span>
            </button>
          </Tooltip>
        )}
        {onManageSessions && (
          <Tooltip content="بەڕێوەبردنی دانیشتنەکان" side="top">
            <button
              type="button"
              onClick={() => onManageSessions(item)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 transition-all duration-200 cursor-pointer dark:text-emerald-300"
              title="Manage sessions"
              aria-label={`Manage sessions for ${item.name}`}
            >
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </Tooltip>
        )}
        {onOpenDashboard && item.subdomain && item.status === "active" && (
          <Tooltip content="چوونە ناو داشبۆرد وەک ئەم بزنسە" side="top">
            <button
              type="button"
              onClick={() => onOpenDashboard(item)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 hover:text-indigo-800 transition-all duration-200 cursor-pointer"
              title="Open dashboard as this business"
              aria-label={`Open the dashboard as ${item.name}`}
            >
              <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip content="سڕینەوە" side="top">
            <button
              type="button"
              onClick={() => onDelete(item.id, item.name)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-700 hover:text-red-800 transition-all duration-200 cursor-pointer"
              title="سڕینەوە"
              aria-label={`سڕینەوەی ${item.name}`}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
});

export const BusinessesGrid = memo(function BusinessesGrid({
  data = [],
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
  onOpenDashboard,
  pagination,
}: BusinessesGridProps) {
  // Paged on the same terms as the table, so the view toggle no longer changes
  // how many records the reader is looking at.
  const { visibleData, footer } = useManagementPagination(data, pagination);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="هیچ بزنسێک نەدۆزرایەوە"
        description="دەست پێ بکە بە دروستکردنی بزنسی یەکەم"
      />
    );
  }

  return (
    <div dir="ltr">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-0">
        {visibleData.map((item, index) => (
          <BusinessCard
            key={item.id}
            item={item}
            index={index}
            total={visibleData.length}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewAnalytics={onViewAnalytics}
            onManageSessions={onManageSessions}
            onOpenDashboard={onOpenDashboard}
          />
        ))}
      </div>
      {footer}
    </div>
  );
});
