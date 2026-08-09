import type {
  BusinessDashboardAnalyticsSummary,
  BusinessDashboardCrmSummary,
  BusinessDashboardPageAsset,
  BusinessDashboardTikTokHealth,
} from "@linktree/types";
import { apiRequest } from "@/lib/api/request";

export interface AnalyticsRange {
  from?: string;
  to?: string;
}

export function getDashboardAnalyticsSummary({ from, to }: AnalyticsRange) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const suffix = query.size ? `?${query}` : "";
  return apiRequest<BusinessDashboardAnalyticsSummary>(
    `/api/analytics/v2/summary${suffix}`,
  );
}

function rangeSuffix({ from, to }: AnalyticsRange) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  return query.size ? `?${query}` : "";
}

export function getDashboardPages(range: AnalyticsRange) {
  return apiRequest<BusinessDashboardPageAsset[]>(
    `/api/analytics/v2/pages${rangeSuffix(range)}`,
  );
}

export function getDashboardCrmSummary(range: AnalyticsRange) {
  return apiRequest<BusinessDashboardCrmSummary>(
    `/api/analytics/v2/crm/summary${rangeSuffix(range)}`,
  );
}

export function getDashboardTikTokHealth(range: AnalyticsRange) {
  return apiRequest<BusinessDashboardTikTokHealth>(
    `/api/analytics/v2/tiktok/health${rangeSuffix(range)}`,
  );
}
