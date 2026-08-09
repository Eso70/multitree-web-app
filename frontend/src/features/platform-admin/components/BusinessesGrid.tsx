"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { Edit, Trash2, Eye, ExternalLink, Globe, ShieldCheck } from "lucide-react";
import { getRootDomain, getSubdomainLoginUrl } from "@/lib/utils/linktree-utils";
import type { PlatformBusiness as Business } from "@linktree/types";
import {
  getBusinessPlanBadgeClasses,
  getBusinessPlanLabel,
} from "@/features/platform-admin/utils/business-plan";

interface BusinessesGridProps {
  data?: Business[];
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
}

const BusinessCard = memo(function BusinessCard({
  item,
  index,
  total,
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
}: {
  item: Business;
  index: number;
  total: number;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = item.logo || item.default_avatar;

  const borderClasses = [
    index !== total - 1 ? "border-b border-slate-100 dark:border-white/5" : "",
    index % 2 === 0 ? "sm:border-r sm:border-b-0" : "sm:border-r-0",
    index < total - (total % 2 === 0 ? 2 : 1) ? "sm:border-b" : "sm:border-b-0",
  ].join(" ");

  return (
    <div
      className={`group relative bg-transparent p-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all duration-300 transform-gpu ${borderClasses}`}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "230px",
      }}
    >
      {onManageSessions && (
        <button
          type="button"
          onClick={() => onManageSessions(item)}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 sm:right-4 sm:top-4 sm:h-10 sm:w-10 sm:rounded-xl dark:text-emerald-300"
          title="Manage sessions"
          aria-label={`Manage sessions for ${item.name}`}
        >
          <ShieldCheck className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>
      )}

      {/* Header Section */}
      <div className={`flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 ${onManageSessions ? "pr-11 sm:pr-12" : ""}`}>
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
        </div>
      </div>

      {/* Status & Plan Section */}
      <div className="mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200 space-y-2">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0">سەب دۆمەین</span>
          <span className="text-xs text-gray-700 font-mono truncate">{item.subdomain ? `${item.subdomain}.${getRootDomain()}` : "دیاری نەکراوە"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
            item.status === "active"
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-red-50 text-red-600 border-red-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
            {item.status === "active" ? "چالاک" : "ڕاگیراو"}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getBusinessPlanBadgeClasses(item.plan)}`}>
            {getBusinessPlanLabel(item)}
          </span>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-3 border-t border-gray-200 sm:gap-2">
        {onViewAnalytics && (
          <button onClick={() => onViewAnalytics(item)} className="flex flex-1 items-center justify-center gap-1 rounded-lg sm:rounded-xl border border-sky-500/30 bg-sky-500/10 px-2 py-2 text-xs font-medium text-sky-700 hover:bg-sky-500/20 min-w-0 cursor-pointer" title="بینینی ئامار">
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /><span className="hidden sm:inline">ئامار</span>
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(item)} className="flex flex-1 items-center justify-center gap-1 rounded-lg sm:rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-2 py-2 text-xs font-medium text-yellow-700 hover:bg-yellow-500/20 min-w-0 cursor-pointer" title="دەستکاری">
            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /><span className="hidden sm:inline">دەستکاری</span>
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(item.id, item.name)} className="flex flex-1 items-center justify-center gap-1 rounded-lg sm:rounded-xl border border-red-500/30 bg-red-500/10 px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-500/20 min-w-0 cursor-pointer" title="سڕینەوە">
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /><span className="hidden sm:inline">سڕینەوە</span>
          </button>
        )}
        <button onClick={() => window.open(getSubdomainLoginUrl(item.subdomain), "_blank", "noopener,noreferrer")} className="flex items-center justify-center rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer" title="کردنەوە">
          <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        </button>
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
}: BusinessesGridProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px] text-center p-8">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center mb-4">
          <svg className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">هیچ بزنسێک نەدۆزرایەوە</h3>
        <p className="text-gray-500 text-sm">دەست پێ بکە بە دروستکردنی بزنسی یەکەم</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0" dir="ltr">
      {data.map((item, index) => (
        <BusinessCard
          key={item.id}
          item={item}
          index={index}
          total={data.length}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAnalytics={onViewAnalytics}
          onManageSessions={onManageSessions}
        />
      ))}
    </div>
  );
});
