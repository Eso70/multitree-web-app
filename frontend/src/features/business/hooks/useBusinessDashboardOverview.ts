"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BusinessDashboardCrmSummary,
  BusinessDashboardPageAsset,
  BusinessDashboardTikTokHealth,
  EffectiveAccessManifest,
} from "@linktree/types";
import {
  getDashboardAnalyticsSummary,
  getDashboardCrmSummary,
  getDashboardPages,
  getDashboardTikTokHealth,
} from "@/features/business/dashboard-overview-api";
import {
  dashboardDateRanges,
  type DashboardPeriod,
  EMPTY_DASHBOARD_SUMMARY,
} from "@/features/business/dashboard-overview-utils";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";

export function useBusinessDashboardOverview(
  access: EffectiveAccessManifest,
  period: DashboardPeriod,
) {
  const ranges = useMemo(() => dashboardDateRanges(period), [period]);
  const [current, setCurrent] = useState(EMPTY_DASHBOARD_SUMMARY);
  const [previous, setPrevious] = useState(EMPTY_DASHBOARD_SUMMARY);
  const [pages, setPages] = useState<BusinessDashboardPageAsset[]>([]);
  const [crm, setCrm] = useState<BusinessDashboardCrmSummary | null>(null);
  const [tikTok, setTikTok] =
    useState<BusinessDashboardTikTokHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [partialError, setPartialError] = useState(false);
  const loaded = useRef(false);
  const requestId = useRef(0);

  const canReadCrm =
    access.subscription.planCode.toLowerCase() === "ultra" &&
    access.permissions["business:analytics:details-read"]?.outcome === "allow";
  const canReadTikTok =
    access.permissions["business:analytics:tiktok-health-read"]?.outcome ===
    "allow";

  const load = useCallback(
    async (rethrow = false) => {
      const currentRequestId = ++requestId.current;
      let partialFailure: Error | null = null;
      const hadLoadedData = loaded.current;
      if (hadLoadedData) setRefreshing(true);
      else setLoading(true);
      if (!hadLoadedData) setError(false);
      setPartialError(false);
      try {
        const [nextCurrent, nextPrevious, nextPages] = await Promise.all([
          getDashboardAnalyticsSummary(ranges.current),
          ranges.previous
            ? getDashboardAnalyticsSummary(ranges.previous)
            : Promise.resolve(EMPTY_DASHBOARD_SUMMARY),
          getDashboardPages(ranges.current),
        ]);
        if (currentRequestId !== requestId.current) return;
        setCurrent(nextCurrent);
        setPrevious(nextPrevious);
        setPages(nextPages);
        loaded.current = true;

        const [crmResult, tikTokResult] = await Promise.allSettled([
          canReadCrm
            ? getDashboardCrmSummary(ranges.current)
            : Promise.resolve(null),
          canReadTikTok
            ? getDashboardTikTokHealth(ranges.current)
            : Promise.resolve(null),
        ]);
        if (currentRequestId !== requestId.current) return;
        const hasPartialFailure =
          crmResult.status === "rejected" || tikTokResult.status === "rejected";
        setCrm(crmResult.status === "fulfilled" ? crmResult.value : null);
        setTikTok(
          tikTokResult.status === "fulfilled" ? tikTokResult.value : null,
        );
        setPartialError(hasPartialFailure);
        if (hasPartialFailure)
          partialFailure = new Error(
            "Some dashboard services could not be refreshed",
          );
      } catch (loadError) {
        if (currentRequestId !== requestId.current) return;
        console.error("Error loading business dashboard overview:", loadError);
        if (hadLoadedData) setPartialError(true);
        else setError(true);
        if (rethrow) throw loadError;
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
      if (partialFailure && rethrow) throw partialFailure;
    }, [canReadCrm, canReadTikTok, ranges]);

  useRegisterBusinessDashboardRefresh("dashboard-overview", () => load(true));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  return {
    current,
    previous,
    pages,
    crm,
    tikTok,
    canReadCrm,
    canReadTikTok,
    loading,
    refreshing,
    error,
    partialError,
    refresh: load,
  };
}
