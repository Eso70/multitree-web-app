"use client";

import { useState } from "react";
import {
  Eye,
  FileText,
  LayoutDashboard,
  MousePointerClick,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { EffectiveAccessManifest } from "@linktree/types";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { AccentActionButton } from "@/components/shared/AccentActionButton";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonDashboardPage } from "@/components/shared/Skeleton";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import {
  DashboardAttentionList,
  DashboardContentStatus,
  DashboardOperations,
  DashboardPlanUsage,
  DashboardQuickActions,
  DashboardTopPages,
} from "@/features/business/components/BusinessDashboardOverviewSections";
import {
  buildDashboardAttentionItems,
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardPeriod,
  summaryTrendLabel,
} from "@/features/business/dashboard-overview-utils";
import { useBusinessDashboardOverview } from "@/features/business/hooks/useBusinessDashboardOverview";

export function BusinessDashboardOverviewPage({
  access,
}: {
  access: EffectiveAccessManifest | null;
}) {
  if (!access) {
    return <SkeletonDashboardPage statCount={6} body="analytics" />;
  }
  return <BusinessDashboardOverviewContent access={access} />;
}

function BusinessDashboardOverviewContent({
  access,
}: {
  access: EffectiveAccessManifest;
}) {
  const [period, setPeriod] = useState<DashboardPeriod>("7d");
  const overview = useBusinessDashboardOverview(access, period);

  if (overview.loading) {
    return <SkeletonDashboardPage statCount={6} body="analytics" />;
  }

  if (overview.error) {
    return (
      <DashboardSurface className="py-12 text-center" role="alert">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          داتاکانی داشبۆرد بارنەکران
        </p>
        <p className="mt-2 text-xs text-slate-400">
          پەیوەندییەکە بپشکنە و دووبارە هەوڵ بدەوە
        </p>
        <AccentActionButton
          onClick={() => void overview.refresh()}
          className="mt-4"
        >
          دووبارە هەوڵ بدەوە
        </AccentActionButton>
      </DashboardSurface>
    );
  }

  const attentionItems = buildDashboardAttentionItems({
    crmNewLeads: overview.crm?.statuses.new || 0,
    tikTok: overview.tikTok,
    access,
  });
  const canUseMiniWebsites =
    access.permissions["business:pages:mini-websites-access"]?.outcome ===
    "allow";
  const actionRate =
    overview.current.total_views > 0
      ? (
          (overview.current.total_clicks / overview.current.total_views) *
          100
        ).toFixed(1)
      : "0.0";
  const trend = (current: number, previous: number) =>
    period === "lifetime"
      ? "هەموو کات"
      : summaryTrendLabel(current, previous);

  return (
    <>
      <StatCardGrid columns={3} className="mb-8">
        <StatCard
          icon={FileText}
          label="کۆی پەیجەکان"
          value={overview.pages.length}
          color="blue"
          subtitle={`${overview.pages.filter((page) => page.status === "published").length.toLocaleString()} بڵاوکراوە`}
        />
        <StatCard
          icon={Eye}
          label="کۆی بینینەکان"
          value={overview.current.total_views}
          color="purple"
          subtitle={trend(
            overview.current.total_views,
            overview.previous.total_views,
          )}
        />
        <StatCard
          icon={Users}
          label="بینەری تاک"
          value={overview.current.unique_views}
          color="slate"
          subtitle={trend(
            overview.current.unique_views,
            overview.previous.unique_views,
          )}
        />
        <StatCard
          icon={MousePointerClick}
          label="کۆی کردارەکان"
          value={overview.current.total_clicks}
          color="green"
          subtitle={trend(
            overview.current.total_clicks,
            overview.previous.total_clicks,
          )}
        />
        <StatCard
          icon={Target}
          label="ڕێژەی کردار"
          value={`${actionRate}%`}
          color="orange"
          subtitle="کردار ÷ بینین"
        />
        <StatCard
          icon={TrendingUp}
          label="گۆڕانەکان"
          value={overview.current.conversions}
          color="pink"
          subtitle={trend(
            overview.current.conversions,
            overview.previous.conversions,
          )}
        />
      </StatCardGrid>

      <DashboardSurface as="div" className="space-y-6">
        <PageHeader
          title="داشبۆرد"
          description="پوختەی ڕاستەقینەی کارایی، ناوەڕۆک، داواکارییەکان و دۆخی سیستەمەکەت"
          icon={LayoutDashboard}
          action={
            <div className="flex items-center gap-2">
              <CustomSelect
                label="ماوەی کات"
                hideLabel
                fullWidth={false}
                value={period}
                options={DASHBOARD_PERIOD_OPTIONS}
                onChange={setPeriod}
                disabled={overview.refreshing}
                triggerClassName="min-w-28 sm:min-w-32"
              />
              <button
                type="button"
                onClick={() => void overview.refresh()}
                disabled={overview.refreshing}
                aria-busy={overview.refreshing}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                title="نوێکردنەوە"
              >
                <MotionSpinner active={overview.refreshing}>
                  <RefreshCw className="h-4 w-4 -transform" />
                </MotionSpinner>
              </button>
            </div>
          }
        />

        <div className="space-y-6 border-t border-slate-100 pt-6 dark:border-white/5">
          {overview.partialError && (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/[0.07] dark:text-amber-300"
            >
              هەندێک داتای لاوەکی بەردەست نییە؛ ئامار و دۆخی پەیجەکان دروستن
            </div>
          )}

          <DashboardQuickActions
            canUseMiniWebsites={canUseMiniWebsites}
            canUseCrm={overview.canReadCrm}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <DashboardContentStatus pages={overview.pages} />
            <DashboardTopPages pages={overview.pages} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <DashboardAttentionList items={attentionItems} />
            <DashboardOperations
              crm={overview.crm}
              tikTok={overview.tikTok}
              canReadCrm={overview.canReadCrm}
              canReadTikTok={overview.canReadTikTok}
            />
          </div>

          <DashboardPlanUsage access={access} />
        </div>
      </DashboardSurface>
    </>
  );
}
