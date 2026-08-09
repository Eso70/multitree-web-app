"use client";

import type { AuditLogEntry } from "@linktree/types";
import { Eye } from "lucide-react";
import { TablePagination } from "@/components/shared/TablePagination";
import {
  actorTypeLabel,
  eventLabel,
  formatAuditDate,
  outcomeClasses,
  outcomeLabel,
} from "./presentation";
import { processAppearance } from "./processAppearance";

interface AuditLogTableProps {
  items: AuditLogEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelect: (event: AuditLogEntry) => void;
}

export function AuditLogTable({
  items,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onSelect,
}: AuditLogTableProps) {
  return (
    <div className="w-full" dir="ltr">
      <div className="divide-y divide-slate-100 border-y border-slate-200/80 dark:divide-white/5 dark:border-white/10 sm:hidden">
        {items.map((event) => (
          <AuditMobileCard key={event.id} event={event} onSelect={onSelect} />
        ))}
      </div>

      <div className="hidden w-full overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] table-fixed border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">
                <TableHeading>ئەنجام</TableHeading>
                <TableHeading>کردار</TableHeading>
                <TableHeading>کردارکەر</TableHeading>
                <TableHeading>سەرچاوە</TableHeading>
                <TableHeading>IP Address</TableHeading>
                <TableHeading>کات</TableHeading>
                <th className="w-24 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  کارەکان
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {items.map((event) => {
                const appearance = processAppearance(event);
                return (
                  <tr
                    key={event.id}
                    className="group cursor-pointer border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50/50 dark:border-white/5 dark:hover:bg-white/5"
                    onClick={() => onSelect(event)}
                  >
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${outcomeClasses(event.outcome)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {outcomeLabel(event.outcome)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl border p-2 transition ${appearance.classes}`}>
                          <appearance.Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-64 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{eventLabel(event.eventType)}</p>
                          <p className="mt-0.5 max-w-64 truncate font-mono text-[10px] text-slate-400" dir="ltr">{event.eventType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-40 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{event.actorLabel}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{actorTypeLabel(event.actorType)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-40 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{event.linktreeLabel || event.resourceLabel || event.businessLabel || "—"}</p>
                      <p className="mt-0.5 max-w-40 truncate font-mono text-[10px] text-slate-400" dir="ltr">{event.resourceId || event.resourceType || ""}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">{event.ipAddress || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{formatAuditDate(event.createdAt)}</td>
                    <td className="px-3 py-3.5">
                      <button
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          onSelect(event);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                        title="بینین"
                        aria-label="بینینی وردەکاری"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function AuditMobileCard({ event, onSelect }: { event: AuditLogEntry; onSelect: (event: AuditLogEntry) => void }) {
  const appearance = processAppearance(event);
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="w-full p-4 text-left transition-colors duration-200 hover:bg-slate-50/50 dark:hover:bg-white/5"
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-xl border p-2.5 ${appearance.classes}`}>
          <appearance.Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{eventLabel(event.eventType)}</p>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{event.actorLabel}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${outcomeClasses(event.outcome)}`}>{outcomeLabel(event.outcome)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-white/5">
            <span>{formatAuditDate(event.createdAt)}</span>
            <span dir="ltr">{event.ipAddress || "No IP"}</span>
            {(event.linktreeLabel || event.resourceLabel || event.businessLabel) && <span className="max-w-32 truncate">{event.linktreeLabel || event.resourceLabel || event.businessLabel}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{children}</th>;
}
