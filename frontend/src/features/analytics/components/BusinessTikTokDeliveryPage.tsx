"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  MousePointerClick,
  RefreshCw,
  Send,
  Server,
  Target,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { LockedNotice } from "@/components/shared/LockedContent";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonTikTokDelivery } from "@/components/shared/SkeletonPageLayouts";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { Tooltip } from "@/components/shared/Tooltip";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";

type Period = "today" | "7d" | "30d" | "90d" | "lifetime";

interface AnalyticsAsset {
  id: string;
  type: "linktree" | "mini_website";
  name: string;
}

interface TikTokHealth {
  connections: number;
  browserEvents: number;
  serverEvents: number;
  delivered: number;
  retrying: number;
  failed: number;
  deliveryRate: number;
  reconciliation: {
    internalConversions: number;
    serverAcceptedConversions: number;
  };
}

const EMPTY_HEALTH: TikTokHealth = {
  connections: 0,
  browserEvents: 0,
  serverEvents: 0,
  delivered: 0,
  retrying: 0,
  failed: 0,
  deliveryRate: 0,
  reconciliation: {
    internalConversions: 0,
    serverAcceptedConversions: 0,
  },
};

const periodOptions = [
  { value: "today" as const, label: "ئەمڕۆ" },
  { value: "7d" as const, label: "7 ڕۆژ" },
  { value: "30d" as const, label: "30 ڕۆژ" },
  { value: "90d" as const, label: "90 ڕۆژ" },
  { value: "lifetime" as const, label: "هەموو کات" },
];

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function requestData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new RequestError(
      payload.message || "داواکارییەکە سەرکەوتوو نەبوو",
      response.status,
    );
  }
  return payload.data as T;
}

function dateRange(period: Period): { from?: string; to?: string } {
  if (period === "lifetime") return {};
  const to = new Date();
  const from = new Date(to);
  from.setDate(
    from.getDate() - (period === "today" ? 0 : Number(period.slice(0, -1)) - 1),
  );
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: format(from), to: format(to) };
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function BusinessTikTokDeliveryPage() {
  const requestId = useRef(0);
  const [assets, setAssets] = useState<AnalyticsAsset[]>([]);
  const [scope, setScope] = useState("all");
  const [period, setPeriod] = useState<Period>("30d");
  const [health, setHealth] = useState<TikTokHealth>(EMPTY_HEALTH);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locked, setLocked] = useState(false);

  const scopeOptions = useMemo(
    () => [
      { value: "all", label: "هەموو پەڕەکان" },
      ...assets.map((asset) => ({
        value: `page:${asset.id}`,
        label: `${asset.type === "linktree" ? "پەڕەی لینک" : "وێبسایتی بچووک"} · ${asset.name}`,
      })),
    ],
    [assets],
  );

  const healthUrl = useMemo(() => {
    const params = new URLSearchParams();
    const range = dateRange(period);
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    if (scope.startsWith("page:")) params.set("pageId", scope.slice(5));
    const query = params.toString();
    return `/api/analytics/v2/tiktok/health${query ? `?${query}` : ""}`;
  }, [period, scope]);

  const load = useCallback(async (showError = false) => {
    const currentRequest = ++requestId.current;
    try {
      const [nextAssets, nextHealth] = await Promise.all([
        requestData<AnalyticsAsset[]>("/api/analytics/v2/pages"),
        requestData<TikTokHealth>(healthUrl),
      ]);
      if (currentRequest !== requestId.current) return;
      setAssets(nextAssets);
      setHealth(nextHealth);
      setLocked(false);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      if (error instanceof RequestError && error.status === 403) {
        setLocked(true);
        setHealth(EMPTY_HEALTH);
        return;
      }
      if (showError) toast.error("دۆخی ڕووداوەکانی TikTok نوێ نەکرایەوە");
      throw error;
    }
  }, [healthUrl]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true);
    } catch {
      // The user-facing error is shown by load.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [load]);

  useRegisterBusinessDashboardRefresh("analytics:tracking", refresh);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void load()
        .catch(() => undefined)
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const retryFailed = async () => {
    setRefreshing(true);
    try {
      const pageId = scope.startsWith("page:") ? scope.slice(5) : null;
      const suffix = pageId ? `?pageId=${encodeURIComponent(pageId)}` : "";
      const result = await requestData<{ retried: number }>(
        `/api/analytics/v2/tiktok/retry-failed${suffix}`,
        { method: "POST" },
      );
      toast.success(`${formatNumber(result.retried)} ڕووداو دووبارە نێردرایەوە`);
      await load();
    } catch {
      toast.error("هەوڵدانەوەی ناردن سەرکەوتوو نەبوو");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <SkeletonTikTokDelivery />;

  return (
    <DashboardSurface>
      <PageHeader
        icon={Target}
        title="دۆخی گەیاندنی TikTok"
        description="پشکنینی Pixel و Events API؛ ئەگەر ڕووداوێک نەگات، لێرە دەردەکەوێت."
        action={
          <Tooltip content="نوێکردنەوەی دۆخی گەیاندن" side="bottom">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-busy={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 cursor-pointer"
              aria-label="نوێکردنەوە"
            >
              <MotionSpinner active={refreshing}>
                <RefreshCw className="h-4 w-4" />
              </MotionSpinner>
            </button>
          </Tooltip>
        }
      />

      <div className="grid gap-3 border-t border-slate-100 py-5 dark:border-white/5 sm:grid-cols-2">
        <CustomSelect
          label="پەڕە"
          value={scope}
          options={scopeOptions}
          onChange={setScope}
        />
        <CustomSelect
          label="ماوەی کات"
          value={period}
          options={periodOptions}
          onChange={setPeriod}
        />
      </div>

      {locked ? (
        <LockedNotice
          icon={Target}
          title="وردەکاریی گەیاندن لە پلانەکەتدا نییە"
          description="ڕێکخستنی Pixel و Events API بەردەستە، بەڵام دۆخی وردی ڕووداوەکان پێویستی بە پلانی بەرزتر هەیە."
        />
      ) : (
        <div className="space-y-6">
          <div
            className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${
              health.failed > 0
                ? "border-red-200 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/[0.06]"
                : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]"
            }`}
          >
            <div className="flex items-start gap-3">
              {health.failed > 0 ? (
                <X className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              )}
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {health.failed > 0
                    ? "هەندێک ڕووداو نەگەیشتووە"
                    : "گەیاندنی ڕووداوەکان ئاساییە"}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  ڕێژەی گەیاندن: {health.deliveryRate.toFixed(1)}٪
                </p>
              </div>
            </div>
            {health.failed > 0 && (
              <Tooltip content="دووبارە هەوڵدانەوەی ناردنی ڕووداوە سەرنەکەوتووەکان" side="top">
                <button
                  type="button"
                  onClick={() => void retryFailed()}
                  disabled={refreshing}
                  className="h-10 shrink-0 rounded-xl px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:opacity-60 cursor-pointer"
                >
                  دووبارە هەوڵدانەوە
                </button>
              </Tooltip>
            )}
          </div>

          <StatCardGrid>
            <StatCard icon={MousePointerClick} label="ڕووداوی وێبگەڕ" value={formatNumber(health.browserEvents)} color="purple" />
            <StatCard icon={Server} label="ڕووداوی Events API" value={formatNumber(health.serverEvents)} color="blue" />
            <StatCard icon={Send} label="گەیشتوو" value={formatNumber(health.delivered)} color="green" />
            <StatCard icon={TriangleAlert} label="نەگەیشتوو" value={formatNumber(health.failed)} color="orange" />
          </StatCardGrid>

          <div className="rounded-2xl border border-slate-200/80 p-5 dark:border-white/10">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              بەراوردکردنی ئەنجامەکان
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              گۆڕانە تۆمارکراوەکانی MultiTree بە گۆڕانە وەرگیراوەکانی TikTok بەراورد دەکات.
            </p>
            <div className="mt-4 grid grid-cols-2 divide-x divide-slate-100 dark:divide-white/5">
              <StatCard color="green" label="تۆمارکراو لە MultiTree" value={formatNumber(health.reconciliation.internalConversions)} variant="comparison" />
              <StatCard color="blue" label="وەرگیراو لەلایەن TikTok" value={formatNumber(health.reconciliation.serverAcceptedConversions)} variant="comparison" />
            </div>
          </div>
        </div>
      )}
    </DashboardSurface>
  );
}
