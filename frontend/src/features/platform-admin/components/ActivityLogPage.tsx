"use client";

import {
  MotionPulse,
  MotionPulseIcon,
  MotionSpinner,
} from "@/components/motion/MotionPrimitives";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { AuditLogEntry, AuditLogSort } from "@linktree/types";
import {
  CircleCheckBig,
  Clock3,
  Download,
  FileSearch,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/CustomSelect";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchModal } from "@/components/shared/SearchModal";
import { StatCard } from "@/components/shared/StatCard";
import { useAuditLog } from "@/features/platform-admin/hooks/useAuditLog";
import { useAuditFilterOptions } from "@/features/platform-admin/hooks/useAuditFilterOptions";
import { AuditEventDrawer } from "./audit-log/AuditEventDrawer";
import { AuditLogTable } from "./audit-log/AuditLogTable";
import {
  eventLabel,
  outcomeClasses,
  outcomeLabel,
} from "./audit-log/presentation";
import { processAppearance } from "./audit-log/processAppearance";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

const sortOptions: CustomSelectOption<AuditLogSort>[] = [
  { value: "newest", label: "نوێترین یەکەم" },
  { value: "oldest", label: "کۆنترین یەکەم" },
  { value: "failure-first", label: "شکستخواردوو یەکەم" },
  { value: "denied-first", label: "ڕەتکراوە یەکەم" },
  { value: "success-first", label: "سەرکەوتوو یەکەم" },
  { value: "business-first", label: "چالاکیی بزنس یەکەم" },
  { value: "views-first", label: "بینینی پەڕەی وێب یەکەم" },
  { value: "slowest-first", label: "هێواشترین داواکاری یەکەم" },
];

sortOptions.splice(sortOptions.length - 1, 0,
  { value: "clicks-first", label: "Clicks first" },
  { value: "requests-first", label: "Requests first" },
  { value: "integrations-first", label: "TikTok Events API first" },
);

const outcomeOptions: CustomSelectOption<string>[] = [
  { value: "", label: "هەموو ئەنجامەکان" },
  { value: "failure", label: "تەنها شکستخواردوو" },
  { value: "denied", label: "تەنها ڕەتکراوە" },
  { value: "success", label: "تەنها سەرکەوتوو" },
];

const actorOptions: CustomSelectOption<string>[] = [
  { value: "", label: "هەموو بەکارهێنەران" },
  { value: "business", label: "بزنس" },
  { value: "platform-admin", label: "بەڕێوەبەری پلاتفۆرم" },
  { value: "anonymous", label: "میوان" },
  { value: "multitree", label: "سیستەم" },
];

const kindOptions: CustomSelectOption<string>[] = [
  { value: "", label: "هەموو جۆرەکان" },
  { value: "request", label: "داواکاریی وێب" },
  { value: "audit", label: "ڕووداوی چاودێری" },
];

kindOptions.splice(1, 0,
  { value: "view", label: "Public linktree views" },
  { value: "click", label: "Public link clicks" },
  { value: "tiktok-pixel", label: "TikTok Pixel events" },
  { value: "tiktok-events-api", label: "TikTok Events API deliveries" },
  { value: "integration", label: "Integration deliveries" },
);

const sourceOptions: CustomSelectOption<string>[] = [
  { value: "", label: "هەموو سەرچاوەکان" },
  { value: "frontend", label: "پەڕەکانی وێب" },
  { value: "backend", label: "سێرڤەر" },
];

const methodOptions: CustomSelectOption<string>[] = [
  { value: "", label: "هەموو شێوازەکان" },
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PATCH", label: "PATCH" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
  { value: "HEAD", label: "HEAD" },
  { value: "OPTIONS", label: "OPTIONS" },
];

export function ActivityLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<AuditLogSort>("newest");
  const [outcome, setOutcome] = useState("");
  const [actorType, setActorType] = useState("");
  const [kind, setKind] = useState("");
  const [source, setSource] = useState("");
  const [httpMethod, setHttpMethod] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [linktreeId, setLinktreeId] = useState("");
  const filterOptions = useAuditFilterOptions(businessId);
  const businessOptions = useMemo<CustomSelectOption<string>[]>(
    () => [
      { value: "", label: "All businesses" },
      ...(filterOptions?.businesses ?? []).map((business) => ({
        value: business.id,
        label: business.label,
      })),
    ],
    [filterOptions?.businesses],
  );
  const linktreeOptions = useMemo<CustomSelectOption<string>[]>(
    () => [
      {
        value: "",
        label: businessId ? "All public linktrees" : "Select a business first",
      },
      ...(filterOptions?.linktrees ?? []).map((linktree) => ({
        value: linktree.id,
        label: linktree.label,
      })),
    ],
    [businessId, filterOptions?.linktrees],
  );
  const pageSize = 10;
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntry | null>(
    null,
  );
  const deferredSearch = useDeferredValue(searchQuery.trim());
  const { data, isLoading, isRefreshing, error, refresh } = useAuditLog({
    search: deferredSearch,
    actorType,
    outcome,
    eventType: "",
    from: "",
    to: "",
    sort,
    kind,
    source,
    httpMethod,
    businessId,
    linktreeId,
    page,
    pageSize,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchModalOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const exportCsv = () => {
    const params = new URLSearchParams();
    const exportFilters = {
      search: deferredSearch,
      sort,
      outcome,
      actorType,
      kind,
      source,
      httpMethod,
      businessId,
      linktreeId,
    };
    for (const [key, value] of Object.entries(exportFilters)) {
      if (value) params.set(key, value);
    }
    const anchor = document.createElement("a");
    anchor.href = `/api/platform/audit-events/export?${params}`;
    anchor.download = "multitree-audit.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const summary = data?.summary || {
    total: 0,
    successful: 0,
    failed: 0,
    denied: 0,
    last24Hours: 0,
  };
  const activeFilterCount = [
    searchQuery.trim(),
    sort !== "newest" ? sort : "",
    outcome,
    actorType,
    kind,
    source,
    httpMethod,
    businessId,
    linktreeId,
  ].filter(Boolean).length;
  const hasAdvancedCriteria = activeFilterCount > 0;

  const clearAdvancedCriteria = () => {
    setSearchQuery("");
    setSort("newest");
    setOutcome("");
    setActorType("");
    setKind("");
    setSource("");
    setHttpMethod("");
    setBusinessId("");
    setLinktreeId("");
    setPage(1);
  };

  return (
    <div className="space-y-8" dir="ltr">
      <StatCardGrid>
        <StatCard
          loading={isLoading && !data}
          icon={ShieldCheck}
          label="کۆی تۆمارەکان"
          value={summary.total}
          color="blue"
        />
        <StatCard
          loading={isLoading && !data}
          icon={CircleCheckBig}
          label="سەرکەوتوو"
          value={summary.successful}
          color="green"
        />
        <StatCard
          loading={isLoading && !data}
          icon={ShieldAlert}
          label="شکستخواردوو یان ڕەتکراوە"
          value={summary.failed + summary.denied}
          color="orange"
        />
        <StatCard
          loading={isLoading && !data}
          icon={Clock3}
          label="٢٤ کاتژمێری ڕابردوو"
          value={summary.last24Hours}
          color="purple"
        />
      </StatCardGrid>

      <section className="w-full space-y-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6">
        <PageHeader
          title="تۆماری چاودێری"
          icon={ShieldCheck}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={isRefreshing}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                title="نوێکردنەوە"
              >
                <MotionSpinner active={isRefreshing}><RefreshCw
                  className="h-4 w-4 -transform"
                 /></MotionSpinner>
              </button>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className={`group relative flex h-10 min-w-10 flex-1 items-center justify-between rounded-xl border px-3.5 shadow-sm transition-all hover:shadow sm:w-48 sm:flex-none ${
                  isSearchModalOpen || hasAdvancedCriteria
                    ? "sa-soft sa-soft-border"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
                title="گەڕان و ڕیزکردن (Ctrl+K)"
                aria-label="گەڕان و ڕیزکردن"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:scale-110 dark:text-gray-500" />
                  <span className="truncate text-xs font-semibold">
                    گەڕان و ڕیزکردن
                  </span>
                </div>
                {activeFilterCount > 0 ? (
                  <span className="sa-gradient flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : (
                  <kbd className="hidden items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 font-sans text-[8px] font-bold text-slate-400 select-none dark:bg-white/10 dark:text-gray-500 sm:inline-flex">
                    Ctrl K
                  </kbd>
                )}
              </button>
              {hasAdvancedCriteria && (
                <button
                  type="button"
                  onClick={clearAdvancedCriteria}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500 shadow-sm transition hover:border-red-300 hover:bg-red-100 hover:text-red-600 hover:shadow dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/35 dark:hover:text-red-300"
                  title="پاککردنەوەی پاڵاوتنەکان"
                  aria-label="پاککردنەوەی پاڵاوتنەکان"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={exportCsv}
                disabled={!data?.pagination.totalItems}
                className="flex h-10 items-center gap-2 rounded-xl sa-gradient sa-gradient-hover px-4 text-xs font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                هەناردەی CSV
              </button>
            </div>
          }
        />

        {error && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <span>{error}</span>
            <button
              type="button"
              onClick={refresh}
              className="shrink-0 rounded-lg border border-current/20 px-3 py-1.5 text-xs font-bold"
            >
              دووبارە هەوڵدانەوە
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-white/5">
          {isLoading && !data ? (
            <AuditLogSkeleton />
          ) : data && data.items.length > 0 ? (
            <div
              className={
                isLoading
                  ? "pointer-events-none opacity-55 transition"
                  : "transition"
              }
            >
              <AuditLogTable
                items={data.items}
                page={data.pagination.page}
                pageSize={data.pagination.pageSize}
                totalItems={data.pagination.totalItems}
                totalPages={data.pagination.totalPages}
                onPageChange={setPage}
                onSelect={setSelectedEvent}
              />
            </div>
          ) : !error ? (
            <EmptyState
              icon={FileSearch}
              title="هیچ تۆمارێک نەدۆزرایەوە"
              description="وشەی گەڕان بگۆڕە یان چاوەڕێی داواکارییەکی نوێ بکە. تۆمارەکان بە شێوەی خۆکار دروست دەبن."
            />
          ) : null}
        </div>
      </section>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        wide
        placeholder="کردار، بەکارهێنەر، IP یان Request ID بنووسە..."
        searchQuery={searchQuery}
        onSearchQueryChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
      >
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              پاڵاوتن و ڕیزکردنی ورد
            </p>
            <button
              type="button"
              onClick={clearAdvancedCriteria}
              disabled={!hasAdvancedCriteria}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:border-red-300 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/35 dark:hover:text-red-300"
              title="پاککردنەوەی هەموو"
              aria-label="پاککردنەوەی هەموو"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CustomSelect
              label="ڕیزکردن"
              value={sort}
              options={sortOptions}
              onChange={(value) => {
                setSort(value);
                setPage(1);
              }}
            />
            <CustomSelect
              label="ئەنجام"
              value={outcome}
              options={outcomeOptions}
              onChange={(value) => {
                setOutcome(value);
                setPage(1);
              }}
            />
            <CustomSelect
              label="بەکارهێنەر"
              value={actorType}
              options={actorOptions}
              onChange={(value) => {
                setActorType(value);
                setPage(1);
              }}
            />
            <CustomSelect
              label="جۆری چالاکی"
              value={kind}
              options={kindOptions}
              onChange={(value) => {
                setKind(value);
                setPage(1);
              }}
            />
            <CustomSelect
              label="سەرچاوە"
              value={source}
              options={sourceOptions}
              onChange={(value) => {
                setSource(value);
                setPage(1);
              }}
            />
            <CustomSelect
              label="شێوازی داواکاری"
              value={httpMethod}
              options={methodOptions}
              onChange={(value) => {
                setHttpMethod(value);
                setPage(1);
              }}
            />
            <CustomSelect
              label="Business"
              value={businessId}
              options={businessOptions}
              onChange={(value) => {
                setBusinessId(value);
                setLinktreeId("");
                setPage(1);
              }}
            />
            <CustomSelect
              label="Public linktree"
              value={linktreeId}
              options={linktreeOptions}
              disabled={!businessId}
              onChange={(value) => {
                setLinktreeId(value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="mt-2 border-t border-slate-100 pt-2 dark:border-white/5">
          {!hasAdvancedCriteria ? (
            <div className="flex select-none flex-col items-center justify-center gap-2 py-8 text-center text-xs text-slate-400 dark:text-gray-500 sm:text-sm">
              <MotionPulseIcon>
                <Search className="sa-accent-text h-5 w-5 opacity-40" />
              </MotionPulseIcon>
              <span>بگەڕێ یان پاڵاوتن و ڕیزکردنێک هەڵبژێرە.</span>
            </div>
          ) : isLoading ? (
            <div className="py-8 text-center text-sm text-slate-400">
              گەڕان...
            </div>
          ) : !data?.items.length ? (
            <div className="py-8 text-center text-sm text-slate-400 dark:text-gray-500">
              هیچ ئەنجامێک نەدۆزرایەوە بۆ &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {data.items.map((event) => {
                const appearance = processAppearance(event);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsSearchModalOpen(false);
                    }}
                    className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-all hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${appearance.classes}`}
                      >
                        <appearance.Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-semibold text-slate-700 dark:text-gray-200">
                          {eventLabel(event.eventType)}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {event.actorLabel} · {event.ipAddress || "No IP"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`ml-2 shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${outcomeClasses(event.outcome)}`}
                    >
                      {outcomeLabel(event.outcome)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SearchModal>

      <AuditEventDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading audit events">
      {Array.from({ length: 7 }, (_, index) => (
        <MotionPulse
          key={index}
          className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 dark:border-white/5"
        >
          <div className="h-9 w-20 rounded-full bg-slate-100 dark:bg-white/5" />
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-white/5" />
            <div className="h-2 w-1/5 rounded bg-slate-100 dark:bg-white/5" />
          </div>
          <div className="hidden h-3 w-28 rounded bg-slate-100 dark:bg-white/5 sm:block" />
          <div className="hidden h-3 w-36 rounded bg-slate-100 dark:bg-white/5 lg:block" />
        </MotionPulse>
      ))}
    </div>
  );
}
