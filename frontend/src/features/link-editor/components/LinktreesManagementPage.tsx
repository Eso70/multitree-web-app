"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  Eye,
  FileText,
  LayoutGrid,
  MousePointerClick,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { LinktreeListItem } from "@linktree/types";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { ClearAnalyticsButton } from "@/components/shared/ClearAnalyticsButton";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { SkeletonLinktreeGrid } from "@/components/shared/SkeletonPageLayouts";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { ANALYTICS_TERMS } from "@/components/shared/analytics-terminology";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";
import { Tooltip } from "@/components/shared/Tooltip";

const LinktreesGrid = dynamic(
  () =>
    import("@/components/business/LinktreesGrid").then((module) => ({
      default: module.LinktreesGrid,
    })),
  { ssr: false, loading: () => <SkeletonLinktreeGrid count={6} /> },
);
const LinktreesTable = dynamic(
  () =>
    import("@/components/business/LinktreesTable").then((module) => ({
      default: module.LinktreesTable,
    })),
  { ssr: false, loading: () => <SkeletonTable rows={6} columns={8} /> },
);

export interface LinktreesManagementPageProps {
  linktrees: LinktreeListItem[];
  linktreeCount: number;
  isLoading: boolean;
  totalViews: number;
  uniqueViews: number;
  totalClicks: number;
  conversions: number;
  isRefreshing: boolean;
  isClearingAnalytics: boolean;
  hasAnalyticsData: boolean;
  searchQuery: string;
  isSearchModalOpen: boolean;
  viewMode: "grid" | "table";
  onClearAnalytics: () => void;
  onRefresh: (rethrow?: boolean) => void | Promise<void>;
  onSearchAction: () => void;
  onViewModeChange: (viewMode: "grid" | "table") => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDuplicate?: (item: LinktreeListItem) => void;
  onDelete?: (id: string, uid: string, name: string) => void;
  onViewAnalytics: (id: string, name: string) => void;
  onToggleCampaign?: (
    id: string,
    isCampaignActive: boolean,
  ) => void | Promise<void>;
  onToggleArchive?: (id: string, isArchived: boolean) => void | Promise<void>;
  onToggleStatus?: (
    id: string,
    status: "active" | "inactive",
  ) => void | Promise<void>;
  description?: string;
  createDisabled?: boolean;
  createDisabledTooltip?: string;
  publicPathPrefix?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  managementNavigation?: ReactNode;
  alternativeContent?: ReactNode;
}

export function LinktreesManagementPage({
  linktrees,
  linktreeCount,
  isLoading,
  totalViews,
  uniqueViews,
  totalClicks,
  conversions,
  isRefreshing,
  isClearingAnalytics,
  hasAnalyticsData,
  searchQuery,
  isSearchModalOpen,
  viewMode,
  onClearAnalytics,
  onRefresh,
  onSearchAction,
  onViewModeChange,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onViewAnalytics,
  onToggleCampaign,
  onToggleArchive,
  onToggleStatus,
  description = "پەیجەکانت دروست و بەڕێوە ببە و بینین و کلیکەکانی هەر پەیجێک چاودێری بکە.",
  createDisabled = false,
  createDisabledTooltip = "سنووری دروستکردنی پەڕە پڕ بووە",
  publicPathPrefix,
  emptyTitle,
  emptyDescription,
  managementNavigation,
  alternativeContent,
}: LinktreesManagementPageProps) {
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived">(
    "active",
  );
  const supportsArchive = Boolean(onToggleArchive);
  const displayedLinktrees = useMemo(() => {
    if (!supportsArchive) return linktrees;
    return linktrees.filter((item) =>
      archiveFilter === "archived"
        ? Boolean(item.is_archived)
        : !item.is_archived,
    );
  }, [archiveFilter, linktrees, supportsArchive]);
  const ctr =
    totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  const archived = supportsArchive && archiveFilter === "archived";
  const listProps = {
    data: displayedLinktrees,
    isLoading,
    onEdit,
    onDuplicate,
    onDelete,
    onViewAnalytics,
    onToggleCampaign,
    onToggleArchive,
    onToggleStatus,
    publicPathPrefix,
    showLinktreeMeta: true,
    viewActionLabel: "ئامار",
    emptyTitle: archived ? "هیچ پەڕەیەکی ئەرشیفکراو نییە" : emptyTitle,
    emptyDescription: archived
      ? "ئەو پەڕانەی بە دەستی ئەرشیفیان دەکەیت لێرەدا دەردەکەون."
      : emptyDescription,
  };

  return (
    <>
      <StatCardGrid columns={3} className="mb-8">
        <StatCard
          loading={isLoading}
          icon={FileText}
          label="کۆی پەڕەکانی لینکتری"
          value={linktreeCount}
          color="blue"
        />
        <StatCard
          loading={isLoading}
          icon={Eye}
          label={ANALYTICS_TERMS.totalViews}
          value={totalViews}
          color="purple"
        />
        <StatCard
          loading={isLoading}
          icon={Users}
          label={ANALYTICS_TERMS.uniqueViewer}
          value={uniqueViews}
          color="slate"
        />
        <StatCard
          loading={isLoading}
          icon={MousePointerClick}
          label={ANALYTICS_TERMS.totalClicks}
          value={totalClicks}
          color="green"
        />
        <StatCard
          loading={isLoading}
          icon={Target}
          label={ANALYTICS_TERMS.clickRate}
          value={`${ctr}%`}
          color="orange"
        />
        <StatCard
          loading={isLoading}
          icon={TrendingUp}
          label="گۆڕانەکان"
          value={conversions}
          color="pink"
        />
      </StatCardGrid>

      {managementNavigation}
      {alternativeContent ?? (
        <DashboardSurface as="div" className="space-y-6">
          <PageHeader
            title={DASHBOARD_PAGE_LABELS.linktrees}
            description={description}
            icon={FileText}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <ClearAnalyticsButton
                  onClick={onClearAnalytics}
                  hasData={hasAnalyticsData}
                  disabled={isRefreshing || isClearingAnalytics}
                />
                <Tooltip content="نوێکردنەوەی پەیجەکان" side="bottom">
                  <button
                    type="button"
                    onClick={() => void onRefresh()}
                    aria-busy={isRefreshing}
                    disabled={isRefreshing}
                    aria-label="نوێکردنەوە"
                    className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                  >
                    <MotionSpinner active={isRefreshing}>
                      <RefreshCw className="h-4 w-4" />
                    </MotionSpinner>
                  </button>
                </Tooltip>
                <Tooltip
                  content={
                    searchQuery.trim()
                      ? "پاککردنەوەی گەڕان"
                      : "گەڕان لە پەڕەکان (Ctrl+K)"
                  }
                  side="bottom"
                >
                  <button
                    type="button"
                    onClick={onSearchAction}
                    aria-label={
                      searchQuery.trim() ? "پاککردنەوەی گەڕان" : "گەڕان"
                    }
                    className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border px-0 shadow-sm transition-all duration-300 hover:shadow active:scale-95 ${searchQuery.trim() ? "" : "sm:w-44 sm:justify-between sm:px-3.5"} ${isSearchModalOpen ? "text-slate-700 dark:text-gray-200" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"}`}
                    style={
                      isSearchModalOpen
                        ? {
                            background:
                              "color-mix(in srgb, var(--theme-css, #64748b) 20%, transparent)",
                            borderColor:
                              "color-mix(in srgb, var(--theme-css, #64748b) 35%, transparent)",
                            color: "var(--theme-css, #64748b)",
                          }
                        : undefined
                    }
                  >
                    {searchQuery.trim() ? (
                      <X className="h-4 w-4 text-slate-500 dark:text-gray-400" />
                    ) : (
                      <>
                        <div className="flex min-w-0 items-center gap-2">
                          <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-gray-500" />
                          <span className="hidden truncate text-xs font-semibold text-slate-400 sm:inline dark:text-gray-500">
                            گەڕان...
                          </span>
                        </div>
                        <kbd className="hidden items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 font-sans text-[8px] font-bold text-slate-400 select-none sm:inline-flex dark:bg-white/10 dark:text-gray-500">
                          Ctrl K
                        </kbd>
                      </>
                    )}
                  </button>
                </Tooltip>
                {supportsArchive ? (
                  <div className="flex h-10 shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                    {(["active", "archived"] as const).map((filter) => (
                      <Tooltip
                        key={filter}
                        content={
                          filter === "active"
                            ? "پەڕە چالاکەکان"
                            : "پەڕە ئەرشیفکراوەکان"
                        }
                        side="bottom"
                      >
                        <button
                          type="button"
                          onClick={() => setArchiveFilter(filter)}
                          aria-pressed={archiveFilter === filter}
                          className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all active:scale-95 ${archiveFilter === filter ? "text-white shadow-sm" : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"}`}
                          style={
                            archiveFilter === filter
                              ? { background: "var(--theme-css, #64748b)" }
                              : undefined
                          }
                        >
                          {filter === "archived" ? (
                            <Archive className="h-3.5 w-3.5" />
                          ) : null}
                          <span>
                            {filter === "active" ? "چالاک" : "ئەرشیف"}
                          </span>
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                ) : null}
                <div className="flex h-10 shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                  {(["grid", "table"] as const).map((mode) => {
                    const Icon = mode === "grid" ? LayoutGrid : Table2;
                    return (
                      <Tooltip
                        key={mode}
                        content={
                          mode === "grid"
                            ? "پیشاندانی تۆڕی (گرید)"
                            : "پیشاندانی خشتەیی"
                        }
                        side="bottom"
                      >
                        <button
                          type="button"
                          onClick={() => onViewModeChange(mode)}
                          aria-pressed={viewMode === mode}
                          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all active:scale-95 ${viewMode === mode ? "text-white shadow-md" : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"}`}
                          style={
                            viewMode === mode
                              ? { background: "var(--theme-css, #64748b)" }
                              : undefined
                          }
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
                <Tooltip
                  content={
                    createDisabled
                      ? createDisabledTooltip
                      : "دروستکردنی پەیجی نوێ"
                  }
                  side="bottom"
                >
                  <button
                    type="button"
                    disabled={createDisabled}
                    onClick={onCreate}
                    className="group flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                    <span>پەیجی نوێ</span>
                  </button>
                </Tooltip>
              </div>
            }
          />
          <div className="border-t border-slate-100 pt-6 dark:border-white/5">
            {viewMode === "grid" ? (
              <LinktreesGrid {...listProps} />
            ) : (
              <LinktreesTable {...listProps} />
            )}
          </div>
        </DashboardSurface>
      )}
    </>
  );
}
