"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  Clock,
  EyeOff,
  Layers,
  RefreshCw,
  RotateCw,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { LockedNotice } from "@/components/shared/LockedContent";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonTikTokDelivery } from "@/components/shared/SkeletonPageLayouts";
import { Tooltip } from "@/components/shared/Tooltip";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import type { TikTokDeliveryError } from "@/features/analytics/api";

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

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatWhen(value: string): string {
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? "—" : at.toLocaleString("en-US");
}

function ErrorRow({ item }: { item: TikTokDeliveryError }) {
  const permanent = item.severity === "permanent";
  return (
    <li
      className={`rounded-xl border p-3.5 transition ${
        permanent
          ? "border-red-200 bg-red-50/70 dark:border-red-500/25 dark:bg-red-500/10"
          : "border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {permanent ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        ) : (
          <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <span
          className={`text-xs font-bold ${
            permanent
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {permanent ? "شکستی کۆتایی" : "هەوڵی دووبارە"}
        </span>
        {item.pixelId && (
          <span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-[11px] text-slate-600 shadow-2xs dark:bg-white/10 dark:text-slate-300">
            {item.pixelId}
          </span>
        )}
        {item.statusCode !== null && (
          <span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-[11px] text-slate-600 shadow-2xs dark:bg-white/10 dark:text-slate-300">
            HTTP {item.statusCode}
          </span>
        )}
      </div>
      <p className="mt-2 break-words text-xs text-slate-700 dark:text-slate-200">
        {item.message}
      </p>
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        {item.events} ڕووداو · {item.attempts} هەوڵ · دواین بینین لە{" "}
        {formatWhen(item.lastSeenAt)}
      </p>
    </li>
  );
}

export function BusinessTikTokDeliveryPage() {
  const requestId = useRef(0);
  const [health, setHealth] = useState<TikTokHealth>(EMPTY_HEALTH);
  const [errors, setErrors] = useState<TikTokDeliveryError[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async (showError = false) => {
    const currentRequest = ++requestId.current;
    try {
      const [nextHealth, errorPayload] = await Promise.all([
        requestData<TikTokHealth>("/api/analytics/v2/tiktok/health"),
        requestData<{ items: TikTokDeliveryError[] }>(
          "/api/analytics/v2/tiktok/errors",
        ).catch(() => ({ items: [] })),
      ]);
      if (currentRequest !== requestId.current) return;
      setHealth(nextHealth);
      setErrors(errorPayload.items || []);
      setLocked(false);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      if (error instanceof RequestError && error.status === 403) {
        setLocked(true);
        setHealth(EMPTY_HEALTH);
        setErrors([]);
        return;
      }
      if (showError) toast.error("دۆخی ڕووداوەکانی TikTok نوێ نەکرایەوە");
      throw error;
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true);
      toast.success("دۆخی گەیاندن نوێکرایەوە");
    } catch {
      // The user-facing error is handled by load.
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
      const result = await requestData<{ retried: number }>(
        "/api/analytics/v2/tiktok/retry-failed",
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

  const pixelSilent = health.serverEvents > 0 && health.browserEvents === 0;

  return (
    <DashboardSurface>
      {/* Header */}
      <PageHeader
        icon={Target}
        title="دۆخی گەیاندنی TikTok"
        description="پشکنینی چالاکی و دڵنیابوونەوە لە گەیشتنی دروستی ڕووداوەکانی وێبگەڕ و Events API."
        action={
          <Tooltip content="نوێکردنەوەی دۆخی گەیاندن" side="bottom">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-busy={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200 cursor-pointer"
              aria-label="نوێکردنەوە"
            >
              <MotionSpinner active={refreshing}>
                <RefreshCw className="h-4 w-4" />
              </MotionSpinner>
            </button>
          </Tooltip>
        }
      />

      {locked ? (
        <div className="border-t border-slate-100 pt-5 dark:border-white/5">
          <LockedNotice
            icon={Target}
            title="وردەکاریی گەیاندن لە پلانەکەتدا نییە"
            description="ڕێکخستنی Pixel و Events API بەردەستە، بەڵام دۆخی وردی ڕووداوەکان پێویستی بە پلانی بەرزتر هەیە."
          />
        </div>
      ) : (
        <div className="space-y-6 border-t border-slate-100 pt-5 dark:border-white/5">
          {/* Status / Alert Banner */}
          {health.failed > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/[0.06]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-bold text-red-900 dark:text-red-100">
                    {formatNumber(health.failed)} ڕووداوی شکستخواردوو هەیە
                  </p>
                  <p className="text-xs text-red-700/80 dark:text-red-300/80">
                    تکایە هۆکاری هەڵەکە لە خوارەوە ببینە و دووبارە هەوڵبدەرەوە.
                  </p>
                </div>
              </div>
              <Tooltip
                content="دووبارە هەوڵدانەوەی ناردنی ڕووداوە شکستخواردووەکان"
                side="top"
              >
                <button
                  type="button"
                  onClick={() => void retryFailed()}
                  disabled={refreshing}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-600 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>دووبارە هەوڵدانەوە ({health.failed})</span>
                </button>
              </Tooltip>
            </div>
          ) : health.retrying > 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
              <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  {formatNumber(health.retrying)} ڕووداو لە ڕیزی دووبارە هەوڵداندان
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                  سیستەم لە چەند خولەکی داهاتوودا بە شێوەی خۆکارانە هەوڵی ناردنەوەیان دەدات.
                </p>
              </div>
            </div>
          ) : null}

          {/* Reconciliation Card (بەراوردکردنی ئەنجامەکان) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900/30 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[var(--theme-primary)]" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    بەراوردکردنی ئەنجامەکان (Reconciliation)
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  بەراوردی گۆڕانە تۆمارکراوەکانی ناوخۆ لەگەڵ ئەو ڕووداوانەی لە ڕێگەی Events API گەیشتوونەتە TikTok.
                </p>
              </div>

              {/* Match indicator badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {health.reconciliation.internalConversions ===
                  health.reconciliation.serverAcceptedConversions &&
                health.reconciliation.internalConversions > 0
                  ? "هاوتا و تەواوە (100%)"
                  : health.reconciliation.internalConversions === 0
                    ? "هیچ گۆڕانێک تۆمار نەکراوە"
                    : `${formatNumber(
                        Math.abs(
                          health.reconciliation.internalConversions -
                            health.reconciliation.serverAcceptedConversions,
                        ),
                      )} جیاوازی هەیە`}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* MultiTree Internal Side */}
              <div className="relative rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 transition hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تۆمارکراو لە MultiTree
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs dark:bg-white/10 dark:text-slate-400">
                    ناوخۆیی
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800 dark:text-white font-mono">
                    {formatNumber(health.reconciliation.internalConversions)}
                  </span>
                  <span className="text-xs text-slate-400">ڕووداو / کلیک</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  ئەو گۆڕان و کلیکانەی کە لەلایەن وێبگەڕی سەردانکەرانەوە لە پەڕەکانت تۆمارکراون.
                </p>
              </div>

              {/* TikTok Accepted Side */}
              <div className="relative rounded-xl border border-sky-200/70 bg-sky-50/40 p-4 transition hover:border-sky-300 dark:border-sky-500/20 dark:bg-sky-500/[0.04] dark:hover:border-sky-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
                    وەرگیراو لەلایەن TikTok
                  </span>
                  <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 shadow-2xs dark:bg-sky-500/20 dark:text-sky-300">
                    Events API
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-sky-900 dark:text-sky-100 font-mono">
                    {formatNumber(
                      health.reconciliation.serverAcceptedConversions,
                    )}
                  </span>
                  <span className="text-xs text-sky-600/70 dark:text-sky-400/70">
                    تەئکیدکراو
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-sky-700/80 dark:text-sky-300/80">
                  ئەو ڕووداوانەی ڕاژەکاری ئێمە ناردوویەتی و TikTok بە فەرمی وەریگرتوون.
                </p>
              </div>
            </div>
          </div>

          {/* Diagnostics & Error Logs Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900/30 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  تۆماری پشکنین و هەڵەکانی گەیاندن
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  هەر وەڵامێکی نەرێنی لەلایەن TikTokـەوە بۆ ئەم بزنسە هاتبێت، لێرە پیشان دەدرێت.
                </p>
              </div>
              {errors.length > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                  {errors.length} هەڵە
                </span>
              )}
            </div>

            <div className="mt-4">
              {pixelSilent && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
                  <div className="flex items-start gap-3">
                    <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                        Pixel هیچ ڕووداوێکی لە وێبگەڕەوە نەناردووە
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {health.serverEvents} ڕووداو لە ڕاژەکارەوە (Events API) نێردراون، بەڵام هیچیان لە وێبگەڕەوە نەگەیشتوون.
                        ئەمە زۆرجار بەهۆی هەڵەی Pixel ID، بوونی Ad-blocker لە وێبگەڕی سەردانکەران، یان بلۆککردنی ترۆڵی شوێنکەوتن ڕوودەدات.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {errors.length > 0 ? (
                <ul className="space-y-2.5">
                  {errors.map((item) => (
                    <ErrorRow
                      key={`${item.destinationId}:${item.statusCode ?? "none"}:${item.message}`}
                      item={item}
                    />
                  ))}
                </ul>
              ) : !pixelSilent ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-500/10 dark:bg-emerald-500/[0.03]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <CheckCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      سیستەمی گەیاندن ئاساییە و هیچ هەڵەیەک تۆمار نەکراوە
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      هەموو داواکاری و ڕووداوەکان بە سەرکەوتوویی لەگەڵ TikTok دەبەسترێنەوە؛ هیچ ڕووداوێکی شکستخواردوو یان ڕاگیراو لە سیستەمدا نییە.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </DashboardSurface>
  );
}
