import type {
  BusinessDashboardAnalyticsSummary,
  BusinessDashboardPageAsset,
  BusinessDashboardTikTokHealth,
  EffectiveAccessManifest,
} from "@linktree/types";

export interface DashboardDateRange {
  from?: string;
  to?: string;
}

export interface DashboardDateRanges {
  current: DashboardDateRange;
  previous: DashboardDateRange | null;
}

export type DashboardPeriod = "today" | "7d" | "30d" | "90d" | "lifetime";

export const DASHBOARD_PERIOD_OPTIONS = [
  { value: "today" as const, label: "ئەمڕۆ" },
  { value: "7d" as const, label: "7 ڕۆژ" },
  { value: "30d" as const, label: "30 ڕۆژ" },
  { value: "90d" as const, label: "90 ڕۆژ" },
  { value: "lifetime" as const, label: "هەموو کات" },
];

export interface DashboardAttentionItem {
  id: string;
  label: string;
  href: string;
  tone: "amber" | "rose" | "blue";
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBefore(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() - days);
  return result;
}

export function dashboardDateRanges(
  period: DashboardPeriod = "7d",
  now = new Date(),
): DashboardDateRanges {
  if (period === "lifetime") return { current: {}, previous: null };
  const days = period === "today" ? 1 : Number(period.slice(0, -1));
  return {
    current: {
      from: localDate(daysBefore(now, days - 1)),
      to: localDate(now),
    },
    previous: {
      from: localDate(daysBefore(now, days * 2 - 1)),
      to: localDate(daysBefore(now, days)),
    },
  };
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function summaryTrendLabel(current: number, previous: number): string {
  const change = percentageChange(current, previous);
  if (change === null) return "داتای نوێ لەم ماوەیە";
  if (change === 0) return "بێ گۆڕان بەراورد بە ماوەی پێشوو";
  const direction = change > 0 ? "زیادبوون" : "کەمبوونەوە";
  return `${Math.abs(change).toLocaleString(undefined, { maximumFractionDigits: 1 })}% ${direction}`;
}

export function publishedCount(
  pages: BusinessDashboardPageAsset[],
  type: BusinessDashboardPageAsset["type"],
) {
  return pages.filter(
    (page) => page.type === type && page.status === "published",
  ).length;
}

export function buildDashboardAttentionItems({
  crmNewLeads,
  tikTok,
  access,
}: {
  crmNewLeads: number;
  tikTok: BusinessDashboardTikTokHealth | null;
  access: EffectiveAccessManifest;
}): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];
  if (crmNewLeads > 0) {
    items.push({
      id: "new-leads",
      label: `${crmNewLeads.toLocaleString()} داواکاری نوێ پێویستی بە بەدواداچوون هەیە`,
      href: "/business/crm",
      tone: "blue",
    });
  }
  if (tikTok?.failed) {
    items.push({
      id: "tiktok-failures",
      label: `${tikTok.failed.toLocaleString()} ڕووداوی TikTok نەنێردراوە`,
      href: "/business/tiktok-config",
      tone: "rose",
    });
  }
  for (const [key, usage] of Object.entries(access.usage)) {
    if (usage.limit <= 0 || usage.used / usage.limit < 0.8) continue;
    const label =
      key === "limit.linktrees"
        ? "سنووری پەیجەکان"
        : key === "limit.tiktok_pixels"
          ? "سنووری TikTok Pixel"
          : null;
    if (!label) continue;
    items.push({
      id: `usage-${key}`,
      label: `${label}: ${usage.used.toLocaleString()} لە ${usage.limit.toLocaleString()} بەکارهاتووە`,
      href: "/business/settings",
      tone: usage.remaining === 0 ? "rose" : "amber",
    });
  }
  return items;
}

export const EMPTY_DASHBOARD_SUMMARY: BusinessDashboardAnalyticsSummary = {
  total_views: 0,
  unique_views: 0,
  total_clicks: 0,
  unique_clicks: 0,
  conversions: 0,
  conversion_value: 0,
};
