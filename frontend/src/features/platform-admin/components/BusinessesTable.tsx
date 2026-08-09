"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { Edit, Trash2, Eye, ShieldCheck } from "lucide-react";
import { formatDate, getRootDomain, getSubdomainLoginUrl } from "@/lib/utils/linktree-utils";
import type { PlatformBusiness as Business } from "@linktree/types";
import {
  getBusinessPlanBadgeClasses,
  getBusinessPlanLabel,
} from "@/features/platform-admin/utils/business-plan";

interface BusinessesTableProps {
  data?: Business[];
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
}

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
}: {
  item: Business;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
}) {
  return (
    <tr
      className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors duration-200 transform-gpu"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "65px",
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
      <td className="px-3 py-3 hidden sm:table-cell">
        <div className="text-xs text-gray-600 truncate">
          @{item.username}
        </div>
      </td>
      <td className="px-3 py-3 hidden lg:table-cell">
        {item.subdomain ? (
          <a
            href={getSubdomainLoginUrl(item.subdomain)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-600 hover:text-sky-800 font-mono truncate hover:underline cursor-pointer block"
          >
            {item.subdomain}.{getRootDomain()}
          </a>
        ) : (
          <div className="text-xs text-gray-400">—</div>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
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
      </td>
      <td className="px-3 py-3 hidden xl:table-cell">
        <div className="text-xs text-gray-600">
          {formatDate(item.created_at)}
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
}: {
  item: Business;
  onEdit?: (business: Business) => void;
  onDelete?: (id: string, name: string) => void;
  onViewAnalytics?: (business: Business) => void;
  onManageSessions?: (business: Business) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = item.logo || item.default_avatar;

  return (
    <div
      className="p-4 flex gap-4 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors duration-200 transform-gpu"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "130px",
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
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onViewAnalytics && <button onClick={() => onViewAnalytics(item)} className="flex items-center justify-center p-2 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"><Eye className="h-4 w-4 text-sky-600" /></button>}
            {onEdit && <button onClick={() => onEdit(item)} className="flex items-center justify-center p-2 rounded-lg hover:bg-yellow-50 transition-colors cursor-pointer"><Edit className="h-4 w-4 text-yellow-600" /></button>}
            {onManageSessions && <button onClick={() => onManageSessions(item)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer" title="Manage sessions" aria-label={`Manage sessions for ${item.name}`}><ShieldCheck className="h-4 w-4 text-emerald-600" /></button>}
            {onDelete && <button onClick={() => onDelete(item.id, item.name)} className="flex items-center justify-center p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><Trash2 className="h-4 w-4 text-red-600" /></button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
          {item.subdomain ? (
            <a href={getSubdomainLoginUrl(item.subdomain)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 font-mono text-sky-600 hover:text-sky-800 hover:underline cursor-pointer">
              {item.subdomain}.{getRootDomain()}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 font-mono text-gray-400">
              no-subdomain
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-medium ${
            item.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}>
            {item.status === "active" ? "چالاک" : "ڕاگیراو"}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-medium ${getBusinessPlanBadgeClasses(item.plan)}`}>
            {getBusinessPlanLabel(item)}
          </span>
        </div>
      </div>
    </div>
  );
});

export const BusinessesTable = memo(function BusinessesTable({
  data = [],
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
}: BusinessesTableProps) {
  return (
    <div className="w-full" dir="ltr">
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5 border-t border-b border-slate-200/80 dark:border-white/10">
        {data.length === 0 ? (
          <div className="p-6 text-center text-gray-550">هیچ داتایەک نەدۆزرایەوە</div>
        ) : (
          data.map((item) => (
            <MobileCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewAnalytics={onViewAnalytics}
              onManageSessions={onManageSessions}
            />
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full border-collapse table-fixed min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide w-14">
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                ناو
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide hidden sm:table-cell">
                ناوی بەکارهێنەر
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide hidden lg:table-cell w-48">
                سەب دۆمەین
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                ڕەوشت / پلان
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide hidden xl:table-cell w-28">
                دروستکراوە
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide w-28">
                کارەکان
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-xs sm:text-sm">
                  هیچ داتایەک نەدۆزرایەوە
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <TableRow
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewAnalytics={onViewAnalytics}
                  onManageSessions={onManageSessions}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
