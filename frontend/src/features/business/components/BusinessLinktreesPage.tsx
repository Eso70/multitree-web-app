"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import dynamic from "next/dynamic";
import {
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
import { StatCard } from "@/components/shared/StatCard";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonCardGrid, SkeletonTable } from "@/components/shared/Skeleton";
import type { BusinessLinktreeSummary as Linktree } from "@linktree/types";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { ClearAnalyticsButton } from "@/components/shared/ClearAnalyticsButton";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";

const LinktreesGrid = dynamic(
  () =>
    import("@/components/business/LinktreesGrid").then((mod) => ({
      default: mod.LinktreesGrid,
    })),
  { ssr: false, loading: () => <SkeletonCardGrid count={6} /> },
);

const LinktreesTable = dynamic(
  () =>
    import("@/components/business/LinktreesTable").then((mod) => ({
      default: mod.LinktreesTable,
    })),
  { ssr: false, loading: () => <SkeletonTable rows={6} /> },
);

interface BusinessLinktreesPageProps {
  linktrees: Linktree[];
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
  onDelete: (id: string, uid: string, name: string) => void;
  onViewAnalytics: (id: string, name: string) => void;
}

export function BusinessLinktreesPage({
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
  onDelete,
  onViewAnalytics,
}: BusinessLinktreesPageProps) {
  useRegisterBusinessDashboardRefresh("linktrees", () => onRefresh(true));
  const ctr =
    totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

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
          label="کۆی بینینەکان"
          value={totalViews}
          color="purple"
        />
        <StatCard
          loading={isLoading}
          icon={Users}
          label="بینەری تاک"
          value={uniqueViews}
          color="slate"
        />
        <StatCard
          loading={isLoading}
          icon={MousePointerClick}
          label="کۆی کلیکەکان"
          value={totalClicks}
          color="green"
        />
        <StatCard
          loading={isLoading}
          icon={Target}
          label="ڕێژەی کلیک"
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

      <DashboardSurface as="div" className="space-y-6">
        <PageHeader
          title={DASHBOARD_PAGE_LABELS.linktrees}
          description="پەیجەکانت دروست و بەڕێوە ببە و بینین و کلیکەکانی هەر پەیجێک چاودێری بکە."
          icon={FileText}
          action={
            <div className="flex items-center gap-2">
              <ClearAnalyticsButton
                onClick={onClearAnalytics}
                hasData={hasAnalyticsData}
                disabled={isRefreshing || isClearingAnalytics}
              />
              <button
                onClick={() => void onRefresh()}
                aria-busy={isRefreshing}
                disabled={isRefreshing}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                title="نوێکردنەوە"
              >
                <MotionSpinner active={isRefreshing}>
                  <RefreshCw className="h-4 w-4 -transform" />
                </MotionSpinner>
              </button>
              <button
                onClick={onSearchAction}
                className={`group relative flex items-center justify-center h-10 w-10 px-0 rounded-xl border transition-all duration-300 shadow-sm hover:shadow cursor-pointer ${searchQuery.trim() ? "" : "sm:w-44 sm:justify-between sm:px-3.5"} ${
                  isSearchModalOpen
                    ? "text-slate-700 dark:text-gray-200"
                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/10"
                }`}
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
                title={
                  searchQuery.trim() ? "پاککردنەوەی گەڕان" : "گەڕان (Ctrl+K)"
                }
              >
                {searchQuery.trim() ? (
                  <X className="h-4 w-4 text-slate-500 transition-transform group-hover:scale-110 dark:text-gray-400" />
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-gray-500 group-hover:scale-110 transition-transform" />
                      <span className="hidden sm:inline text-xs font-semibold text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-300 transition-colors truncate">
                        گەڕان...
                      </span>
                    </div>
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[8px] font-sans font-bold text-slate-400 dark:text-gray-500 select-none">
                      <span>Ctrl</span>
                      <span>K</span>
                    </kbd>
                  </>
                )}
              </button>
              <div className="flex items-center h-10 p-1 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                <button
                  onClick={() => onViewModeChange("grid")}
                  className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 cursor-pointer ${viewMode === "grid" ? "shadow-md text-white" : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"}`}
                  style={
                    viewMode === "grid"
                      ? { background: "var(--theme-css, #64748b)" }
                      : undefined
                  }
                  aria-label="Grid view"
                  title="بینینی گرید"
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                </button>
                <button
                  onClick={() => onViewModeChange("table")}
                  className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 cursor-pointer ${viewMode === "table" ? "shadow-md text-white" : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"}`}
                  style={
                    viewMode === "table"
                      ? { background: "var(--theme-css, #64748b)" }
                      : undefined
                  }
                  aria-label="Table view"
                  title="بینینی خشتە"
                >
                  <Table2 className="h-4 w-4 shrink-0" />
                </button>
              </div>
              <button
                type="button"
                onClick={onCreate}
                title="دروستکردنی پەیجی نوێ"
                className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>پەیجی نوێ</span>
              </button>
            </div>
          }
        />
        <div className="border-t border-slate-100 dark:border-white/5 pt-6">
          {viewMode === "grid" ? (
            <LinktreesGrid
              data={linktrees}
              isLoading={isLoading}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewAnalytics={onViewAnalytics}
              showLinktreeMeta
            />
          ) : (
            <LinktreesTable
              data={linktrees}
              isLoading={isLoading}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewAnalytics={onViewAnalytics}
              showLinktreeMeta
            />
          )}
        </div>
      </DashboardSurface>
    </>
  );
}
