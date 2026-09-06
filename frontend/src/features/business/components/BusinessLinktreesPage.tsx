"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { useMemo, useState } from "react";

import dynamic from "next/dynamic";
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
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonTable } from "@/components/shared/Skeleton";
import {
  SkeletonClientAccessPage,
  SkeletonLinktreeGrid,
} from "@/components/shared/SkeletonPageLayouts";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import type { BusinessLinktreeSummary as Linktree, LinktreeListItem } from "@linktree/types";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { ClearAnalyticsButton } from "@/components/shared/ClearAnalyticsButton";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";
import { ANALYTICS_TERMS } from "@/components/shared/analytics-terminology";
import { Tooltip } from "@/components/shared/Tooltip";

const LinktreesGrid = dynamic(
  () =>
    import("@/components/business/LinktreesGrid").then((mod) => ({
      default: mod.LinktreesGrid,
    })),
  { ssr: false, loading: () => <SkeletonLinktreeGrid count={6} /> },
);

const LinktreesTable = dynamic(
  () =>
    import("@/components/business/LinktreesTable").then((mod) => ({
      default: mod.LinktreesTable,
    })),
  { ssr: false, loading: () => <SkeletonTable rows={6} columns={8} /> },
);

const BusinessClientAccessPage = dynamic(
  () =>
    import("@/features/client-linktree-access/components/BusinessClientAccessPage"),
  {
    ssr: false,
    loading: () => <SkeletonClientAccessPage />,
  },
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
  onDuplicate?: (item: LinktreeListItem) => void;
  onDelete: (id: string, uid: string, name: string) => void;
  onViewAnalytics: (id: string, name: string) => void;
  onToggleCampaign?: (id: string, isCampaignActive: boolean) => void | Promise<void>;
  onToggleArchive?: (id: string, isArchived: boolean) => void | Promise<void>;
  onToggleStatus?: (id: string, status: "active" | "inactive") => void | Promise<void>;
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
  onDuplicate,
  onDelete,
  onViewAnalytics,
  onToggleCampaign,
  onToggleArchive,
  onToggleStatus,
}: BusinessLinktreesPageProps) {
  const [managementView, setManagementView] = useState<
    "linktrees" | "client-invitations"
  >("linktrees");
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archived">("active");

  const activeLinktrees = useMemo(
    () => linktrees.filter((item) => !item.is_archived),
    [linktrees],
  );
  const archivedLinktrees = useMemo(
    () => linktrees.filter((item) => !!item.is_archived),
    [linktrees],
  );
  const displayedLinktrees = archiveFilter === "archived" ? archivedLinktrees : activeLinktrees;

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

      <SegmentedTabs
        className="mb-6"
        value={managementView}
        onChange={setManagementView}
        tabs={[
          { id: "linktrees", label: "پەڕەکانی لینکتری", icon: FileText },
          {
            id: "client-invitations",
            label: "بانگهێشتنامەکانی کڕیار",
            icon: UserRoundCog,
          },
        ]}
      />

      {managementView === "client-invitations" ? (
        <BusinessClientAccessPage />
      ) : (
        <DashboardSurface as="div" className="space-y-6">
          <PageHeader
            title={DASHBOARD_PAGE_LABELS.linktrees}
            description="پەیجەکانت دروست و بەڕێوە ببە و بینین و کلیکەکانی هەر پەیجێک چاودێری بکە."
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
                    onClick={() => void onRefresh()}
                    aria-busy={isRefreshing}
                    disabled={isRefreshing}
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <MotionSpinner active={isRefreshing}>
                      <RefreshCw className="h-4 w-4 -transform" />
                    </MotionSpinner>
                  </button>
                </Tooltip>
                <Tooltip content={searchQuery.trim() ? "پاککردنەوەی گەڕان" : "گەڕان لە پەڕەکان (Ctrl+K)"} side="bottom">
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
                </Tooltip>
                <div className="flex items-center h-10 p-1 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                  <Tooltip content="پەڕە چالاکەکان" side="bottom">
                    <button
                      type="button"
                      onClick={() => setArchiveFilter("active")}
                      className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        archiveFilter === "active"
                          ? "shadow-sm text-white"
                          : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"
                      }`}
                      style={
                        archiveFilter === "active"
                          ? { background: "var(--theme-css, #64748b)" }
                          : undefined
                      }
                      aria-label="پەڕە چالاکەکان"
                    >
                      <span>چالاک</span>
                    </button>
                  </Tooltip>
                  <Tooltip content="پەڕە ئەرشیفکراوەکان" side="bottom">
                    <button
                      type="button"
                      onClick={() => setArchiveFilter("archived")}
                      className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        archiveFilter === "archived"
                          ? "shadow-sm text-white"
                          : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"
                      }`}
                      style={
                        archiveFilter === "archived"
                          ? { background: "var(--theme-css, #64748b)" }
                          : undefined
                      }
                      aria-label="پەڕە ئەرشیفکراوەکان"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>ئەرشیف</span>
                    </button>
                  </Tooltip>
                </div>
                <div className="flex items-center h-10 p-1 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                  <Tooltip content="پیشاندانی تۆڕی (گرید)" side="bottom">
                    <button
                      onClick={() => onViewModeChange("grid")}
                      className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 cursor-pointer ${viewMode === "grid" ? "shadow-md text-white" : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"}`}
                      style={
                        viewMode === "grid"
                          ? { background: "var(--theme-css, #64748b)" }
                          : undefined
                      }
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4 shrink-0" />
                    </button>
                  </Tooltip>
                  <Tooltip content="پیشاندانی خشتەیی" side="bottom">
                    <button
                      onClick={() => onViewModeChange("table")}
                      className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 cursor-pointer ${viewMode === "table" ? "shadow-md text-white" : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"}`}
                      style={
                        viewMode === "table"
                          ? { background: "var(--theme-css, #64748b)" }
                          : undefined
                      }
                      aria-label="Table view"
                    >
                      <Table2 className="h-4 w-4 shrink-0" />
                    </button>
                  </Tooltip>
                </div>
                <Tooltip content="دروستکردنی پەیجی نوێ" side="bottom">
                  <button
                    type="button"
                    onClick={onCreate}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>پەیجی نوێ</span>
                  </button>
                </Tooltip>
              </div>
            }
          />
          <div className="border-t border-slate-100 dark:border-white/5 pt-6">
            {viewMode === "grid" ? (
              <LinktreesGrid
                data={displayedLinktrees}
                isLoading={isLoading}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onViewAnalytics={onViewAnalytics}
                onToggleCampaign={onToggleCampaign}
                onToggleArchive={onToggleArchive}
                onToggleStatus={onToggleStatus}
                showLinktreeMeta
                emptyTitle={
                  archiveFilter === "archived"
                    ? "هیچ پەڕەیەکی ئەرشیفکراو نییە"
                    : undefined
                }
                emptyDescription={
                  archiveFilter === "archived"
                    ? "ئەو پەڕانەی بە دەستی ئەرشیفیان دەکەیت لێرەدا دەردەکەون."
                    : undefined
                }
              />
            ) : (
              <LinktreesTable
                data={displayedLinktrees}
                isLoading={isLoading}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onViewAnalytics={onViewAnalytics}
                onToggleCampaign={onToggleCampaign}
                onToggleArchive={onToggleArchive}
                onToggleStatus={onToggleStatus}
                showLinktreeMeta
                emptyTitle={
                  archiveFilter === "archived"
                    ? "هیچ پەڕەیەکی ئەرشیفکراو نییە"
                    : undefined
                }
                emptyDescription={
                  archiveFilter === "archived"
                    ? "ئەو پەڕانەی بە دەستی ئەرشیفیان دەکەیت لێرەدا دەردەکەون."
                    : undefined
                }
              />
            )}
          </div>
        </DashboardSurface>
      )}
    </>
  );
}
