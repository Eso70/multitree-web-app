"use client";

import { useState } from "react";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import {
  ClipboardList,
  LayoutGrid,
  Link2,
  RefreshCw,
  Search,
  Table2,
  Users,
  UserCheck,
  Clock3,
  X,
} from "lucide-react";
import { ProfileChangeRequests } from "@/features/platform-admin/components/ProfileChangeRequests";
import { StatCard } from "@/components/shared/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import type { PlatformBusiness as Business } from "@linktree/types";
import type {
  BusinessPagination,
  BusinessSummary,
} from "@/features/platform-admin/hooks/useBusinesses";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { SignupApplicationsPanel } from "@/features/platform-admin/components/SignupApplicationsPanel";
import { InvitationCreator } from "@/features/platform-admin/components/InvitationCreator";
import {
  SegmentedTabs,
  type SegmentedTab,
} from "@/components/shared/SegmentedTabs";
import { PlatformBusinessDirectoryContent } from "@/features/platform-admin/components/PlatformBusinessDirectoryContent";

type BusinessManagementSection = "businesses" | "applications";

interface PlatformBusinessesPageProps {
  businesses: Business[];
  filteredBusinesses: Business[];
  isRefreshing: boolean;
  searchQuery: string;
  isSearchModalOpen: boolean;
  viewMode: "grid" | "table";
  page: number;
  pagination: BusinessPagination;
  summary: BusinessSummary;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onSearchAction: () => void;
  onViewModeChange: (viewMode: "grid" | "table") => void;
  onEdit: (business: Business) => void;
  onDelete: (id: string) => void;
  onViewAnalytics: (business: Business) => void;
  onManageSessions: (business: Business) => void;
  onOpenDashboard: (business: Business) => void;
}

export function PlatformBusinessesPage({
  businesses,
  filteredBusinesses,
  isRefreshing,
  searchQuery,
  isSearchModalOpen,
  viewMode,
  page,
  pagination,
  summary,
  onPageChange,
  onRefresh,
  onSearchAction,
  onViewModeChange,
  onEdit,
  onDelete,
  onViewAnalytics,
  onManageSessions,
  onOpenDashboard,
}: PlatformBusinessesPageProps) {
  const [section, setSection] =
    useState<BusinessManagementSection>("businesses");
  const [applicationReloadToken, setApplicationReloadToken] = useState(0);
  const tabs: SegmentedTab<BusinessManagementSection>[] = [
    {
      id: "businesses",
      label: "بزنسەکان",
      icon: Users,
    },
    {
      id: "applications",
      label: "داواکارییەکان",
      icon: ClipboardList,
    },
  ];

  return (
    <>
      <StatCardGrid columns={3} className="mb-8">
        <StatCard
          icon={Users}
          label="کۆی بزنسەکان"
          value={summary.total}
          color="blue"
        />
        <StatCard
          icon={UserCheck}
          label="چالاک"
          value={summary.active}
          color="green"
        />
        <StatCard
          icon={Clock3}
          label="ڕاگیراو"
          value={summary.suspended}
          color="orange"
        />
        <StatCard
          icon={ClipboardList}
          label="داواکاری چاوەڕوان"
          value={summary.pendingApplications}
          color="purple"
        />
        <StatCard
          icon={ClipboardList}
          label="کۆی داواکارییەکان"
          value={summary.totalApplications}
          color="slate"
        />
        <StatCard
          icon={Link2}
          label="بانگهێشتنامەی چالاک"
          value={summary.activeInvitations}
          color="pink"
        />
      </StatCardGrid>

      <ProfileChangeRequests />

      <SegmentedTabs
        fullWidth
        tabs={tabs}
        value={section}
        onChange={setSection}
        accent="var(--multitree-accent)"
        className="mb-6"
      />

      <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6 space-y-6">
        <PageHeader
          title={section === "businesses" ? "بزنسەکان" : "داواکارییەکان"}
          description={
            section === "businesses"
              ? "بزنسەکان دروست و بەڕێوە ببە، زانیاری و دۆخیان ببینە و چالاکییەکانیان کۆنترۆڵ بکە."
              : "بزنسەکان، داواکارییە نوێکان و بانگهێشتنامەکان لە یەک شوێن بەڕێوە ببە."
          }
          icon={Users}
          action={
            <div className="flex items-center gap-2">
              {section === "businesses" ? (
                <>
                  <button
                    onClick={onSearchAction}
                    className={`group relative flex items-center justify-center h-10 w-10 px-0 rounded-xl border transition-all duration-300 shadow-sm hover:shadow cursor-pointer ${searchQuery.trim() ? "" : "sm:w-44 sm:justify-between sm:px-3.5"} ${
                      isSearchModalOpen
                        ? "sa-soft sa-soft-border"
                        : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-750 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/10"
                    }`}
                    aria-label={searchQuery.trim() ? "Clear search" : "Search"}
                    title={
                      searchQuery.trim()
                        ? "پاککردنەوەی گەڕان"
                        : "گەڕان (Ctrl+K)"
                    }
                  >
                    {searchQuery.trim() ? (
                      <X className="h-4 w-4 text-slate-500 transition-transform group-hover:scale-110 dark:text-gray-400" />
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-gray-500 group-hover:scale-110 transition-transform" />
                          <span className="hidden sm:inline text-xs font-semibold text-slate-400 dark:text-gray-500 group-hover:text-slate-650 dark:group-hover:text-gray-300 transition-colors truncate">
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
                      className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 cursor-pointer ${viewMode === "grid" ? "sa-gradient sa-ink shadow-md" : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"}`}
                      aria-label="Grid view"
                      title="بینینی گرید"
                    >
                      <LayoutGrid className="h-4 w-4 shrink-0" />
                    </button>
                    <button
                      onClick={() => onViewModeChange("table")}
                      className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 cursor-pointer ${viewMode === "table" ? "sa-gradient sa-ink shadow-md" : "text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"}`}
                      aria-label="Table view"
                      title="بینینی خشتە"
                    >
                      <Table2 className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                </>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (section === "businesses") onRefresh();
                  else setApplicationReloadToken((value) => value + 1);
                }}
                disabled={section === "businesses" && isRefreshing}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                title="نوێکردنەوە"
                aria-label="نوێکردنەوە"
              >
                <MotionSpinner
                  active={section === "businesses" && isRefreshing}
                >
                  <RefreshCw className="h-4 w-4" />
                </MotionSpinner>
              </button>

              <InvitationCreator showLabel />
            </div>
          }
        />

        <div className={section === "applications" ? "block" : "hidden"}>
          <SignupApplicationsPanel
            onApproved={onRefresh}
            reloadToken={applicationReloadToken}
          />
        </div>
        <div className={section === "businesses" ? "block" : "hidden"}>
          <PlatformBusinessDirectoryContent
            businesses={businesses}
            filteredBusinesses={filteredBusinesses}
            viewMode={viewMode}
            page={page}
            pagination={pagination}
            onPageChange={onPageChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewAnalytics={onViewAnalytics}
            onManageSessions={onManageSessions}
            onOpenDashboard={onOpenDashboard}
          />
        </div>
      </div>
    </>
  );
}
