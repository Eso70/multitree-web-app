"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  MotionPulseIcon,
  MotionSpinner,
} from "@/components/motion/MotionPrimitives";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { SearchModal } from "@/components/shared/SearchModal";
import { CreatorDetailModal } from "@/features/platform-admin/components/CreatorDetailModal";
import { CreatorUsersTable } from "@/features/platform-admin/components/CreatorUsersTable";
import type {
  Creator,
  CreatorManageAction,
} from "@/features/platform-admin/creator-account";
import { apiRequest } from "@/lib/api/request";

const PAGE_SIZE = 20;

type CreatorList = {
  items: Creator[];
  pagination: { page: number; limit: number; total: number; pages: number };
  stats: {
    total?: number;
    trialing?: number;
    paid?: number;
    suspended?: number;
  };
};

export function CreatorUsersPage() {
  const [data, setData] = useState<CreatorList | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletePageTarget, setDeletePageTarget] = useState<Creator | null>(
    null,
  );
  const [detailTarget, setDetailTarget] = useState<Creator | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const load = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (query.trim()) params.set("search", query.trim());
        setData(
          await apiRequest<CreatorList>(`/api/platform/creators?${params}`),
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "بارکردنی بەکارهێنەران سەرکەوتوو نەبوو",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, query],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  // The dashboard's own Ctrl+K listener returns early unless the businesses
  // page is open, so this one owns the shortcut while the users page is.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setIsSearchModalOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // A new search always starts at the first page: keeping page 3 while the
  // result set shrinks renders an empty table for a query that has matches.
  const changeQuery = (value: string) => {
    setPage(1);
    setQuery(value);
  };

  const manage = async (creator: Creator, action: CreatorManageAction) => {
    setBusyId(creator.id);
    try {
      await apiRequest(`/api/platform/creators/${creator.id}`, {
        method: "PATCH",
        json: { action, ...(action === "extend_trial" ? { days: 7 } : {}) },
      });
      toast.success("هەژماری Creator نوێ کرایەوە");
      await load(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "کردارەکە سەرکەوتوو نەبوو",
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteCreatorPage = async () => {
    if (!deletePageTarget) return;
    setBusyId(deletePageTarget.id);
    try {
      await apiRequest(`/api/platform/creators/${deletePageTarget.id}/page`, {
        method: "DELETE",
      });
      toast.success("پەڕەکە سڕایەوە");
      await load(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "سڕینەوەکە سەرکەوتوو نەبوو",
      );
      throw error;
    } finally {
      setBusyId(null);
    }
  };

  const items = data?.items || [];
  const searching = Boolean(query.trim());

  return (
    <>
      <StatCardGrid columns={4} className="mb-8">
        <StatCard
          loading={loading}
          icon={Users}
          label="هەموو بەکارهێنەران"
          value={data?.stats.total || 0}
          color="blue"
        />
        <StatCard
          loading={loading}
          icon={RefreshCw}
          label="لە تاقیکردنەوەدان"
          value={data?.stats.trialing || 0}
          color="purple"
        />
        <StatCard
          loading={loading}
          icon={CreditCard}
          label="پارەدراو"
          value={data?.stats.paid || 0}
          color="green"
        />
        <StatCard
          loading={loading}
          icon={ShieldAlert}
          label="ڕاگیراو"
          value={data?.stats.suspended || 0}
          color="orange"
        />
      </StatCardGrid>

      <DashboardSurface className="space-y-6">
        <PageHeader
          title="بەکارهێنەرەکان"
          description="هەژمارە سەربەخۆکان، تاقیکردنەوە و چالاککردنی پارەدان بەڕێوە ببە."
          icon={Users}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  query.trim() ? changeQuery("") : setIsSearchModalOpen(true)
                }
                className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border px-0 shadow-sm transition-all duration-300 hover:shadow cursor-pointer ${query.trim() ? "" : "sm:w-44 sm:justify-between sm:px-3.5"} ${
                  isSearchModalOpen
                    ? "sa-soft sa-soft-border"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50/50 hover:text-slate-750 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
                aria-label={query.trim() ? "Clear search" : "Search"}
                title={query.trim() ? "پاککردنەوەی گەڕان" : "گەڕان (Ctrl+K)"}
              >
                {query.trim() ? (
                  <X className="h-4 w-4 text-slate-500 transition-transform group-hover:scale-110 dark:text-gray-400" />
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <Search className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:scale-110 dark:text-gray-500" />
                      <span className="hidden truncate text-xs font-semibold text-slate-400 transition-colors group-hover:text-slate-650 dark:text-gray-500 dark:group-hover:text-gray-300 sm:inline">
                        گەڕان...
                      </span>
                    </div>
                    <kbd className="hidden select-none items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 font-sans text-[8px] font-bold text-slate-400 dark:bg-white/10 dark:text-gray-500 sm:inline-flex">
                      <span>Ctrl</span>
                      <span>K</span>
                    </kbd>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={refreshing}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                title="نوێکردنەوە"
                aria-label="نوێکردنەوە"
              >
                <MotionSpinner active={refreshing}>
                  <RefreshCw className="h-4 w-4" />
                </MotionSpinner>
              </button>
            </div>
          }
        />

        <CreatorUsersTable
          data={items}
          busyId={busyId}
          isLoading={loading}
          searching={searching}
          pagination={{
            mode: "server",
            page,
            pageSize: data?.pagination.limit || PAGE_SIZE,
            totalItems: data?.pagination.total || items.length,
            totalPages: data?.pagination.pages || 1,
            onPageChange: setPage,
          }}
          onView={setDetailTarget}
          onManage={(creator, action) => void manage(creator, action)}
          onDeletePage={setDeletePageTarget}
        />
      </DashboardSurface>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        placeholder="ناو یان ئیمەیڵی بەکارهێنەر بنووسە..."
        searchQuery={query}
        onSearchQueryChange={changeQuery}
      >
        {!query.trim() ? (
          <div className="flex select-none flex-col items-center justify-center gap-2 py-8 text-center font-kurdish text-xs text-slate-400 dark:text-gray-500 sm:text-sm">
            <MotionPulseIcon>
              <Search
                className="h-5 w-5 opacity-40"
                style={{ color: "var(--multitree-accent)" }}
              />
            </MotionPulseIcon>
            <span>گەڕان بۆ بەکارهێنەران بکە.....</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center font-kurdish text-sm text-slate-450 dark:text-gray-500">
            هیچ ئەنجامێک نەدۆزرایەوە بۆ &quot;{query}&quot;
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map((creator) => (
              <button
                key={creator.id}
                onClick={() => {
                  setDetailTarget(creator);
                  setIsSearchModalOpen(false);
                }}
                className="group flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 text-left transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-gray-300">
                    {creator.display_name.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex min-w-0 flex-col text-left">
                    <span className="sa-group-hover-text truncate text-sm font-semibold leading-tight text-slate-700 transition-colors dark:text-gray-200">
                      {creator.display_name}
                    </span>
                    <span className="mt-1 truncate text-xs leading-none text-slate-400 dark:text-gray-555">
                      {creator.email}
                    </span>
                  </div>
                </div>
                <div
                  className="translate-x-1 pl-2 text-xs font-semibold opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  style={{ color: "var(--multitree-accent)" }}
                >
                  وردەکاری ←
                </div>
              </button>
            ))}
          </div>
        )}
      </SearchModal>

      <CreatorDetailModal
        creator={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deletePageTarget)}
        onClose={() => setDeletePageTarget(null)}
        onConfirm={deleteCreatorPage}
        isDeleting={Boolean(deletePageTarget && busyId === deletePageTarget.id)}
        title="سڕینەوەی پەڕەی بەکارهێنەر"
        message={
          <p dir="rtl" className="text-right">
            دڵنیایت لە سڕینەوەی پەڕەی {deletePageTarget?.display_name}؟ ئەم
            کردارە تەنها بە دەسەڵاتی بەڕێوەبەری پلاتفۆرم ئەنجام دەدرێت
          </p>
        }
      />
    </>
  );
}
