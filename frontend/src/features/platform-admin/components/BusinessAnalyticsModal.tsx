"use client";

import { MotionPulse, MotionSpinner } from "@/components/motion/MotionPrimitives";

import {
  memo,
  useState,
  useEffect,
  useId,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Image from "next/image";
import {
  X,
  Loader2,
  BarChart3,
  Globe,
  RefreshCw,
  Search,
  Download,
  Upload,
} from "lucide-react";
import { flushNow } from "@/lib/utils/client-queue";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { toast } from "sonner";
import { AnalyticsSummaryCards } from "@/features/analytics/components/AnalyticsSummaryCards";
import { analyticsModalScrollbarStyles } from "@/features/analytics/modalStyles";
import type { BusinessLinktreeAnalyticsSummary } from "@linktree/types";

/**
 * Every header control is the same 40px square. They were `p-2.5` with 20px
 * icons, which put them at a different height from the rest of the platform's
 * modal headers.
 */
const HEADER_ICON_BUTTON =
  "group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:shadow";

const HEADER_NEUTRAL =
  "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-200 dark:hover:border-white/20 hover:text-slate-700 dark:hover:text-gray-200";

type SortMode = "most-views" | "most-clicks" | "least";

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ["most-views", "زۆرترین بینین"],
  ["most-clicks", "زۆرترین کلیک"],
  ["least", "کەمترین"],
];

/**
 * The default page first, then the requested order, then the name.
 *
 * The name is the tie-break so a refresh cannot reshuffle rows that score the
 * same. The default test compares both sides: returning -1 whenever `a` is
 * default, without looking at `b`, is not a valid comparator and reverses
 * itself depending on which pair the sort happens to hand it.
 */
export function sortBusinessLinktrees<
  T extends {
    name: string;
    is_default: boolean;
    unique_views: number;
    unique_clicks: number;
    total_clicks: number;
  },
>(rows: readonly T[], sortMode: SortMode): T[] {
  return [...rows].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    if (sortMode === "most-views" && b.unique_views !== a.unique_views) {
      return b.unique_views - a.unique_views;
    }
    if (sortMode === "most-clicks" && b.total_clicks !== a.total_clicks) {
      return b.total_clicks - a.total_clicks;
    }
    if (sortMode === "least") {
      const aScore = a.unique_views + a.total_clicks;
      const bScore = b.unique_views + b.total_clicks;
      if (aScore !== bScore) return aScore - bScore;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Row avatar with an initial as its fallback.
 *
 * The fallback used to be a sibling element that the image's `onError` reached
 * through `nextSibling` and unhid by mutating its style. That depends on the
 * DOM having no text node between the two, and on React never reconciling the
 * node it just wrote around. Local state does the same job and survives a
 * re-render.
 */
const LinktreeAvatar = memo(function LinktreeAvatar({
  src,
  name,
  backgroundColor,
}: {
  src: string | null;
  name: string;
  backgroundColor?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={name}
        width={36}
        height={36}
        unoptimized
        onError={() => setFailed(true)}
        className="h-9 w-9 rounded-lg object-cover shrink-0 shadow-sm"
      />
    );
  }

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
      style={{ backgroundColor: backgroundColor || '#64748b' }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
});

interface BusinessAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  businessDefaultAvatar?: string | null;
}

export const BusinessAnalyticsModal = memo(function BusinessAnalyticsModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  businessDefaultAvatar,
}: BusinessAnalyticsModalProps) {
  const [linktrees, setLinktrees] = useState<BusinessLinktreeAnalyticsSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("most-views");
  const [isTransferring, setIsTransferring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  /** Guards against a slower earlier response painting over a newer one. */
  const requestRef = useRef(0);

  const handleExport = async () => {
    setIsTransferring(true);
    setError(null);
    try {
      const response = await fetch(`/api/platform/businesses/${businessId}/linktrees-export`, { credentials: "include" });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || "Export failed");
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `${businessName}-linktrees.multitree.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      // Firefox only follows an anchor that is in the document, and revoking
      // the object URL in the same tick can cancel the download outright.
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleImport = async (file: File) => {
    setIsTransferring(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/platform/businesses/${businessId}/linktrees-import`, {
        method: "POST", credentials: "include", body: form,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) throw new Error(result?.message || "Import failed");
      await fetchData(true);
      toast.success("لینکترییەکان بە سەرکەوتوویی هاوردە کران");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setError(message);
      toast.error("هاوردەکردنی لینکترییەکان سەرکەوتوو نەبوو", { description: message });
    } finally {
      setIsTransferring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchData = useCallback(async (bypassCache = false) => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const { fetchWithCache } = await import('@/lib/utils/cache');
      const url = bypassCache
        ? `/api/platform/businesses/${businessId}/linktrees?_t=${Date.now()}`
        : `/api/platform/businesses/${businessId}/linktrees`;
      const result = await fetchWithCache<BusinessLinktreeAnalyticsSummary[]>(
        url,
        undefined,
        `business-linktrees:${businessId}`,
        bypassCache
      );
      if (requestId !== requestRef.current) return;
      setLinktrees(Array.isArray(result) ? result : []);
      setLastUpdated(new Date());
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err instanceof Error ? err.message : "داتاکان بار نەکران");
      console.error("Error fetching business linktrees:", err);
    } finally {
      if (requestId === requestRef.current) setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (isOpen && businessId) fetchData();
  }, [isOpen, businessId, fetchData]);

  const handleRefresh = async () => {
    if (isLoading) return;
    try {
      await flushNow();
    } catch (err) {
      // A queue that will not flush must not stop the reload.
      console.error("Error flushing queued events:", err);
    }
    await fetchData(true);
  };

  // `mousedown`, not `click`: a click fires on the common ancestor, so a drag
  // that starts inside the panel and ends on the backdrop used to close it.
  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isTransferring) onClose();
  };

  const totals = useMemo(() => {
    const totalViews = linktrees.reduce((sum, lt) => sum + lt.unique_views, 0);
    const totalClicks = linktrees.reduce((sum, lt) => sum + lt.unique_clicks, 0);
    return { totalViews, totalClicks };
  }, [linktrees]);

  useModalKeyboard({
    isOpen,
    onEscape: onClose,
    // Closing mid-import would leave the reader with no idea whether it landed.
    escapeEnabled: !isTransferring,
    dialogRef,
  });

  const filteredLinktrees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = query
      ? linktrees.filter(
          (lt) =>
            lt.name.toLowerCase().includes(query) ||
            (lt.subtitle || "").toLowerCase().includes(query),
        )
      : linktrees;
    return sortBusinessLinktrees(list, sortMode);
  }, [linktrees, sortMode, searchQuery]);

  const getStatusBadge = (status: string) => {
    if (status === "active") return "bg-emerald-100 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-300";
    return "bg-rose-100 dark:bg-rose-400/15 text-rose-600 dark:text-rose-300";
  };

  const avatarSrc = useCallback((lt: BusinessLinktreeAnalyticsSummary) => {
    return lt.image || businessDefaultAvatar || null;
  }, [businessDefaultAvatar]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: analyticsModalScrollbarStyles }} />
      <div
        className="modal-ltr fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md overflow-y-auto"
        onMouseDown={handleBackdropMouseDown}
        dir="ltr"
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative w-full max-w-4xl my-4 sm:my-8 rounded-2xl overflow-hidden shadow-2xl outline-none
          bg-white dark:bg-[#161B22]
          border border-gray-100/80 dark:border-white/8
        ">
          <div className="relative p-5 sm:p-6 border-b
            border-gray-100/80 dark:border-white/8
            bg-gradient-to-r from-white to-slate-50/30
            dark:from-[#161B22] dark:to-slate-800/5
          ">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl shadow-sm" style={{ background: 'var(--theme-primary, #64748b)' }}>
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2
                      id={titleId}
                      className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-100 font-kurdish"
                    >
                      ئاماری بەڕێوەبەر
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 mt-0.5 font-kurdish truncate">
                      {businessName}
                    </p>
                  </div>
                </div>
                {lastUpdated && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 dark:text-gray-500">
                    <MotionPulse
                      className="h-1.5 w-1.5 rounded-full shadow-sm"
                      style={{ backgroundColor: "var(--theme-primary, #64748b)" }}
                    />
                    <span className="font-kurdish">
                      دواین نوێکردنەوە: {new Intl.DateTimeFormat("ku", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }).format(lastUpdated)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.multitree.json,application/json"
                  className="hidden"
                  onChange={(event) => event.target.files?.[0] && handleImport(event.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTransferring}
                  className={`${HEADER_ICON_BUTTON} ${HEADER_NEUTRAL}`}
                  aria-label="هاوردەکردنی لینکترییەکان"
                  title="هاوردەکردنی لینکترییەکان"
                >
                  <Upload className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isTransferring}
                  aria-busy={isTransferring}
                  className={`${HEADER_ICON_BUTTON} ${HEADER_NEUTRAL}`}
                  aria-label="هەناردەکردنی لینکترییەکان"
                  title="هەناردەکردنی لینکترییەکان"
                >
                  {isTransferring ? (
                    <MotionSpinner>
                      <Loader2 className="h-4 w-4" />
                    </MotionSpinner>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className={`${HEADER_ICON_BUTTON} ${HEADER_NEUTRAL}`}
                  aria-label="نوێکردنەوە"
                  title="نوێکردنەوە"
                >
                  <MotionSpinner active={isLoading}>
                    <RefreshCw className="h-4 w-4" />
                  </MotionSpinner>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`${HEADER_ICON_BUTTON} ${HEADER_NEUTRAL}`}
                  aria-label="داخستن"
                  title="داخستن"
                >
                  <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 md:p-6 overflow-y-auto
            max-h-[calc(100vh-180px)] sm:max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-220px)]
            custom-scrollbar
            bg-white dark:bg-[#161B22]
          ">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <MotionSpinner><Loader2 className="h-10 w-10 " style={{ color: 'var(--theme-primary, #64748b)' }}  /></MotionSpinner>
                <p className="text-sm text-slate-400 dark:text-gray-500 font-kurdish">داتاکان بار دەکرێن...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <p className="text-sm text-red-600 font-kurdish">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchData(true)}
                  className="px-4 py-2.5 rounded-xl text-white font-kurdish shadow-lg hover:shadow-xl transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: 'var(--theme-css, #64748b)' }}
                >
                  هەوڵ بدەوە
                </button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                <AnalyticsSummaryCards
                  views={totals.totalViews}
                  clicks={totals.totalClicks}
                  viewsLabel="کۆی بینینەکان"
                  clicksLabel="کۆی کلیکەکان"
                />

                {/* Search + Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="گەڕان بە ناوی لینک..."
                      className="w-full pr-9 pl-3 py-2 text-sm rounded-xl border bg-white dark:bg-[#161B22] border-slate-100 dark:border-white/8 text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': 'var(--theme-primary, #64748b)' } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {SORT_OPTIONS.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={sortMode === value}
                        onClick={() => setSortMode(value)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer whitespace-nowrap ${
                          sortMode === value
                            ? "text-white shadow-sm"
                            : "bg-white dark:bg-[#161B22] border-slate-100 dark:border-white/8 text-slate-500 dark:text-gray-400 hover:border-slate-200 dark:hover:border-white/20"
                        }`}
                        style={sortMode === value ? {
                          background: 'var(--theme-primary, #64748b)',
                          borderColor: 'var(--theme-primary, #64748b)',
                        } : undefined}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredLinktrees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                    <Globe className="h-10 w-10 text-slate-300 dark:text-gray-600" />
                    <p className="text-sm text-slate-400 dark:text-gray-500 font-kurdish">
                      {linktrees.length === 0 ? "هیچ لینکترییەک نەدۆزرایەوە" : "هیچ هاوتابوونێک نەدۆزرایەوە"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg shadow-sm" style={{ background: 'var(--theme-primary, #64748b)' }}>
                        <Globe className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-200 font-kurdish">
                        هەموو لینکەکان ({filteredLinktrees.length})
                        {filteredLinktrees.length !== linktrees.length && (
                          <span className="text-slate-400 dark:text-gray-500 font-normal text-xs mr-1">
                            لە {linktrees.length}
                          </span>
                        )}
                      </h3>
                    </div>

                    <div className="rounded-2xl border border-slate-100 dark:border-white/8 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                      {filteredLinktrees.map((lt) => {
                        const ctr = lt.unique_views > 0 ? ((lt.unique_clicks / lt.unique_views) * 100).toFixed(1) : "0.0";
                        return (
                          <div
                            key={lt.id}
                            className="w-full flex items-center gap-3 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                          >
                            <LinktreeAvatar
                              src={avatarSrc(lt)}
                              name={lt.name}
                              backgroundColor={lt.background_color}
                            />
                            <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 items-center">
                              <div className="col-span-2 sm:col-span-2 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-700 dark:text-gray-200 font-kurdish truncate">
                                    {lt.name}
                                  </span>
                                  {lt.is_default && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 dark:bg-sky-400/15 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-400/25">
                                      سەرەکی
                                    </span>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(lt.status)}`}>
                                    {lt.status === "active" ? "چالاک" : "ناچالاک"}
                                  </span>
                                </div>
                                {lt.subtitle && (
                                  <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate mt-0.5">
                                    {lt.subtitle}
                                  </p>
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {lt.unique_views.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-gray-500">بینین</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {lt.unique_clicks.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-gray-500">کلیک</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
                                  {ctr}%
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-gray-500">CTR</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});
