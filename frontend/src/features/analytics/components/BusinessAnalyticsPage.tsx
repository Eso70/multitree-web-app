"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  ContactRound,
  Download,
  Eye,
  Filter,
  GitBranch,
  History,
  IdCard,
  Link2,
  Loader2,
  Lock,
  MapPin,
  MessageSquarePlus,
  MonitorSmartphone,
  MousePointerClick,
  Radio,
  RefreshCw,
  Route,
  Search,
  Share2,
  Sparkles,
  Target,
  TrendingDown,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { EmptyState } from "@/components/shared/EmptyState";
import { LockedNotice } from "@/components/shared/LockedContent";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchModal } from "@/components/shared/SearchModal";
import {
  SegmentedTabs,
  type SegmentedTab,
} from "@/components/shared/SegmentedTabs";
import { StatCard } from "@/components/shared/StatCard";
import { SkeletonDashboardPage } from "@/components/shared/Skeleton";
import {
  FunnelChart,
  RetentionGrid,
} from "@/features/analytics/components/AnalyticsWidgets";
import { AnalyticsOverviewStory } from "@/features/analytics/components/AnalyticsOverviewStory";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import { getCountryInfo } from "@/features/analytics/countryInfo";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { useTheme } from "@/lib/contexts/ThemeProvider";

type AnalyticsSurface = "analytics" | "crm" | "tracking";
type Period = "today" | "7d" | "30d" | "90d" | "lifetime";
type PageType = "linktree" | "mini_website";
type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

interface AnalyticsAsset {
  id: string;
  sourceId: string;
  type: PageType;
  name: string;
  slug: string;
  status: string;
  views: number;
  uniqueVisitors: number;
  clicks: number;
  uniqueClickers: number;
  conversions: number;
}

interface DailyPoint {
  date: string;
  views: number;
  uniqueVisitors: number;
  clicks: number;
  uniqueClickers: number;
  conversions: number;
}

interface Totals {
  total_views: number;
  unique_views: number;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  conversion_value: number;
  new_visitors: number;
  returning_visitors: number;
  returning_rate: number;
  bounce_rate: number;
  avg_engagement_seconds: number;
}

interface BreakdownItem {
  key: string;
  total: number;
}

interface Breakdowns {
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  operatingSystems: BreakdownItem[];
  countries: BreakdownItem[];
  cities: BreakdownItem[];
  referrers: BreakdownItem[];
  campaigns: BreakdownItem[];
  utmSources: BreakdownItem[];
  utmMediums: BreakdownItem[];
  channels: BreakdownItem[];
}

interface FunnelData {
  steps: Array<{ key: string; label: string; count: number }>;
  dropoff: Array<{ fromKey: string; toKey: string; rate: number }>;
}

interface RetentionRow {
  cohortWeek: string;
  size: number;
  rates: number[];
}

interface RealtimeData {
  activeVisitors: number;
  activePages: Array<{ pageId: string; name: string; count: number }>;
}

interface VisitorRow {
  id: string;
  anonymousId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  eventCount: number;
  sessionCount: number;
  lastEvent: string;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
}

interface JourneyEvent {
  id: string;
  eventName: string;
  occurredAt: string;
  actionLabel: string | null;
  actionType: string | null;
  sessionId: string;
  isConversion: boolean;
  conversionValue: number | null;
  currency: string | null;
}

interface ActionRow {
  id: string;
  label: string;
  actionType: string;
  destination: string | null;
  totalClicks: number;
  uniqueClickers: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  pageName?: string;
}

interface CrmSummary {
  statuses: Record<LeadStatus, number>;
  total: number;
  totalValue: number;
}

interface CrmLead {
  id: string;
  status: LeadStatus;
  name: string;
  email: string;
  phone: string;
  hasContactDetails: boolean;
  captureMethod: "automatic" | "provided";
  value: number | null;
  currency: string | null;
  channel: string | null;
  score: number;
  networkAddress: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  referrer: string | null;
  lastAction: string | null;
  lastEvent: string | null;
  lastSeenAt: string | null;
  eventCount: number;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TikTokHealth {
  connections: number;
  browserEvents: number;
  serverEvents: number;
  delivered: number;
  retrying: number;
  failed: number;
  deliveryRate: number;
  lastDeliveredAt: string | null;
  reconciliation: {
    internalConversions: number;
    serverAcceptedConversions: number;
  };
}

const EMPTY_TOTALS: Totals = {
  total_views: 0,
  unique_views: 0,
  total_clicks: 0,
  unique_clicks: 0,
  conversions: 0,
  conversion_value: 0,
  new_visitors: 0,
  returning_visitors: 0,
  returning_rate: 0,
  bounce_rate: 0,
  avg_engagement_seconds: 0,
};

const EMPTY_BREAKDOWNS: Breakdowns = {
  devices: [],
  browsers: [],
  operatingSystems: [],
  countries: [],
  cities: [],
  referrers: [],
  campaigns: [],
  utmSources: [],
  utmMediums: [],
  channels: [],
};

const EMPTY_FUNNEL: FunnelData = { steps: [], dropoff: [] };
const EMPTY_REALTIME: RealtimeData = { activeVisitors: 0, activePages: [] };

const EMPTY_CRM: CrmSummary = {
  statuses: { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 },
  total: 0,
  totalValue: 0,
};

const EMPTY_TIKTOK: TikTokHealth = {
  connections: 0,
  browserEvents: 0,
  serverEvents: 0,
  delivered: 0,
  retrying: 0,
  failed: 0,
  deliveryRate: 0,
  lastDeliveredAt: null,
  reconciliation: {
    internalConversions: 0,
    serverAcceptedConversions: 0,
  },
};

const surfaceMeta = {
  crm: {
    title: "بەڕێوەبردنی کڕیارە پێشبینیکراوەکان",
    description:
      "سەردانکەر و کلیککەرەکان بە خۆکار بناسە، ئاستی حەزیان ببینە و دۆخ و تێبینییەکانیان بەڕێوەببە.",
    icon: ContactRound,
  },
  tracking: {
    title: "ڕێکخستنەکانی تیکتۆک",
    description: "دۆخی پیکسڵی تیکتۆک و ڕووداوەکانی پەڕەکان.",
    icon: Target,
  },
} satisfies Record<
  Exclude<AnalyticsSurface, "analytics">,
  { title: string; description: string; icon: typeof BarChart3 }
>;

const periodOptions = [
  { value: "today" as const, label: "ئەمڕۆ" },
  { value: "7d" as const, label: "7 ڕۆژ" },
  { value: "30d" as const, label: "30 ڕۆژ" },
  { value: "90d" as const, label: "90 ڕۆژ" },
  { value: "lifetime" as const, label: "هەموو کات" },
];

const crmStatusLabels: Record<LeadStatus, string> = {
  new: "نوێ",
  contacted: "پەیوەندیکراوە",
  qualified: "گونجاو",
  won: "سەرکەوتوو",
  lost: "لەدەستچوو",
};

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportFilePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^\p{L}\p{N}-]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "customers"
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

const eventLabels: Record<string, string> = {
  page_view: "بینینی پەڕە",
  click: "کلیک",
  link_click: "کلیکی دوگمە",
  conversion: "ئەنجامی گرنگ",
  contact: "پەیوەندیکردن",
  session_start: "دەستپێکی دانیشتن",
};

const actionTypeLabels: Record<string, string> = {
  link: "بەستەر",
  whatsapp: "واتساپ",
  call: "پەیوەندی تەلەفۆنی",
  email: "ئیمەیل",
  social: "تۆڕی کۆمەڵایەتی",
  form: "فۆڕم",
  booking: "حجزکردن",
  product: "بەرهەم",
  service: "خزمەتگوزاری",
  checkout: "تەواوکردنی کڕین",
  purchase: "کڕین",
  download: "داگرتن",
  custom: "تایبەت",
};

const channelLabels: Record<string, string> = {
  tiktok_paid: "تیکتۆکی پارەدراو",
  tiktok_organic: "تیکتۆک",
  instagram: "ئینستاگرام",
  facebook: "فەیسبووک",
  snapchat: "سناپچات",
  youtube: "یوتیوب",
  search: "گەڕان",
  direct: "ڕاستەوخۆ",
  referral: "ڕەوانەکردن",
  email: "ئیمەیڵ",
  sms: "نامە",
  qr: "QR",
  other: "سەرچاوەی تر",
};

const crmDeviceLabels: Record<string, string> = {
  mobile: "مۆبایل",
  desktop: "کۆمپیوتەر",
  tablet: "تابلێت",
};

function eventLabel(value: string): string {
  return eventLabels[value.toLowerCase()] || value;
}

function actionTypeLabel(value: string): string {
  return actionTypeLabels[value.toLowerCase()] || value;
}

type AnalyticsTab =
  "overview" | "visitors" | "clicks" | "funnel" | "retention" | "realtime";

const analyticsTabs: SegmentedTab<AnalyticsTab>[] = [
  { id: "overview", label: "وێنەی گشتی", icon: BarChart3 },
  { id: "visitors", label: "سەردانکەران", icon: Users },
  { id: "clicks", label: "دوگمەکان", icon: MousePointerClick },
  { id: "funnel", label: "ڕێڕەوی ئەنجام", icon: GitBranch },
  { id: "retention", label: "گەڕانەوە", icon: History },
  { id: "realtime", label: "ئێستا", icon: Radio },
];

const analyticsTabMeta = {
  overview: {
    title: "وێنەی گشتی کارایی پەڕەکانت",
    description:
      "بە زمانی سادە بزانە چەند کەس هاتووە، چیان کردووە و چی باش کار دەکات.",
    icon: BarChart3,
  },
  visitors: {
    title: "کێ سەردانی پەڕەکانت دەکات؟",
    description: "سەردانکەر، دانیشتن، شوێن، ئامێر و ڕێڕەوی چالاکییەکانیان.",
    icon: Users,
  },
  clicks: {
    title: "کام دوگمە باشتر کار دەکات؟",
    description: "کلیکی گشتی، کلیککەری جیاواز و ڕێژەی کلیکی هەر دوگمە ببینە.",
    icon: MousePointerClick,
  },
  funnel: {
    title: "ڕێڕەوی سەردانکەر بۆ ئەنجام",
    description:
      "بزانە چەند کەس لە بینینی پەڕەکەوە بۆ کلیک و ئەنجامی گرنگ بەردەوام دەبێت.",
    icon: GitBranch,
  },
  retention: {
    title: "گەڕانەوەی سەردانکەران",
    description:
      "بزانە چەند سەردانکەر دوای یەکەم سەردانیان لە هەفتەکانی دواتر دەگەڕێنەوە.",
    icon: History,
  },
  realtime: {
    title: "ئێستا چی ڕوودەدات؟",
    description:
      "سەردانکەرە چالاکەکان و ئەو پەڕانەی ئێستا دەبینرێن بە ڕاستەوخۆ ببینە.",
    icon: Radio,
  },
} satisfies Record<
  AnalyticsTab,
  { title: string; description: string; icon: typeof BarChart3 }
>;

const analyticsTabEmptyMeta = {
  overview: {
    icon: BarChart3,
    title: "هێشتا داتای شیکاری نییە",
    description:
      "دوای یەکەم سەردان، کلیک یان گۆڕانکاری پوختەی داتاکانت لێرە دەردەکەوێت.",
  },
  visitors: {
    icon: Users,
    title: "هێشتا سەردانکەر نییە",
    description:
      "دوای یەکەم سەردان، زانیاری سەردانکەرانی هەموو پەڕەکانت لێرە دەردەکەوێت.",
  },
  clicks: {
    icon: MousePointerClick,
    title: "هێشتا کلیکێک نییە",
    description:
      "دوای یەکەم کلیک، کارایی دوگمەکانی هەموو پەڕەکانت لێرە دەردەکەوێت.",
  },
  funnel: {
    icon: GitBranch,
    title: "هێشتا داتای ڕێڕەوی ئەنجام نییە",
    description:
      "کاتێک سەردانکەرەکان چالاکی دەکەن، قۆناغ و ڕێژەی گواستنەوە لێرە دەردەکەوێت.",
  },
  retention: {
    icon: History,
    title: "هێشتا داتای پابەندبوون نییە",
    description:
      "دوای گەڕانەوەی سەردانکەرەکان، کۆمەڵە و ڕێژەی هەفتانە لێرە دەردەکەوێت.",
  },
  realtime: {
    icon: Radio,
    title: "هیچ سەردانکەرێکی چالاک نییە",
    description:
      "کاتێک کەسێک لە پەڕەکانتدا دەگەڕێت، بە ڕاستەوخۆ لێرە دەردەکەوێت.",
  },
} satisfies Record<
  AnalyticsTab,
  { icon: typeof BarChart3; title: string; description: string }
>;

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

function daysForPeriod(period: Period): number {
  if (period === "today") return 1;
  if (period === "lifetime") return 3650;
  return Number(period.slice(0, -1));
}

class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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

function isLockedError(error: unknown): boolean {
  return error instanceof RequestError && error.status === 403;
}

function LockedPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center p-5 ${
        compact ? "min-h-64" : "min-h-[400px]"
      }`}
    >
      <LockedNotice
        compact={compact}
        icon={Lock}
        title="ئەم بەشە لە پلانەکەتدا نییە"
        description="بۆ بینینی شیکاری ورد، سەردانکەران، ڕێڕەوی ئەنجام، گەڕانەوە و داتای ڕاستەوخۆ پلانەکەت نوێبکەرەوە."
      />
    </div>
  );
}

function AnalyticsTabEmptyState({ tab }: { tab: AnalyticsTab }) {
  const emptyState = analyticsTabEmptyMeta[tab];
  return (
    <EmptyState
      icon={emptyState.icon}
      title={emptyState.title}
      description={emptyState.description}
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 border-t border-slate-100 pt-6 dark:border-white/5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function BusinessAnalyticsPage({
  surface = "analytics",
}: {
  surface?: AnalyticsSurface;
}) {
  const { color: businessTheme } = useTheme();
  const searchParams = useSearchParams();
  const requestedPageId = searchParams.get("pageId");
  const requestedPageApplied = useRef(false);
  const dataRequestId = useRef(0);
  const lastLockToastAt = useRef(0);
  const [period, setPeriod] = useState<Period>("30d");
  const [tab, setTab] = useState<AnalyticsTab>("overview");
  const [scope, setScope] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [assets, setAssets] = useState<AnalyticsAsset[]>([]);
  const [totals, setTotals] = useState<Totals>(EMPTY_TOTALS);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdowns>(EMPTY_BREAKDOWNS);
  const [funnel, setFunnel] = useState<FunnelData>(EMPTY_FUNNEL);
  const [retention, setRetention] = useState<RetentionRow[]>([]);
  const [realtime, setRealtime] = useState<RealtimeData>(EMPTY_REALTIME);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [crmSummary, setCrmSummary] = useState<CrmSummary>(EMPTY_CRM);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [tiktok, setTikTok] = useState<TikTokHealth>(EMPTY_TIKTOK);
  const [loading, setLoading] = useState(true);
  const [detailsLocked, setDetailsLocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [journeyVisitor, setJourneyVisitor] = useState<VisitorRow | null>(null);
  const [journey, setJourney] = useState<JourneyEvent[]>([]);
  const [noteLead, setNoteLead] = useState<CrmLead | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportingCrm, setExportingCrm] = useState(false);
  const meta =
    surface === "analytics" ? analyticsTabMeta[tab] : surfaceMeta[surface];
  const hasOverviewData =
    totals.total_views > 0 ||
    totals.unique_views > 0 ||
    totals.total_clicks > 0 ||
    totals.unique_clicks > 0 ||
    totals.conversions > 0 ||
    daily.some(
      (point) => point.views > 0 || point.clicks > 0 || point.conversions > 0,
    );
  const hasFunnelData = funnel.steps.some((step) => step.count > 0);
  const hasRealtimeData =
    realtime.activeVisitors > 0 || realtime.activePages.length > 0;

  const selectedAsset = useMemo(
    () =>
      scope.startsWith("page:")
        ? assets.find((asset) => asset.id === scope.slice(5)) || null
        : null,
    [assets, scope],
  );

  const scopeOptions = useMemo(
    () => [
      ...(surface === "crm"
        ? [{ value: "all", label: "پەڕەیەک هەڵبژێرە" }]
        : [
            { value: "all", label: "هەموو پەڕەکان" },
            { value: "type:linktree", label: "هەموو پەڕە لینکییەکان" },
            {
              value: "type:mini_website",
              label: "هەموو وێبسایتە بچووکەکان",
            },
          ]),
      ...assets.map((asset) => ({
        value: `page:${asset.id}`,
        label: `${asset.type === "linktree" ? "پەڕەی لینک" : "وێبسایتی بچووک"} · ${asset.name}`,
      })),
    ],
    [assets, surface],
  );
  const selectedScopeLabel =
    scopeOptions.find((option) => option.value === scope)?.label ||
    "گەڕان و فلتەر...";

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(query) ||
        asset.slug.toLowerCase().includes(query),
    );
  }, [assets, searchQuery]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    const range = dateRange(period);
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    if (selectedAsset) params.set("pageId", selectedAsset.id);
    if (scope === "type:linktree") params.set("pageType", "linktree");
    if (scope === "type:mini_website") params.set("pageType", "mini_website");
    return params.toString();
  }, [period, scope, selectedAsset]);

  const loadAssets = useCallback(async () => {
    const nextAssets = await requestData<AnalyticsAsset[]>(
      "/api/analytics/v2/pages",
    );
    setAssets(nextAssets);
    if (
      surface === "analytics" &&
      requestedPageId &&
      !requestedPageApplied.current
    ) {
      const requestedAsset = nextAssets.find(
        (asset) =>
          asset.id === requestedPageId || asset.sourceId === requestedPageId,
      );
      requestedPageApplied.current = true;
      if (requestedAsset) setScope(`page:${requestedAsset.id}`);
    }
    if (surface === "crm") {
      setScope((current) =>
        current.startsWith("page:") || !nextAssets[0]
          ? current
          : `page:${nextAssets[0].id}`,
      );
    }
  }, [requestedPageId, surface]);

  const loadSurfaceData = useCallback(async () => {
    const requestId = ++dataRequestId.current;
    const timelineParams = new URLSearchParams(queryString);
    timelineParams.set("days", String(daysForPeriod(period)));
    const common = queryString ? `?${queryString}` : "";

    const notifyLocked = () => {
      const now = Date.now();
      if (now - lastLockToastAt.current < 30000) return;
      lastLockToastAt.current = now;
      toast.info(
        "ئەم تایبەتمەندییە لە پلانی ئێستاتدا بەردەست نییە، بۆ بەکارهێنانی پلانەکەت نوێبکەرەوە.",
        { id: "analytics-plan-locked" },
      );
    };

    if (surface === "tracking") {
      try {
        const nextTikTok = await requestData<TikTokHealth>(
          `/api/analytics/v2/tiktok/health${common}`,
        );
        if (requestId !== dataRequestId.current) return;
        setDetailsLocked(false);
        setTikTok(nextTikTok);
      } catch (error) {
        if (!isLockedError(error)) throw error;
        if (requestId !== dataRequestId.current) return;
        setDetailsLocked(true);
        setTikTok(EMPTY_TIKTOK);
        notifyLocked();
      }
      return;
    }

    if (surface === "crm") {
      if (!selectedAsset) {
        setCrmSummary(EMPTY_CRM);
        setCrmLeads([]);
        return;
      }
      try {
        const [nextCrmSummary, nextCrmLeads] = await Promise.all([
          requestData<CrmSummary>(
            `/api/analytics/v2/pages/${selectedAsset.id}/crm/summary`,
          ),
          requestData<CrmLead[]>(
            `/api/analytics/v2/pages/${selectedAsset.id}/crm/leads`,
          ),
        ]);
        if (requestId !== dataRequestId.current) return;
        setDetailsLocked(false);
        setCrmSummary(nextCrmSummary);
        setCrmLeads(nextCrmLeads);
      } catch (error) {
        if (!isLockedError(error)) throw error;
        if (requestId !== dataRequestId.current) return;
        setDetailsLocked(true);
        setCrmSummary(EMPTY_CRM);
        setCrmLeads([]);
        notifyLocked();
      }
      return;
    }

    const [nextTotals, nextDaily] = await Promise.all([
      requestData<Totals>(`/api/analytics/v2/summary${common}`),
      requestData<DailyPoint[]>(`/api/analytics/v2/daily?${timelineParams}`),
    ]);
    if (requestId !== dataRequestId.current) return;
    setTotals(nextTotals);
    setDaily(nextDaily);

    // Breakdowns/funnel/retention/realtime/visitors/actions all require the
    // same advanced-analytics capability. Plans without it get a 403 here;
    // that should lock the advanced views, not blank out totals/daily above.
    try {
      const [
        nextBreakdowns,
        nextFunnel,
        nextRetention,
        nextRealtime,
        nextVisitors,
        nextActions,
      ] = await Promise.all([
        requestData<Breakdowns>(`/api/analytics/v2/breakdowns${common}`),
        requestData<FunnelData>(`/api/analytics/v2/funnel${common}`),
        requestData<RetentionRow[]>("/api/analytics/v2/retention?weeks=8"),
        requestData<RealtimeData>(
          `/api/analytics/v2/realtime${selectedAsset ? `?pageId=${selectedAsset.id}` : ""}`,
        ),
        requestData<VisitorRow[]>(`/api/analytics/v2/visitors${common}`),
        requestData<ActionRow[]>(`/api/analytics/v2/actions${common}`),
      ]);
      if (requestId !== dataRequestId.current) return;
      setDetailsLocked(false);
      setBreakdowns(nextBreakdowns);
      setFunnel(nextFunnel);
      setRetention(nextRetention);
      setRealtime(nextRealtime);
      setVisitors(nextVisitors);
      setActions(nextActions);
    } catch (error) {
      if (!isLockedError(error)) throw error;
      if (requestId !== dataRequestId.current) return;
      setDetailsLocked(true);
      setBreakdowns(EMPTY_BREAKDOWNS);
      setFunnel(EMPTY_FUNNEL);
      setRetention([]);
      setRealtime(EMPTY_REALTIME);
      setVisitors([]);
      setActions([]);
      notifyLocked();
    }
  }, [period, queryString, selectedAsset, surface]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAssets(), loadSurfaceData()]);
    } catch {
      toast.error("نوێکردنەوەی داتاکانی شیکاری سەرکەوتوو نەبوو");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAssets, loadSurfaceData]);

  const refreshForDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAssets(), loadSurfaceData()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAssets, loadSurfaceData]);
  useRegisterBusinessDashboardRefresh(
    `analytics:${surface}`,
    refreshForDashboard,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAssets().catch(() => toast.error("لیستی پەڕەکان بارنەکرا"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAssets]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void loadSurfaceData()
        .catch(() => undefined)
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadSurfaceData]);

  useEffect(() => {
    if (surface !== "analytics" || tab !== "realtime" || detailsLocked) return;
    const interval = window.setInterval(() => {
      requestData<RealtimeData>(
        `/api/analytics/v2/realtime${selectedAsset ? `?pageId=${selectedAsset.id}` : ""}`,
      )
        .then(setRealtime)
        .catch(() => {});
    }, 15000);
    return () => window.clearInterval(interval);
  }, [surface, tab, selectedAsset, detailsLocked]);

  useEffect(() => {
    if (surface !== "crm" || detailsLocked || !selectedAsset) return;
    const interval = window.setInterval(() => {
      void loadSurfaceData().catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [detailsLocked, loadSurfaceData, selectedAsset, surface]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openJourney = useCallback(
    async (visitor: VisitorRow) => {
      setJourneyVisitor(visitor);
      setJourney([]);
      try {
        const params = new URLSearchParams();
        if (selectedAsset) params.set("pageId", selectedAsset.id);
        const suffix = params.toString() ? `?${params}` : "";
        setJourney(
          await requestData<JourneyEvent[]>(
            `/api/analytics/v2/visitors/${visitor.id}/journey${suffix}`,
          ),
        );
      } catch {
        toast.error("ڕێڕەوی سەردانکەر بارنەکرا");
      }
    },
    [selectedAsset],
  );

  const saveNote = useCallback(async () => {
    if (!noteLead || !note.trim()) return;
    setSaving(true);
    try {
      await requestData(`/api/analytics/v2/crm/leads/${noteLead.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: note.trim() }),
      });
      toast.success("تێبینی پارێزرا");
      setNoteLead(null);
      setNote("");
    } catch {
      toast.error("پاراستنی تێبینی سەرکەوتوو نەبوو");
    } finally {
      setSaving(false);
    }
  }, [note, noteLead]);

  const exportCrmLeads = useCallback(async () => {
    if (!selectedAsset || exportingCrm) return;
    setExportingCrm(true);
    try {
      const exported: CrmLead[] = [];
      const batchSize = 1000;
      for (let offset = 0; ; offset += batchSize) {
        const batch = await requestData<CrmLead[]>(
          `/api/analytics/v2/pages/${selectedAsset.id}/crm/leads?limit=${batchSize}&offset=${offset}`,
        );
        exported.push(...batch);
        if (batch.length < batchSize) break;
      }

      const headers = [
        "ناو",
        "ئیمەیڵ",
        "ژمارەی تەلەفۆن",
        "دۆخ",
        "شێوازی تۆمارکردن",
        "وڵات",
        "هەرێم",
        "شار",
        "ناونیشانی تۆڕ",
        "ئامێر",
        "وێبگەڕ",
        "سیستەمی کارپێکردن",
        "کەناڵ",
        "نمرەی حەز",
        "کلیک",
        "چالاکی",
        "دوا حەز",
        "دوا چالاکی",
      ];
      const rows = exported.map((lead) => [
        lead.name,
        lead.email,
        lead.phone,
        crmStatusLabels[lead.status],
        lead.captureMethod === "provided" ? "زانیاری پێدراو" : "خۆکار",
        lead.countryCode,
        lead.region,
        lead.city,
        lead.networkAddress,
        lead.deviceType,
        lead.browser,
        lead.operatingSystem,
        channelLabels[lead.channel || ""] || lead.channel,
        lead.score,
        lead.clickCount,
        lead.eventCount,
        lead.lastAction,
        lead.lastSeenAt || lead.updatedAt,
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `crm-${exportFilePart(selectedAsset.slug || selectedAsset.name)}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`${formatNumber(exported.length)} کڕیار هەناردەکرا`);
    } catch {
      toast.error("هەناردەکردنی داتای کڕیاران سەرکەوتوو نەبوو");
    } finally {
      setExportingCrm(false);
    }
  }, [exportingCrm, selectedAsset]);

  const retryTikTok = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await requestData<{ retried: number }>(
        `/api/analytics/v2/tiktok/retry-failed${
          selectedAsset ? `?pageId=${encodeURIComponent(selectedAsset.id)}` : ""
        }`,
        {
          method: "POST",
        },
      );
      toast.success(
        `${formatNumber(result.retried)} ڕووداو دووبارە نێردرایەوە`,
      );
      await loadSurfaceData();
    } catch {
      toast.error("هەوڵدانەوەی ناردن سەرکەوتوو نەبوو");
    } finally {
      setRefreshing(false);
    }
  }, [loadSurfaceData, selectedAsset]);

  const visitorColumns = useMemo<DataTableColumn<VisitorRow>[]>(
    () => [
      {
        id: "visitor",
        header: "سەردانکەر",
        cell: (item) => (
          <button
            type="button"
            onClick={() => void openJourney(item)}
            className="rounded-lg px-2.5 py-1.5 font-bold transition hover:brightness-95"
            style={{
              background:
                "color-mix(in srgb, var(--theme-primary) 12%, transparent)",
              color: "var(--theme-primary)",
            }}
          >
            #{item.anonymousId}
          </button>
        ),
      },
      {
        id: "activity",
        header: "چالاکی",
        cell: (item) => (
          <span className="inline-flex rounded-lg bg-violet-50 px-2.5 py-1.5 font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            {eventLabel(item.lastEvent)} · {formatNumber(item.eventCount)}{" "}
            ڕووداو
          </span>
        ),
      },
      {
        id: "location",
        header: "شوێن",
        cell: (item) => (
          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            {[item.city, item.region, item.countryCode]
              .filter(Boolean)
              .join("، ") || "نەزانراو"}
          </span>
        ),
      },
      {
        id: "device",
        header: "ئامێر",
        cell: (item) => (
          <span className="inline-flex rounded-lg bg-cyan-50 px-2.5 py-1.5 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {[item.deviceType, item.browser, item.operatingSystem]
              .filter(Boolean)
              .join(" · ") || "نەزانراو"}
          </span>
        ),
      },
      {
        id: "lastSeen",
        header: "دوا چالاکی",
        cell: (item) => (
          <span className="font-semibold text-amber-600 dark:text-amber-300">
            {new Date(item.lastSeenAt).toLocaleString("ku")}
          </span>
        ),
      },
    ],
    [openJourney],
  );

  const actionColumns = useMemo<DataTableColumn<ActionRow>[]>(
    () => [
      {
        id: "label",
        header: "دوگمە / لینک",
        cell: (item) => (
          <span>
            <span
              className="inline-flex rounded-lg px-2.5 py-1.5 font-bold"
              style={{
                background:
                  "color-mix(in srgb, var(--theme-primary) 12%, transparent)",
                color: "var(--theme-primary)",
              }}
            >
              {item.label}
            </span>
            {item.pageName ? (
              <span className="mt-0.5 block text-[10px] text-slate-400">
                {item.pageName}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        id: "type",
        header: "جۆر",
        cell: (item) => (
          <span className="inline-flex rounded-lg bg-violet-50 px-2.5 py-1.5 font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            {actionTypeLabel(item.actionType)}
          </span>
        ),
      },
      {
        id: "total",
        header: "کۆی کلیکەکان",
        cell: (item) => (
          <span className="font-black text-blue-600 dark:text-blue-300">
            {formatNumber(item.totalClicks)}
          </span>
        ),
      },
      {
        id: "unique",
        header: "کلیککەری تاک",
        cell: (item) => (
          <span className="font-black text-cyan-600 dark:text-cyan-300">
            {formatNumber(item.uniqueClickers)}
          </span>
        ),
      },
      {
        id: "ctr",
        header: "ڕێژەی کلیک",
        cell: (item) => (
          <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1.5 font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {item.ctr.toFixed(1)}٪
          </span>
        ),
      },
      {
        id: "conversions",
        header: "ئەنجامی گرنگ",
        cell: (item) => (
          <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1.5 font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {formatNumber(item.conversions)}
          </span>
        ),
      },
    ],
    [],
  );

  const crmColumns = useMemo<DataTableColumn<CrmLead>[]>(
    () => [
      {
        id: "contact",
        header: "کڕیاری پێشبینیکراو",
        cell: (item) => (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-700 dark:text-slate-200">
                {item.name}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  item.hasContactDetails
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                }`}
              >
                {item.hasContactDetails ? "زانیاری پێدراو" : "خۆکار"}
              </span>
            </div>
            {item.email || item.phone ? (
              <div className="mt-1 space-y-0.5 text-[10px] text-slate-400">
                {item.email ? <p>{item.email}</p> : null}
                {item.phone ? <p dir="ltr">{item.phone}</p> : null}
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-slate-400">
                ناسنامە لە چالاکییەوە دروستکراوە
              </p>
            )}
          </div>
        ),
      },
      {
        id: "location",
        header: "شوێن و تۆڕ",
        cell: (item) => {
          const country = item.countryCode
            ? getCountryInfo(item.countryCode)
            : null;
          const location =
            [item.city, item.region, country?.name]
              .filter(Boolean)
              .join("، ") || "شوێن نەزانراوە";
          return (
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <MapPin className="h-3.5 w-3.5" />
                {country?.flag} {location}
              </span>
              <p className="mt-1 text-[10px] text-slate-400">
                {item.networkAddress || "ناونیشانی تۆڕ نەزانراوە"}
              </p>
            </div>
          );
        },
      },
      {
        id: "device",
        header: "ئامێر",
        cell: (item) => (
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              {crmDeviceLabels[item.deviceType || ""] ||
                item.deviceType ||
                "نەزانراو"}
            </span>
            <p className="mt-1 text-[10px] text-slate-400">
              {[item.browser, item.operatingSystem]
                .filter(Boolean)
                .join(" · ") || "وردەکاری نییە"}
            </p>
          </div>
        ),
      },
      {
        id: "interest",
        header: "ئاستی حەز",
        cell: (item) => {
          const intent =
            item.score >= 70
              ? {
                  label: "ئامادەی پەیوەندی",
                  className:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
                }
              : item.score >= 40
                ? {
                    label: "حەزی بەرز",
                    className:
                      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                  }
                : {
                    label: "سەیری سەرەتایی",
                    className:
                      "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
                  };
          return (
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold ${intent.className}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {intent.label} · {item.score}
              </span>
              <p className="mt-1 text-[10px] text-slate-400">
                {formatNumber(item.clickCount)} کلیک ·{" "}
                {formatNumber(item.eventCount)} چالاکی
              </p>
              {item.lastAction ? (
                <p className="mt-0.5 max-w-44 truncate text-[10px] text-slate-400">
                  دوا حەز: {item.lastAction}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "دۆخ",
        cell: (item) => {
          const status = {
            new: {
              label: "نوێ",
              className:
                "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
            },
            contacted: {
              label: "پەیوەندیکراوە",
              className:
                "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300",
            },
            qualified: {
              label: crmStatusLabels.qualified,
              className:
                "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
            },
            won: {
              label: crmStatusLabels.won,
              className:
                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
            },
            lost: {
              label: crmStatusLabels.lost,
              className:
                "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
            },
          }[item.status];
          return (
            <span
              className={`inline-flex min-w-[112px] items-center justify-center gap-2 rounded-xl border px-3 py-2 font-bold ${status.className}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {status.label}
            </span>
          );
        },
      },
      {
        id: "activity",
        header: "دوا چالاکی",
        cell: (item) => (
          <div>
            <p className="font-semibold text-amber-600 dark:text-amber-300">
              {new Date(item.lastSeenAt || item.updatedAt).toLocaleString("ku")}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {channelLabels[item.channel || ""] || "سەرچاوەی نەزانراو"}
            </p>
          </div>
        ),
      },
      {
        id: "note",
        header: "",
        cell: (item) => (
          <button
            type="button"
            onClick={() => setNoteLead(item)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            title="زیادکردنی تێبینی"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <SkeletonDashboardPage
        body={surface === "analytics" ? "analytics" : "table"}
        statCount={surface === "analytics" ? 8 : surface === "crm" ? 4 : 0}
        tabCount={surface === "analytics" ? analyticsTabs.length : 0}
      />
    );
  }

  return (
    <div
      dir="ltr"
      className="theme-custom-scrollbar selection:bg-brand-500/30 dark:selection:bg-brand-500/40"
    >
      {surface === "analytics" && (
        <>
          <StatCardGrid className="mb-8">
            <StatCard
              icon={Eye}
              label="هەموو بینین"
              value={formatNumber(totals.total_views)}
              color="blue"
            />
            <StatCard
              icon={Users}
              label="سەردانکەری تاک"
              value={formatNumber(totals.unique_views)}
              color="purple"
            />
            <StatCard
              icon={MousePointerClick}
              label="کۆی کلیکەکان"
              value={formatNumber(totals.total_clicks)}
              color="green"
            />
            <StatCard
              icon={Target}
              label="کلیککەری تاک"
              value={formatNumber(totals.unique_clicks)}
              color="orange"
            />
            <StatCard
              icon={UserPlus}
              label="سەردانکەری نوێ"
              value={formatNumber(totals.new_visitors)}
              color="pink"
            />
            <StatCard
              icon={Share2}
              label="ڕێژەی گەڕانەوە"
              value={`${totals.returning_rate.toFixed(1)}%`}
              color="slate"
            />
            <StatCard
              icon={TrendingDown}
              label="ڕێژەی دەرچوون"
              value={`${totals.bounce_rate.toFixed(1)}%`}
              color="cyan"
            />
            <StatCard
              icon={Clock3}
              label="ماوەی مانەوە"
              value={formatDuration(totals.avg_engagement_seconds)}
              color="amber"
            />
          </StatCardGrid>
          <div className="mb-6">
            <SegmentedTabs tabs={analyticsTabs} value={tab} onChange={setTab} />
          </div>
        </>
      )}

      {surface === "crm" && (
        <StatCardGrid className="mb-8">
          <StatCard
            icon={ContactRound}
            label="هەموو کڕیارەکان"
            value={formatNumber(crmSummary.total)}
            color="blue"
          />
          <StatCard
            icon={Activity}
            label="کڕیاری نوێ"
            value={formatNumber(crmSummary.statuses.new)}
            color="purple"
          />
          <StatCard
            icon={Target}
            label="گونجاو"
            value={formatNumber(crmSummary.statuses.qualified)}
            color="green"
          />
          <StatCard
            icon={CheckCircle2}
            label="سەرکەوتوو"
            value={formatNumber(crmSummary.statuses.won)}
            color="slate"
          />
        </StatCardGrid>
      )}

      <DashboardSurface>
        <PageHeader
          icon={meta.icon}
          title={meta.title}
          description={meta.description}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                aria-busy={refreshing}
                disabled={refreshing}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
                title="نوێکردنەوە"
              >
                <MotionSpinner active={refreshing}>
                  <RefreshCw className="h-4 w-4" />
                </MotionSpinner>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 sm:w-56 sm:justify-between sm:px-3.5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                title={selectedScopeLabel}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="hidden truncate text-xs font-semibold text-slate-500 sm:inline dark:text-slate-300">
                    {selectedScopeLabel}
                  </span>
                </span>
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-slate-200"
                  aria-label="پاککردنەوەی گەڕان"
                  title="پاککردنەوەی گەڕان"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {surface === "crm" && (
                <button
                  type="button"
                  onClick={() => void exportCrmLeads()}
                  aria-busy={exportingCrm}
                  disabled={!selectedAsset || exportingCrm}
                  title="هەناردەکردنی داتای کڕیاران"
                  className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
                >
                  {exportingCrm ? (
                    <MotionSpinner>
                      <Loader2 className="h-4 w-4 " />
                    </MotionSpinner>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">هەناردەکردن</span>
                </button>
              )}
            </div>
          }
        />

        {surface === "analytics" &&
          tab === "overview" &&
          (!hasOverviewData ? (
            <div className="border-t border-slate-100 pt-6 dark:border-white/5">
              <AnalyticsTabEmptyState tab="overview" />
            </div>
          ) : (
            <AnalyticsOverviewStory
              totals={totals}
              referrers={breakdowns.referrers}
              devices={breakdowns.devices}
              countries={breakdowns.countries}
              detailsLocked={detailsLocked}
            />
          ))}

        {surface === "analytics" && tab === "visitors" && (
          <div className="border-t border-slate-100 pt-6 dark:border-white/5">
            {detailsLocked ? (
              <LockedPanel />
            ) : visitors.length === 0 ? (
              <AnalyticsTabEmptyState tab="visitors" />
            ) : (
              <DataTable
                items={visitors}
                columns={visitorColumns}
                rowKey={(item) => item.id}
                emptyTitle="هیچ سەردانکەرێک نییە"
                minWidthClassName="min-w-[920px]"
              />
            )}
          </div>
        )}

        {surface === "analytics" && tab === "clicks" && (
          <div className="border-t border-slate-100 pt-6 dark:border-white/5">
            {detailsLocked ? (
              <LockedPanel />
            ) : actions.length === 0 ? (
              <AnalyticsTabEmptyState tab="clicks" />
            ) : (
              <DataTable
                items={actions}
                columns={actionColumns}
                rowKey={(item) => item.id}
                emptyTitle="هیچ کلیکێک نییە"
                minWidthClassName="min-w-[820px]"
              />
            )}
          </div>
        )}

        {surface === "analytics" && tab === "funnel" && (
          <div className="border-t border-slate-100 pt-6 dark:border-white/5">
            {detailsLocked ? (
              <LockedPanel />
            ) : !hasFunnelData ? (
              <AnalyticsTabEmptyState tab="funnel" />
            ) : (
              <FunnelChart steps={funnel.steps} dropoff={funnel.dropoff} />
            )}
          </div>
        )}

        {surface === "analytics" && tab === "retention" && (
          <div className="border-t border-slate-100 pt-6 dark:border-white/5">
            {detailsLocked ? (
              <LockedPanel />
            ) : retention.length === 0 ? (
              <AnalyticsTabEmptyState tab="retention" />
            ) : (
              <RetentionGrid rows={retention} />
            )}
          </div>
        )}

        {surface === "analytics" && tab === "realtime" && (
          <div className="space-y-6 border-t border-slate-100 pt-6 dark:border-white/5">
            {detailsLocked ? (
              <LockedPanel />
            ) : !hasRealtimeData ? (
              <AnalyticsTabEmptyState tab="realtime" />
            ) : (
              <>
                <StatCard
                  label="سەردانکەری چالاک لە 5 خولەکی ڕابردوودا"
                  live
                  value={formatNumber(realtime.activeVisitors)}
                  variant="live"
                />
                {realtime.activePages.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {realtime.activePages.map((page) => (
                      <div
                        key={page.pageId}
                        className="flex items-center justify-between gap-3 rounded-2xl border p-4"
                        style={{
                          borderColor:
                            "color-mix(in srgb, var(--theme-primary) 18%, transparent)",
                          background:
                            "color-mix(in srgb, var(--theme-primary) 5%, transparent)",
                        }}
                      >
                        <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                          {page.name}
                        </span>
                        <span
                          className="flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-black"
                          style={{
                            background:
                              "color-mix(in srgb, var(--theme-primary) 12%, transparent)",
                            color: "var(--theme-primary)",
                          }}
                        >
                          {formatNumber(page.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {surface === "crm" && (
          <div className="space-y-6">
            {detailsLocked ? (
              <div className="border-t border-slate-100 pt-6 dark:border-white/5">
                <LockedPanel />
              </div>
            ) : !selectedAsset ? (
              <div className="border-t border-slate-100 pt-6 dark:border-white/5">
                <EmptyState
                  icon={ContactRound}
                  title="پەڕەیەک هەڵبژێرە"
                  description="بەڕێوەبردنی کڕیار بە پەڕەی تاکەوە پەیوەستە."
                />
              </div>
            ) : (
              <div className="border-t border-slate-100 pt-6 dark:border-white/5">
                <DataTable
                  items={crmLeads}
                  columns={crmColumns}
                  rowKey={(item) => item.id}
                  emptyTitle="هیچ کڕیارێکی پێشبینیکراو نییە"
                  minWidthClassName="min-w-[1120px]"
                />
              </div>
            )}
          </div>
        )}

        {surface === "tracking" && detailsLocked && (
          <div className="border-t border-slate-100 pt-6 dark:border-white/5">
            <LockedPanel />
          </div>
        )}

        {surface === "tracking" && !detailsLocked && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-y-8 border-t border-slate-100 pt-6 dark:border-white/5 [&>section:first-child]:order-2 [&>section:nth-child(2)]:order-1">
              <Section
                title="دۆخی ڕووداوەکانی تیکتۆک"
                description="دۆخی ڕووداوەکانی تیکتۆک ببینە؛ ئەگەر کێشەیەک هەبێت لێرە دەردەکەوێت."
              >
                <div
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    tiktok.failed > 0
                      ? "border-red-200 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/[0.06]"
                      : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]"
                  }`}
                >
                  {tiktok.failed > 0 ? (
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {tiktok.failed > 0
                        ? "هەندێک ڕووداو پێویستی بە سەرنجدان هەیە"
                        : "هەموو شتێک ئاساییە"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {tiktok.failed > 0
                        ? "دەتوانیت تەنها ڕووداوە سەرنەکەوتووەکان دووبارە تاقی بکەیتەوە."
                        : "هیچ کارێکت پێویست نییە."}
                    </p>
                  </div>
                </div>
                {tiktok.failed > 0 && (
                  <button
                    type="button"
                    onClick={() => void retryTikTok()}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60 mt-4"
                  >
                    دووبارە هەوڵدانەوە
                  </button>
                )}
              </Section>
              <Section
                title="بەراوردکردنی ئەنجامەکان"
                description="ئەنجامی تۆمارکراوی ناوخۆ لەگەڵ ئەنجامی وەرگیراوی ڕاژەکاری تیکتۆک بەراورد دەکرێت."
              >
                <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-white/5">
                  <StatCard
                    color="green"
                    label="پشتڕاستکراوەی ناوخۆ"
                    value={formatNumber(
                      tiktok.reconciliation.internalConversions,
                    )}
                    variant="comparison"
                  />
                  <StatCard
                    color="blue"
                    label="وەرگیراو لەلایەن تیکتۆک"
                    value={formatNumber(
                      tiktok.reconciliation.serverAcceptedConversions,
                    )}
                    variant="comparison"
                  />
                </div>
              </Section>
            </div>
          </div>
        )}
      </DashboardSurface>

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        placeholder="ناوی پەڕەی لینک یان وێبسایتی بچووک بنووسە..."
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        wide
        businessTheme
      >
        <div className="space-y-4 p-2">
          <div className="grid gap-3 border-b border-slate-100 pb-4 dark:border-white/5 sm:grid-cols-2">
            <CustomSelect
              label="پەڕەی شیکاری"
              value={scope}
              options={scopeOptions}
              onChange={(nextScope) => {
                setScope(nextScope);
                setSearchQuery("");
              }}
            />
            {surface !== "crm" && (
              <CustomSelect
                label="ماوەی کات"
                value={period}
                options={periodOptions}
                onChange={setPeriod}
              />
            )}
          </div>
          <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              پەڕەکان
            </span>
            <span className="text-[10px] text-slate-400">
              {formatNumber(filteredAssets.length)}
            </span>
          </div>
          {filteredAssets.length ? (
            <div className="grid gap-1 sm:grid-cols-2">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    setScope(`page:${asset.id}`);
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                    scope === `page:${asset.id}`
                      ? "bg-brand-500/10 ring-1 ring-inset ring-brand-500/25"
                      : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                    {asset.type === "linktree" ? (
                      <Link2 className="h-4 w-4 text-slate-400" />
                    ) : (
                      <IdCard className="h-4 w-4 text-slate-400" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      {asset.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                      {asset.type === "linktree"
                        ? "پەڕەی لینک"
                        : "وێبسایتی بچووک"}{" "}
                      / {asset.slug}
                    </span>
                  </span>
                  {scope === `page:${asset.id}` && (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--theme-primary)" }}
                    />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Search}
              title="هیچ ئەنجامێک نەدۆزرایەوە"
              description="ناوی پەڕەکە بپشکنە و دووبارە هەوڵبدەوە."
            />
          )}
        </div>
      </SearchModal>

      <ManagementModal
        isOpen={Boolean(journeyVisitor)}
        onClose={() => setJourneyVisitor(null)}
        title={`سەردانکەر #${journeyVisitor?.anonymousId || ""}`}
        description="ڕێڕەوی تەواوی چالاکی بە ڕیزبەندی کات."
        wide
      >
        {journey.length ? (
          <div className="space-y-0">
            {journey.map((event, index) => (
              <div key={event.id} className="relative flex gap-4 pb-5">
                <div className="flex w-5 flex-col items-center">
                  <span
                    className="mt-1 h-3 w-3 rounded-full border-2 border-white shadow"
                    style={{ background: "var(--theme-primary)" }}
                  />
                  {index < journey.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-white/10" />
                  )}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-slate-100 p-3 dark:border-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      {event.actionLabel || eventLabel(event.eventName)}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {new Date(event.occurredAt).toLocaleString("ku")}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {eventLabel(event.eventName)} · دانیشتن{" "}
                    {event.sessionId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            icon={Route}
            title="هیچ ڕووداوێک نییە"
            description="ڕووداوەکانی ئەم سەردانکەرە لێرە پیشان دەدرێن."
          />
        )}
      </ManagementModal>

      <ManagementModal
        isOpen={Boolean(noteLead)}
        onClose={() => {
          if (!saving) setNoteLead(null);
        }}
        title="زیادکردنی تێبینی"
        description={noteLead?.name}
        busy={saving}
        accentColor={businessTheme.raw}
        footer={
          <>
            <button
              type="button"
              onClick={() => setNoteLead(null)}
              disabled={saving}
              className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300"
            >
              پاشگەزبوونەوە
            </button>
            <button
              type="button"
              onClick={() => void saveNote()}
              aria-busy={saving}
              disabled={!note.trim() || saving}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent px-4 text-xs font-bold text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "پاراستن..." : "پاراستن"}
            </button>
          </>
        }
      >
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="تێبینییەک بنووسە..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-[var(--theme-primary)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
        />
      </ManagementModal>
    </div>
  );
}
