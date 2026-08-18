"use client";

import { MotionPulse, MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  Eye,
  ExternalLink,
  MousePointerClick,
  RefreshCw,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { getPlatformColors, getPlatformIcon, getPlatformName } from "@/components/public/LinktreeButtons";
import { toast } from "sonner";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { StatCard } from "@/components/shared/StatCard";
import {
  SkeletonList,
  SkeletonStatCards,
} from "@/components/shared/Skeleton";
import { analyticsModalScrollbarStyles } from "@/features/analytics/modalStyles";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

interface Totals {
  total_views: number;
  unique_views: number;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  conversion_value: number;
}

interface ActionRow {
  id: string;
  actionKey?: string;
  metadata?: Record<string, string>;
  label: string;
  actionType: string;
  destination: string | null;
  totalClicks: number;
  uniqueClickers: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
}

/**
 * The kind of page being inspected.
 *
 * Only the empty-state wording and the action labelling differ: a linktree's
 * actions are all buttons, while a mini website's are sections, offers, plans
 * and a form. Everything measured is the same, which is why one modal serves
 * both rather than a second copy drifting away from this one.
 */
export type AnalyticsPageKind = "linktree" | "mini_website";

interface BusinessPageAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageName: string;
  pageKind?: AnalyticsPageKind;
  canClearAnalytics?: boolean;
}

/**
 * Every control in the header is the same 40px square, or the same 40px tall
 * with a label. They were a mix of `px-3 py-2.5` and `p-2.5` with 16px and 20px
 * icons, so the four buttons sat at three different heights.
 */
const HEADER_BUTTON_BASE =
  "group relative inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold shadow-sm transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:shadow";

const HEADER_ICON_BUTTON = `${HEADER_BUTTON_BASE} w-10 shrink-0`;

const HEADER_NEUTRAL_BUTTON =
  "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-200 dark:hover:border-white/20 hover:text-slate-700 dark:hover:text-gray-200";

export type SortMode = "most-clicks" | "most-conversions" | "least";

const SORT_OPTIONS: Array<[SortMode, string]> = [
  ["most-clicks", "زۆرترین کلیک"],
  ["most-conversions", "زۆرترین گۆڕان"],
  ["least", "کەمترین"],
];

/**
 * The section an action belongs to, for a mini website.
 *
 * Keys are `mini:<kind>:<id>`, so the kind is enough to group a long list of
 * actions into the sections the business actually edits.
 */
const MINI_SECTION_LABELS: Record<string, string> = {
  social: "سۆشیال میدیا",
  service: "خزمەتگوزاری",
  booking: "حجزکردن",
  plan: "پلان و پاکێج",
  offer: "ئۆفەر",
  event: "ڕووداو",
  document: "بەڵگەنامە",
  audio: "دەنگ",
  team: "تیم",
  property: "براند و پەیج",
  partner: "هاوبەش",
  video: "ڤیدیۆ",
  story: "ستۆری",
  credential: "بڕوانامە",
  process: "هەنگاوەکان",
  location: "شوێن",
  section: "بەش",
  media: "وێنە",
  leadForm: "فۆرم",
};

export function miniActionSection(actionKey: string): string | null {
  if (!actionKey.startsWith("mini:")) return null;
  const kind = actionKey.split(":")[1] || "";
  return MINI_SECTION_LABELS[kind] ?? null;
}

/**
 * The brand to show for a row.
 *
 * Recorded facts first, guesswork last. A page that knows its button opens
 * YouTube says so in `metadata.platform`; the action type is authoritative for
 * a phone or an email; only a legacy linktree row, which carries neither, falls
 * through to reading the label.
 */
function resolvePlatform(action: {
  actionType: string;
  label: string;
  metadata?: Record<string, string>;
}): string {
  const declared = action.metadata?.platform;
  if (declared) return declared;
  return detectPlatform(action.actionType, action.label);
}

function detectPlatform(actionType: string, label: string): string {
  const direct: Record<string, string> = {
    whatsapp: "whatsapp",
    call: "phone",
    email: "email",
    booking: "custom",
    custom: "custom",
  };
  if (direct[actionType]) return direct[actionType];
  const l = label.toLowerCase();
  if (l.includes("whatsapp") || l.includes("واتس")) return "whatsapp";
  if (l.includes("viber") || l.includes("ڤایب")) return "viber";
  if (l.includes("telegram") || l.includes("تیلی") || l.includes("تێلی") || l.includes("tele")) return "telegram";
  if (l.includes("instagram") || l.includes("ئینست")) return "instagram";
  if (l.includes("facebook") || l.includes("فیسب")) return "facebook";
  if (l.includes("youtube") || l.includes("یوت")) return "youtube";
  if (l.includes("tiktok") || l.includes("تیک") || l.includes("تيك")) return "tiktok";
  if (l.includes("snapchat") || l.includes("سناپ")) return "snapchat";
  // Only the brand itself. «لینک» is simply the Kurdish word for "link", so
  // matching it here labelled every ordinary link on the page as LinkedIn.
  if (l.includes("linkedin") || l.includes("لینکدئین") || l.includes("لینکدین"))
    return "linkedin";
  if (l.includes("discord") || l.includes("دسک")) return "discord";
  if (l.includes("x.com") || l.includes("twitter") || l.includes("تویت")) return "x";
  if (l.includes("phone") || l.includes("call") || l.includes("ناو") || l.includes("پەی") || l.includes("تەل")) return "phone";
  if (l.includes("website") || l.includes("web") || l.includes("site") || l.includes("ماڵ") || l.includes("وێب")) return "custom";
  if (l.includes("email") || l.includes("مەی") || l.includes("ئیمەی") || l.includes("ایم")) return "email";
  if (l.includes("gps") || l.includes("map") || l.includes("نەخش") || l.includes("شوێ")) return "gps";
  if (l.includes("link") || l.includes("لینک")) return "custom";
  return "custom";
}

/**
 * Only the buttons and links a visitor actually used, in the requested order.
 *
 * Every clickable thing on a page is registered up front, so an untouched page
 * would otherwise list dozens of rows of zeros — a mini website alone registers
 * around thirty-five. A row earns its place by having been clicked or by having
 * converted; the rest are noise that buries the ones that were.
 *
 * Ties break on the label so the order does not reshuffle between renders of
 * the same data.
 */
export function sortAnalyticsActions<
  T extends Pick<ActionRow, "label" | "totalClicks" | "conversions">,
>(actions: readonly T[], sortMode: SortMode): T[] {
  return actions
    .filter((action) => action.totalClicks > 0 || action.conversions > 0)
    .sort((a, b) => {
      if (sortMode === "most-conversions" && b.conversions !== a.conversions) {
        return b.conversions - a.conversions;
      }
      if (sortMode === "least" && a.totalClicks !== b.totalClicks) {
        return a.totalClicks - b.totalClicks;
      }
      if (sortMode === "most-clicks" && b.totalClicks !== a.totalClicks) {
        return b.totalClicks - a.totalClicks;
      }
      return a.label.localeCompare(b.label);
    });
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `Request failed (${res.status}): ${url}`);
  }
  return json.data as T;
}

export function BusinessPageAnalyticsModal({
  isOpen,
  onClose,
  pageId,
  pageName,
  pageKind = "linktree",
  canClearAnalytics = true,
}: BusinessPageAnalyticsModalProps) {
  const router = useRouter();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("most-clicks");
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const dataRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const load = useCallback(async (bypassCache = false) => {
    const reqId = ++dataRef.current;

    const params = new URLSearchParams({ pageId: pageId });
    if (bypassCache) params.set("_t", String(Date.now()));

    const results = await Promise.allSettled([
      fetchJson<Totals>(`/api/analytics/v2/summary?${params}`),
      fetchJson<ActionRow[]>(`/api/analytics/v2/pages/${pageId}/actions?${params}`),
    ]);
    if (reqId !== dataRef.current) return;

    const [totalsResult, actionsResult] = results;
    let hadError = false;

    if (totalsResult.status === "fulfilled") {
      setTotals(totalsResult.value ?? null);
    } else {
      hadError = true;
      console.error("Analytics summary load failed:", totalsResult.reason);
    }

    if (actionsResult.status === "fulfilled") {
      // A malformed payload would otherwise crash the list on `.filter`.
      setActions(
        Array.isArray(actionsResult.value) ? actionsResult.value : [],
      );
    } else {
      hadError = true;
      console.error("Analytics actions load failed:", actionsResult.reason);
    }

    if (hadError) {
      toast.error("داتاکانی ئامار بارنەکران");
    } else {
      setLastUpdated(new Date());
    }

    if (reqId === dataRef.current) {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pageId]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      setLoading(true);
      setExpandedActionId(null);
      void load();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, load]);

  useModalKeyboard({
    isOpen,
    onEscape: onClose,
    escapeEnabled: !isClearModalOpen && !isClearing,
    dialogRef,
  });

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    void load(true);
  };

  const goToAdvancedAnalytics = () => {
    onClose();
    router.push(`/business/analytics?pageId=${pageId}`);
  };

  const handleClearAnalytics = async () => {
    setIsClearing(true);
    try {
      await fetchJson(`/api/analytics/v2/pages/${pageId}`, { method: "DELETE" });
      setTotals(null);
      setActions([]);
      setLastUpdated(new Date());
      toast.success("داتاکانی ئامار پاککرانەوە");
    } catch (error) {
      toast.error("پاککردنەوەی داتاکان سەرکەوتوو نەبوو", {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    } finally {
      setIsClearing(false);
    }
  };

  // `mousedown`, not `click`: a click fires on the common ancestor, so a drag
  // that starts inside the panel and ends on the backdrop used to close the
  // modal and throw away what the reader was looking at.
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const filteredActions = useMemo(
    () => sortAnalyticsActions(actions, sortMode),
    [actions, sortMode],
  );

  // Clicks count too: a page can be reached from a QR code or a shared button
  // and record clicks without a single recorded view.
  const hasAnyData = totals
    ? totals.total_views > 0 ||
      totals.total_clicks > 0 ||
      filteredActions.length > 0
    : filteredActions.length > 0;

  const conversionRate = useMemo(() => {
    if (!totals || totals.total_views === 0) return "0.0";
    return ((totals.conversions / totals.total_views) * 100).toFixed(1);
  }, [totals]);

  // After every hook, so the early return cannot change the hook order.
  if (!isOpen) return null;

  // Rendered on `document.body` like every other modal here. Left in place it
  // inherits the dashboard card's stacking context and transforms, which is how
  // a fixed overlay ends up clipped to the panel that opened it.
  return createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: analyticsModalScrollbarStyles }} />
      <div
        className="modal-ltr fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md overflow-y-auto"
        onMouseDown={handleBackdrop}
        dir="ltr"
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative w-full max-w-4xl my-4 sm:my-8 rounded-2xl overflow-hidden shadow-2xl outline-none bg-white dark:bg-[#161B22] border border-gray-100/80 dark:border-white/8"
        >
          <div className="relative p-5 sm:p-6 border-b border-gray-100/80 dark:border-white/8 bg-gradient-to-r from-white to-slate-50/30 dark:from-[#161B22] dark:to-slate-800/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl shadow-sm" style={{ background: "var(--theme-primary, #64748b)" }}>
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2
                      id={titleId}
                      className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-gray-100 font-kurdish"
                    >
                      ئاماری {pageName}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 mt-0.5 font-kurdish truncate">
                      هەموو داتاکان
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
                <button
                  type="button"
                  onClick={goToAdvancedAnalytics}
                  className={`${HEADER_BUTTON_BASE} w-10 shrink-0 border-slate-100 dark:border-white/10 sm:w-auto sm:px-3`}
                  style={{
                    background: "color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)",
                    color: "var(--theme-primary, #64748b)",
                  }}
                  aria-label="ئاماری وردتر"
                  title="بینینی ئاماری وردتر"
                >
                  <TrendingUp className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="hidden sm:inline">ئاماری وردتر</span>
                </button>
                {canClearAnalytics && (
                  <button
                    type="button"
                    onClick={() => setIsClearModalOpen(true)}
                    disabled={!hasAnyData}
                    className={`${HEADER_ICON_BUTTON} bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/15 hover:border-rose-200 dark:hover:border-rose-500/30`}
                    aria-label="پاککردنەوەی داتاکان"
                    title={
                      hasAnyData
                        ? "پاککردنەوەی هەموو داتاکانی ئامار"
                        : "هیچ داتایەک نییە بۆ پاککردنەوە"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing}
                  aria-busy={refreshing}
                  className={`${HEADER_ICON_BUTTON} ${HEADER_NEUTRAL_BUTTON}`}
                  aria-label="نوێکردنەوە"
                  title="نوێکردنەوە"
                >
                  <MotionSpinner active={refreshing}>
                    <RefreshCw className="h-4 w-4" />
                  </MotionSpinner>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`${HEADER_ICON_BUTTON} ${HEADER_NEUTRAL_BUTTON}`}
                  aria-label="داخستن"
                  title="داخستن"
                >
                  <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 md:p-6 overflow-y-auto max-h-[calc(100vh-180px)] sm:max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-220px)] custom-scrollbar bg-white dark:bg-[#161B22]">
            {loading ? (
              // Shaped like what loads: the stat tiles, then the action list.
              <div className="space-y-5">
                <SkeletonStatCards count={2} />
                <SkeletonList rows={5} />
              </div>
            ) : (
              <div className="space-y-5">
                <StatCardGrid columns={2}>
                  <StatCard icon={Eye} label="کۆی بینینەکان" value={totals?.total_views || 0} color="blue" />
                  <StatCard icon={Users} label="بینەری تاک" value={totals?.unique_views || 0} color="green" />
                  {/*
                    The page's own click total, which is not the sum of the
                    button list below it. That list only shows buttons that
                    still exist, so a page whose links were replaced would
                    otherwise read as having never been clicked at all.
                  */}
                  <StatCard icon={MousePointerClick} label="کۆی کرتەکان" value={totals?.total_clicks || 0} color="purple" />
                  <StatCard icon={Target} label="کرتەکەری تاک" value={totals?.unique_clicks || 0} color="orange" />
                </StatCardGrid>

                {!!totals && totals.conversions > 0 && (
                  <StatCardGrid columns={2}>
                    <StatCard icon={TrendingUp} label="گۆڕانەکان" value={totals.conversions} color="slate" />
                    <StatCard
                      icon={BarChart3}
                      label="بەهای گۆڕان"
                      value={totals.conversion_value}
                      color="slate"
                      subtitle={`${conversionRate}% ڕێژەی گۆڕان`}
                    />
                  </StatCardGrid>
                )}

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg shadow-sm" style={{ background: "var(--theme-primary, #64748b)" }}>
                        <Target className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-200 font-kurdish">
                        دوگمەکان ({filteredActions.length})
                      </h3>
                    </div>
                    {filteredActions.length > 0 && (
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
                                : "bg-white dark:bg-[#161B22] border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:border-slate-300 dark:hover:border-white/20"
                            }`}
                            style={sortMode === value ? { background: "var(--theme-primary, #64748b)", borderColor: "var(--theme-primary, #64748b)" } : undefined}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {filteredActions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                      <Eye className="h-10 w-10 text-slate-300 dark:text-gray-600" />
                      <p className="text-sm text-slate-400 dark:text-gray-500 font-kurdish">هێشتا هیچ داتایەک نییە</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 dark:border-white/8 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                      {filteredActions.map((action) => {
                        const platform = resolvePlatform(action);
                        const colors = getPlatformColors(platform);
                        const icon = getPlatformIcon(platform, "h-4 w-4");
                        // A mini website's actions are sections, offers, plans
                        // and a form, so the section it belongs to says more
                        // than the platform a linktree button would show.
                        const rowCaption =
                          (pageKind === "mini_website" &&
                            miniActionSection(action.actionKey || "")) ||
                          getPlatformName(platform);
                        const isExpanded = expandedActionId === action.id;
                        return (
                          <div key={action.id}>
                            <button
                              type="button"
                              onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                              aria-expanded={isExpanded}
                              className="w-full flex items-center gap-3 p-3 text-left cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                            >
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.via}, ${colors.to})` }}
                              >
                                {icon}
                              </div>
                              <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 items-center">
                                <div className="col-span-2 sm:col-span-2 min-w-0">
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                    {action.label}
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate mt-0.5">
                                    {rowCaption}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {formatNumber(action.totalClicks)}
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-gray-500">کلیک</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {formatNumber(action.uniqueClickers)}
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-gray-500">تاک</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-bold" style={{ color: "var(--theme-primary)" }}>
                                    {action.ctr.toFixed(1)}%
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-gray-500">CTR</p>
                                </div>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-slate-400 dark:text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              />
                            </button>
                            {isExpanded && (
                              <div className="px-3 pb-3 pl-[3.25rem]">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3">
                                  <div>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                      <Target className="h-3 w-3" style={{ color: "var(--theme-primary)" }} />
                                      {formatNumber(action.conversions)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">گۆڕانی ڕاستەقینە</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" style={{ color: "var(--theme-primary)" }} />
                                      {formatNumber(action.conversionValue)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">بەهای گۆڕان</p>
                                  </div>
                                  {action.destination && (
                                    <a
                                      href={action.destination}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="col-span-2 sm:col-span-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 hover:underline truncate self-center"
                                    >
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{action.destination}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isClearModalOpen}
        onClose={() => {
          if (!isClearing) setIsClearModalOpen(false);
        }}
        onConfirm={handleClearAnalytics}
        title="پاککردنەوەی داتاکانی ئامار"
        confirmLabel="بەڵێ، پاکی بکەوە"
        loadingLabel="پاکدەکرێتەوە..."
        cancelLabel="هەڵوەشاندنەوە"
        isDeleting={isClearing}
        zIndexClassName="z-[60]"
        message={<p>دڵنیایت لە پاککردنەوەی هەموو داتاکانی بینین و کلیکی ئەم پەڕەیە؟ ئەم کردارە ناگەڕێتەوە.</p>}
      />
    </>,
    document.body,
  );
}
