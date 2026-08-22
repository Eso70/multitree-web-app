"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Globe2,
  KeyRound,
  LockKeyhole,
  MousePointerClick,
  Radar,
  RefreshCw,
  Search,
} from "lucide-react";
import type { EffectiveAccessManifest } from "@linktree/types";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { LockedContent } from "@/components/shared/LockedContent";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { StatCard } from "@/components/shared/StatCard";
import { SkeletonDashboardPage } from "@/components/shared/Skeleton";
import { BusinessAnalyticsPage } from "./BusinessAnalyticsPage";
import { BusinessTikTokPixelConfigPage } from "./BusinessTikTokPixelConfigPage";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

type TrackingTab = "delivery" | "config";

const tabs = [
  { id: "delivery" as const, label: "ڕووداوەکان", icon: Radar },
  { id: "config" as const, label: "TikTok Pixel و Events API", icon: Globe2 },
];

interface TrackingSummary {
  browserEvents: number;
  deliveryRate: number;
}

const EMPTY_TRACKING_SUMMARY: TrackingSummary = {
  browserEvents: 0,
  deliveryRate: 0,
};

function canReadDelivery(access: EffectiveAccessManifest | null): boolean {
  const planCode = access?.subscription.planCode.toLowerCase();
  return (
    planCode !== "basic" &&
    planCode !== "pro" &&
    access?.permissions["business:analytics:tiktok-health-read"]?.outcome ===
      "allow"
  );
}

function configCounts(settings: unknown): {
  configuredPixels: number;
  apiConnections: number;
} {
  const data =
    settings && typeof settings === "object"
      ? (settings as Record<string, unknown>)
      : {};
  const configs = Array.isArray(data.tiktok_configs) ? data.tiktok_configs : [];
  return {
    configuredPixels: configs.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).pixel_id === "string" &&
        Boolean(((item as Record<string, unknown>).pixel_id as string).trim()),
    ).length,
    apiConnections: configs.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        Boolean(
          (item as Record<string, unknown>).has_events_token ||
          (item as Record<string, unknown>).token_last_four,
        ),
    ).length,
  };
}

export function BusinessTikTokConfigPage() {
  const [tab, setTab] = useState<TrackingTab>("delivery");
  const [access, setAccess] = useState<EffectiveAccessManifest | null>(null);
  const [configuredPixels, setConfiguredPixels] = useState(0);
  const [apiConnections, setApiConnections] = useState(0);
  const [summary, setSummary] = useState<TrackingSummary>(
    EMPTY_TRACKING_SUMMARY,
  );
  const [loading, setLoading] = useState(true);

  const applyAccess = useCallback(
    async (next: EffectiveAccessManifest, rethrow = false) => {
      setAccess(next);
      if (!canReadDelivery(next)) {
        setSummary(EMPTY_TRACKING_SUMMARY);
        return;
      }
      try {
        const response = await fetch("/api/analytics/v2/tiktok/health", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load summary");
        const payload = await response.json();
        setSummary({
          browserEvents: Number(payload.data?.browserEvents || 0),
          deliveryRate: Number(payload.data?.deliveryRate || 0),
        });
      } catch (error) {
        if (rethrow) throw error;
      }
    },
    [],
  );

  const loadTracking = useCallback(
    async (rethrow = false) => {
      try {
        const [accessResponse, settingsResponse] = await Promise.all([
          fetch("/api/auth/effective-access", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/auth/settings", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        if (!accessResponse.ok || !settingsResponse.ok) {
          throw new Error("Failed to load Event Tracking");
        }
        const [accessPayload, settingsPayload] = await Promise.all([
          accessResponse.json(),
          settingsResponse.json(),
        ]);
        const counts = configCounts(settingsPayload.data);
        setConfiguredPixels(counts.configuredPixels);
        setApiConnections(counts.apiConnections);
        await applyAccess(accessPayload.data, rethrow);
      } catch (error) {
        if (rethrow) throw error;
      }
    },
    [applyAccess],
  );

  useRegisterBusinessDashboardRefresh("tiktok-config", () =>
    loadTracking(true),
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void loadTracking().finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 0);

    const syncAccess = (event: Event) => {
      const detail = (event as CustomEvent<EffectiveAccessManifest>).detail;
      if (detail) void applyAccess(detail);
    };
    const syncSettings = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      const counts = configCounts(detail);
      setConfiguredPixels(counts.configuredPixels);
      setApiConnections(counts.apiConnections);
    };
    window.addEventListener("multitree:access-updated", syncAccess);
    window.addEventListener(
      "multitree:business-settings-updated",
      syncSettings,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("multitree:access-updated", syncAccess);
      window.removeEventListener(
        "multitree:business-settings-updated",
        syncSettings,
      );
    };
  }, [applyAccess, loadTracking]);

  const deliveryAllowed = canReadDelivery(access);
  const lockedAction = (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-lg"
      style={{
        background: "color-mix(in srgb, var(--theme-primary) 12%, transparent)",
        color: "var(--theme-primary)",
      }}
      title="لە پلانی بەرزتردا بەردەستە"
    >
      <LockKeyhole className="h-3.5 w-3.5" />
    </span>
  );

  if (loading) {
    return (
      <SkeletonDashboardPage body="analytics" statCount={4} tabCount={2} />
    );
  }

  return (
    <div
      dir="ltr"
      className="theme-custom-scrollbar selection:bg-brand-500/30 dark:selection:bg-brand-500/40"
    >
      <StatCardGrid className="mb-6">
        <StatCard
          icon={Radar}
          label="Pixelی ڕێکخراو"
          value={configuredPixels}
          color="blue"
        />
        <StatCard
          icon={KeyRound}
          label="Events APIی چالاک"
          value={apiConnections}
          color="green"
        />
        <StatCard
          icon={MousePointerClick}
          label="ڕووداوی وێبگەڕ"
          value={deliveryAllowed ? summary.browserEvents : "—"}
          subtitle={deliveryAllowed ? undefined : "لە پلانی بەرزتردا بەردەستە"}
          color="purple"
          action={deliveryAllowed ? undefined : lockedAction}
        />
        <StatCard
          icon={Activity}
          label="ڕێژەی سەرکەوتن"
          value={deliveryAllowed ? `${summary.deliveryRate.toFixed(1)}٪` : "—"}
          subtitle={deliveryAllowed ? undefined : "لە پلانی بەرزتردا بەردەستە"}
          color="amber"
          action={deliveryAllowed ? undefined : lockedAction}
        />
      </StatCardGrid>

      <div className="mb-5">
        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === "config" ? (
        <BusinessTikTokPixelConfigPage />
      ) : deliveryAllowed ? (
        <BusinessAnalyticsPage surface="tracking" />
      ) : (
        <LockedContent
          locked
          className="min-h-[520px]"
          contentClassName="min-h-[520px]"
          title={`${DASHBOARD_PAGE_LABELS.tiktokSettings} قوفڵە`}
          description="ڕێکخستنی Pixel و Events API بەردەستە، بەڵام وردەکاریی ڕووداوەکان پێویستی بە پلانی بەرزتر هەیە."
        >
          <DashboardSurface className="min-h-[520px]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  <Radar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
                    {DASHBOARD_PAGE_LABELS.tiktokSettings}
                  </h2>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                    دۆخی ڕووداوەکانی TikTok بە شێوەیەکی سادە ببینە.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/5">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div className="flex h-10 w-44 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 dark:border-white/10 dark:bg-white/5">
                  <Search className="h-4 w-4" />
                  <span className="text-xs">هەموو پەڕەکان</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-8 border-t border-slate-100 pt-6 dark:border-white/5 xl:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      هەموو شتێک ئاساییە
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      ئەگەر کێشەیەک هەبێت، لێرە دەردەکەوێت.
                    </p>
                  </div>
                </div>
                <div className="mt-5 h-10 w-44 rounded-xl bg-emerald-200/70 dark:bg-emerald-500/15" />
              </div>

              <div className="rounded-2xl border border-slate-200/80 p-5 dark:border-white/10">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  بەراوردکردنی ئەنجامەکان
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  ئەنجامی ناوخۆ لەگەڵ ڕووداوە وەرگیراوەکانی TikTok بەراورد
                  دەکرێت.
                </p>
                <div className="mt-5 grid grid-cols-2 divide-x divide-slate-100 dark:divide-white/5">
                  <StatCard
                    className="p-4"
                    color="green"
                    label="پشتڕاستکراوەی ناوخۆ"
                    value="—"
                    variant="comparison"
                  />
                  <StatCard
                    className="p-4"
                    color="blue"
                    label="وەرگیراو لەلایەن TikTok"
                    value="—"
                    variant="comparison"
                  />
                </div>
              </div>
            </div>
          </DashboardSurface>
        </LockedContent>
      )}
    </div>
  );
}
