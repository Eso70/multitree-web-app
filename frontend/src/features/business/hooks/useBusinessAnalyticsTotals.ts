"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getBusinessAnalyticsSummary,
  type AnalyticsPageType,
} from "@/features/business/api";

export interface BusinessAnalyticsTotals {
  total_views: number;
  unique_views: number;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  conversion_value: number;
}

export const EMPTY_BUSINESS_ANALYTICS_TOTALS: BusinessAnalyticsTotals = {
  total_views: 0,
  unique_views: 0,
  total_clicks: 0,
  unique_clicks: 0,
  conversions: 0,
  conversion_value: 0,
};

function numeric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function useBusinessAnalyticsTotals(
  pageType?: AnalyticsPageType,
  enabled = true,
) {
  const [totals, setTotals] = useState<BusinessAnalyticsTotals>(
    EMPTY_BUSINESS_ANALYTICS_TOTALS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadedRef = useRef(false);

  const refresh = useCallback(async (options?: { rethrow?: boolean }) => {
    if (loadedRef.current) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const data = await getBusinessAnalyticsSummary(pageType);
      setTotals({
        total_views: numeric(data.total_views),
        unique_views: numeric(data.unique_views),
        total_clicks: numeric(data.total_clicks),
        unique_clicks: numeric(data.unique_clicks),
        conversions: numeric(data.conversions),
        conversion_value: numeric(data.conversion_value),
      });
    } catch (error) {
      console.error("Error fetching analytics totals:", error);
      if (options?.rethrow) throw error;
    } finally {
      loadedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [pageType]);

  useEffect(() => {
    if (!enabled) return;
    const frame = window.requestAnimationFrame(() => void refresh());
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, refresh]);

  const hasData = useMemo(
    () =>
      totals.total_views > 0 ||
      totals.unique_views > 0 ||
      totals.total_clicks > 0 ||
      totals.unique_clicks > 0 ||
      totals.conversions > 0,
    [totals],
  );

  const reset = useCallback(() => {
    setTotals(EMPTY_BUSINESS_ANALYTICS_TOTALS);
  }, []);

  return { totals, hasData, isLoading, isRefreshing, refresh, reset };
}
