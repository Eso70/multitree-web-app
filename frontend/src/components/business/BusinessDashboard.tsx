"use client";

import { MotionPulseIcon } from "@/components/motion/MotionPrimitives";

import {
  memo,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import Image from "next/image";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import {
  LayoutTemplate,
  LayoutDashboard,
  FileText,
  Search,
  LogOut,
  User,
  Settings,
  IdCard,
  BarChart3,
  ContactRound,
  Megaphone,
} from "lucide-react";
import { TbBrandTiktok } from "react-icons/tb";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  normalizeTemplateConfig,
  type TemplateKey,
} from "@/lib/templates/config";
import { toast } from "sonner";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import { useLinktrees } from "@/features/business/hooks/useLinktrees";
import type { BusinessLinktreeSummary as Linktree } from "@linktree/types";
import { BusinessLinktreesPage } from "@/features/business/components/BusinessLinktreesPage";
import type { EffectiveAccessManifest } from "@linktree/types";
import { BusinessCommunicationBell } from "@/features/communications/BusinessCommunicationBell";
import { BusinessAnnouncementBanners } from "@/features/communications/BusinessAnnouncementBanners";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import {
  DashboardSidebar,
  type DashboardSidebarItem,
} from "@/components/shared/DashboardSidebar";
import {
  isBusinessPageLocked,
  type BusinessDashboardPage,
} from "@/lib/business-page-access";
import { LockedContent } from "@/components/shared/LockedContent";
import { usePolling } from "@/lib/utils/usePolling";
import { persistAppTheme } from "@/lib/app-theme";
import { useBusinessAnalyticsTotals } from "@/features/business/hooks/useBusinessAnalyticsTotals";
import {
  getBusinessDashboardState,
  logoutBusiness,
} from "@/features/business/api";
import { apiRequest, isApiRequestError } from "@/lib/api/request";
import { ErrorPage } from "@/components/error-pages/ErrorPage";
import { businessErrorTheme } from "@/components/error-pages/error-theme";
import { ERROR_PAGE_COPY } from "@/components/error-pages/copy";
import { DEFAULT_BUSINESS_ACCENT } from "@/lib/utils/business-error-theme";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { businessTabTitle } from "@/lib/utils/tab-title";
import {
  SkeletonDashboardPage,
  SkeletonManagementPage,
  SkeletonModal,
  SkeletonTemplatePage,
} from "@/components/shared/Skeleton";
import {
  BusinessDashboardRefreshProvider,
  useBusinessDashboardRefreshController,
} from "@/features/business/dashboard-refresh";
import { BusinessSidebarFooter } from "@/features/business/components/BusinessSidebarFooter";
import { BusinessDashboardOverviewPage } from "@/features/business/components/BusinessDashboardOverviewPage";

// Dynamically import heavy components with preloading only when needed
// Create/Edit modal: large multi-step form
const LinktreeEditorModal = dynamic(
  () =>
    import("@/components/business/LinktreeEditorModal").then((mod) => ({
      default: mod.LinktreeEditorModal,
    })),
  {
    ssr: false,
    loading: () => <SkeletonModal />,
    // Preload on hover/focus for better UX
  },
);

const BusinessSettingsPage = dynamic(
  () =>
    import("@/components/business/BusinessSettingsPage").then((mod) => ({
      default: mod.BusinessSettingsPage,
    })),
  {
    ssr: false,
    loading: () => (
      <SkeletonDashboardPage body="form" statCount={4} tabCount={5} />
    ),
  },
);

const MiniWebsitesPage = dynamic(
  () =>
    import("@/features/mini-website/MiniWebsitesPage").then((mod) => ({
      default: mod.MiniWebsitesPage,
    })),
  { ssr: false, loading: () => <SkeletonManagementPage /> },
);

const TemplatesPage = dynamic(
  () =>
    import("@/features/templates/components/TemplatesPage").then((mod) => ({
      default: mod.TemplatesPage,
    })),
  { ssr: false, loading: () => <SkeletonTemplatePage /> },
);

const BusinessAnalyticsPage = dynamic(
  () =>
    import("@/features/analytics/components/BusinessAnalyticsPage").then(
      (mod) => ({ default: mod.BusinessAnalyticsPage }),
    ),
  {
    ssr: false,
    loading: () => (
      <SkeletonDashboardPage body="analytics" statCount={8} tabCount={6} />
    ),
  },
);

const BusinessCrmPage = dynamic(
  () =>
    import("@/features/analytics/components/BusinessCrmPage").then((mod) => ({
      default: mod.BusinessCrmPage,
    })),
  {
    ssr: false,
    loading: () => <SkeletonDashboardPage body="table" statCount={4} />,
  },
);

const BusinessLinktreeAnalyticsModal = dynamic(
  () =>
    import("@/components/business/BusinessLinktreeAnalyticsModal").then(
      (mod) => ({ default: mod.BusinessLinktreeAnalyticsModal }),
    ),
  { ssr: false, loading: () => <SkeletonModal wide /> },
);

const BusinessTikTokConfigPage = dynamic(
  () =>
    import("@/features/analytics/components/BusinessTikTokConfigPage").then(
      (mod) => ({
        default: mod.BusinessTikTokConfigPage,
      }),
    ),
  {
    ssr: false,
    loading: () => (
      <SkeletonDashboardPage body="analytics" statCount={4} tabCount={2} />
    ),
  },
);

const AdvertisingServicePage = dynamic(
  () =>
    import("@/features/advertising/components/AdvertisingServicePage").then(
      (mod) => ({ default: mod.AdvertisingServicePage }),
    ),
  {
    ssr: false,
    loading: () => (
      <SkeletonDashboardPage body="form" statCount={4} tabCount={5} />
    ),
  },
);

const BusinessGettingStarted = dynamic(
  () =>
    import("@/features/onboarding/components/BusinessGettingStarted").then(
      (mod) => ({ default: mod.BusinessGettingStarted }),
    ),
  { ssr: false },
);

interface BusinessDashboardProps {
  initialLinktrees?: Linktree[];
  currentUsername?: string;
  businessName?: string;
  businessPhone?: string | null;
  businessLogo?: string | null;
  businessFavicon?: string | null;
  businessDefaults?: {
    default_footer_text?: string | null;
    default_footer_phone?: string | null;
    default_template?: string | null;
    default_background_color?: string | null;
    default_footer_hidden?: boolean;
    default_whatsapp_enabled?: boolean;
    default_avatar?: string | null;
  } | null;
  websiteColor?: string | null;
  effectiveAccess?: EffectiveAccessManifest | null;
  onboardingRequired?: boolean;
  onboardingStep?: number;
}

type BusinessTheme = "light" | "dark";
const BUSINESS_PAGE_TITLES: Record<BusinessDashboardPage, string> = {
  dashboard: "داشبۆرد",
  linktrees: "پەیجەکان",
  "mini-website": "مینی وێبسایت",
  analytics: "شیکاری",
  crm: "بەڕێوەبردنی پەیوەندییەکانی کڕیار",
  "tiktok-config": "ڕێکخستنەکانی تیکتۆک",
  advertising: "خزمەتگوزاری ڕیکلام",
  templates: "قاڵبەکان",
  profile: "پڕۆفایل",
  settings: "ڕێکخستنەکان",
};

function getBusinessPage(pathname: string): BusinessDashboardPage {
  const segment = pathname.split("/").filter(Boolean)[1];
  if (!segment) return "dashboard";
  if (segment === "pages") return "linktrees";
  return segment === "mini-website" ||
    segment === "analytics" ||
    segment === "crm" ||
    segment === "tiktok-config" ||
    segment === "advertising" ||
    segment === "templates" ||
    segment === "profile" ||
    segment === "settings"
    ? segment
    : "dashboard";
}

function LockedBusinessContent({
  locked,
  reason,
  children,
}: {
  locked: boolean;
  reason: string;
  children: ReactNode;
}) {
  return (
    <LockedContent
      locked={locked}
      description={reason}
      className="min-h-0 flex-1"
    >
      {children}
    </LockedContent>
  );
}

export const BusinessDashboard = memo(function BusinessDashboard({
  initialLinktrees = [],
  currentUsername = "",
  businessName,
  businessPhone,
  businessLogo,
  businessFavicon,
  businessDefaults,
  websiteColor,
  effectiveAccess,
  onboardingRequired = false,
  onboardingStep = 1,
}: BusinessDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // All hooks must be called before any conditional returns
  const {
    linktrees: linktreesData,
    isLoading,
    reload: fetchLinktrees,
    removeLinktree,
    mergeLinktree,
    prependLinktree,
    mapLinktrees,
  } = useLinktrees(initialLinktrees);
  const createDefaultFromUrl = searchParams.get("create") === "default";
  const [isModalOpen, setIsModalOpen] = useState(createDefaultFromUrl);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [linktreeToDelete, setLinktreeToDelete] = useState<{
    id: string;
    uid: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid"); // Default to grid view
  const [theme, setTheme] = useState<BusinessTheme>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = window.localStorage.getItem("app-theme");
      return saved === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const activeTab = getBusinessPage(pathname);
  const sidebarItems = useMemo<DashboardSidebarItem[]>(
    () => [
      {
        id: "dashboard",
        label: "داشبۆرد",
        icon: <LayoutDashboard className="h-4 w-4" />,
        active: activeTab === "dashboard",
        onClick: () => router.push("/business"),
      },
      {
        id: "linktrees",
        label: "پەیجەکان",
        icon: <FileText className="h-4 w-4" />,
        active: activeTab === "linktrees",
        onClick: () => router.push("/business/pages"),
      },
      {
        id: "mini-website",
        label: "مینی وێبسایت",
        icon: <IdCard className="h-4 w-4" />,
        active: activeTab === "mini-website",
        onClick: () => router.push("/business/mini-website"),
      },
      {
        id: "analytics",
        label: "شیکاری",
        icon: <BarChart3 className="h-4 w-4" />,
        active: activeTab === "analytics",
        onClick: () => router.push("/business/analytics"),
      },
      {
        id: "crm",
        label: "بەڕێوەبردنی پەیوەندییەکانی کڕیار",
        icon: <ContactRound className="h-4 w-4" />,
        active: activeTab === "crm",
        onClick: () => router.push("/business/crm"),
      },
      {
        id: "tiktok-config",
        label: "ڕێکخستنەکانی تیکتۆک",
        icon: <TbBrandTiktok className="h-4 w-4" />,
        active: activeTab === "tiktok-config",
        onClick: () => router.push("/business/tiktok-config"),
      },
      {
        id: "templates",
        label: "قاڵبەکان",
        icon: <LayoutTemplate className="h-4 w-4" />,
        active: activeTab === "templates",
        onClick: () => router.push("/business/templates"),
      },
      {
        id: "advertising",
        label: "خزمەتگوزاری ڕیکلام",
        icon: <Megaphone className="h-4 w-4" />,
        active: activeTab === "advertising",
        onClick: () => router.push("/business/advertising"),
      },
      {
        id: "settings",
        label: "ڕێکخستنەکان",
        icon: <Settings className="h-4 w-4" />,
        active: activeTab === "settings",
        onClick: () => router.push("/business/settings"),
      },
    ],
    [activeTab, router],
  );
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [accessForbidden, setAccessForbidden] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [badGateway, setBadGateway] = useState(false);
  const [gatewayTimeout, setGatewayTimeout] = useState(false);
  const [isClearAnalyticsModalOpen, setIsClearAnalyticsModalOpen] =
    useState(false);
  const [isClearingAnalytics, setIsClearingAnalytics] = useState(false);
  const [analyticsModalLinktree, setAnalyticsModalLinktree] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isCreatingDefault, setIsCreatingDefault] =
    useState(createDefaultFromUrl);

  const [name, setName] = useState(businessName);
  const [phone, setPhone] = useState(businessPhone || "");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState(businessLogo);
  const [favicon, setFavicon] = useState(businessFavicon);
  const [defaults, setDefaults] = useState(businessDefaults);
  const [wColor, setWColor] = useState(websiteColor);
  const [refreshedEffectiveAccess, setRefreshedEffectiveAccess] =
    useState<EffectiveAccessManifest | null>(null);
  const liveEffectiveAccess =
    refreshedEffectiveAccess ?? effectiveAccess ?? null;
  const pageLocked = isBusinessPageLocked(activeTab, liveEffectiveAccess);
  const pageLockReason =
    "بۆ بەکارهێنانی ئەم بەشە پێویستە پلانی بەشداربوونت بەرزبکەیتەوە";

  // Set browser tab title and favicon dynamically for this business
  useEffect(() => {
    const sectionTitles: Record<
      BusinessDashboardPage,
      Parameters<typeof businessTabTitle>[1]
    > = {
      dashboard: "Dashboard",
      linktrees: "Pages",
      "mini-website": "Website",
      analytics: "Analytics",
      crm: "CRM",
      "tiktok-config": "TikTok Config",
      advertising: "Ads",
      templates: "Templates",
      profile: "Profile",
      settings: "Settings",
    };
    document.title = businessTabTitle(
      name || currentUsername || "Business",
      sectionTitles[activeTab],
    );
    if (favicon) {
      let link = document.querySelector(
        "link[rel~='icon']",
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = favicon;
    }
  }, [name, favicon, currentUsername, activeTab]);

  // Last payloads seen, so an unchanged response costs nothing. Previously every
  // tick re-set state and dispatched events, re-rendering the whole dashboard
  // several times a second even when nothing had actually changed.
  const lastAccessRef = useRef<string>("");
  const lastProfileRef = useRef<string>("");

  const refreshDashboardState = useCallback(
    async (rethrow = false) => {
      try {
        const result = await getBusinessDashboardState();
        const serializedAccess = JSON.stringify(result.effectiveAccess);
        if (serializedAccess !== lastAccessRef.current) {
          lastAccessRef.current = serializedAccess;
          setRefreshedEffectiveAccess(result.effectiveAccess);
          window.dispatchEvent(
            new CustomEvent("multitree:access-updated", {
              detail: result.effectiveAccess,
            }),
          );
        }

        if (result.profile) {
          const serializedProfile = JSON.stringify(result.profile);
          if (serializedProfile !== lastProfileRef.current) {
            lastProfileRef.current = serializedProfile;
            window.dispatchEvent(
              new CustomEvent("multitree:business-settings-updated", {
                detail: result.profile,
              }),
            );
          }
        }
        setAccessForbidden(false);
        setBadGateway(false);
        setServiceUnavailable(false);
        setGatewayTimeout(false);
      } catch (error) {
        // Folded in from the separate session poll: a revoked or deleted session
        // shows up here, so it does not need a request of its own.
        if (isApiRequestError(error, 403)) {
          setAccessForbidden(true);
          setBadGateway(false);
          setServiceUnavailable(false);
          setGatewayTimeout(false);
          if (rethrow) throw error;
          return;
        }
        if (isApiRequestError(error, 502)) {
          setBadGateway(true);
          setServiceUnavailable(false);
          setGatewayTimeout(false);
          if (rethrow) throw error;
          return;
        }
        if (isApiRequestError(error, 504)) {
          setBadGateway(false);
          setServiceUnavailable(false);
          setGatewayTimeout(true);
          if (rethrow) throw error;
          return;
        }
        if (
          isApiRequestError(error) &&
          (error.status === 0 || error.status === 503)
        ) {
          setBadGateway(false);
          setGatewayTimeout(false);
          setServiceUnavailable(true);
          if (rethrow) throw error;
          return;
        }
        if (isApiRequestError(error) && [401, 404].includes(error.status)) {
          window.location.href = "/login";
        }
        // Keep the last valid manifest during transient network failures.
        if (rethrow) throw error;
      }
    },
    [
      setAccessForbidden,
      setBadGateway,
      setGatewayTimeout,
      setRefreshedEffectiveAccess,
      setServiceUnavailable,
    ],
  );

  usePolling(refreshDashboardState, 15_000);

  useEffect(() => {
    const syncSettings = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      if (!detail) return;
      if (typeof detail.name === "string") setName(detail.name);
      if (typeof detail.phone === "string") setPhone(detail.phone);
      if (typeof detail.email === "string") setEmail(detail.email);
      if (typeof detail.logo === "string") setLogo(detail.logo);
      if (typeof detail.favicon === "string") setFavicon(detail.favicon);
      if (typeof detail.website_color === "string")
        setWColor(detail.website_color);
      setDefaults((current) => ({
        ...current,
        default_footer_text:
          typeof detail.default_footer_text === "string"
            ? detail.default_footer_text
            : current?.default_footer_text,
        default_footer_phone:
          typeof detail.default_footer_phone === "string"
            ? detail.default_footer_phone
            : current?.default_footer_phone,
        default_template:
          typeof detail.default_template === "string"
            ? detail.default_template
            : current?.default_template,
        default_background_color:
          typeof detail.default_background_color === "string"
            ? detail.default_background_color
            : current?.default_background_color,
        default_footer_hidden:
          typeof detail.default_footer_hidden === "boolean"
            ? detail.default_footer_hidden
            : current?.default_footer_hidden,
        default_whatsapp_enabled:
          typeof detail.default_whatsapp_enabled === "boolean"
            ? detail.default_whatsapp_enabled
            : current?.default_whatsapp_enabled,
        default_avatar:
          typeof detail.default_avatar === "string"
            ? detail.default_avatar
            : current?.default_avatar,
      }));
    };
    window.addEventListener(
      "multitree:business-settings-updated",
      syncSettings,
    );
    return () =>
      window.removeEventListener(
        "multitree:business-settings-updated",
        syncSettings,
      );
  }, []);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const searchModalRef = useRef<HTMLDivElement>(null);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  }, [theme]);

  const isDarkActive = theme === "dark";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    if (typeof window === "undefined") return;
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutBusiness();
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    persistAppTheme(isDarkActive ? "dark" : "light");
  }, [isDarkActive]);

  // Search keyboard shortcuts (Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isKKey = e.key === "k" || e.key === "K" || e.code === "KeyK";
      if ((e.ctrlKey || e.metaKey) && isKKey) {
        if (activeTab !== "linktrees") return;
        e.preventDefault();
        e.stopPropagation();
        setIsSearchModalOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [activeTab]);

  // Detect URL params: ?create=default or ?edit=<id>
  useEffect(() => {
    if (createDefaultFromUrl) {
      // Strip the param immediately so a later refresh doesn't reopen this modal.
      router.replace("/business/pages", { scroll: false });
    }
  }, [createDefaultFromUrl, router]);

  // Search click-outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchModalRef.current &&
        !searchModalRef.current.contains(event.target as Node)
      ) {
        setIsSearchModalOpen(false);
      }
    };
    if (isSearchModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchModalOpen]);

  // Filtered linktrees for grid/table
  const filteredLinktrees = useMemo(() => {
    if (!searchQuery.trim()) return linktreesData;
    const q = searchQuery.toLowerCase().trim();
    return linktreesData.filter((item) => item.name.toLowerCase().includes(q));
  }, [linktreesData, searchQuery]);

  // Search results for command palette
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return linktreesData.filter((item) => item.name.toLowerCase().includes(q));
  }, [linktreesData, searchQuery]);

  const {
    totals: analyticsTotals,
    hasData: hasAnalyticsData,
    isLoading: isAnalyticsLoading,
    refresh: fetchAnalyticsTotals,
    reset: resetAnalyticsTotals,
  } = useBusinessAnalyticsTotals("linktree", activeTab === "linktrees");
  const isSubmittingRef = useRef(false); // Prevent duplicate submissions
  const [editData, setEditData] = useState<{
    linktree: Linktree;
    links: Array<{
      id: string;
      platform: string;
      url: string;
      display_name?: string | null;
      description?: string | null;
      default_message?: string | null;
      display_order: number;
      metadata?: Record<string, unknown> | null;
    }>;
  } | null>(null);

  const handleRefresh = useCallback(
    async (rethrow = false) => {
      setIsRefreshing(true);
      try {
        const { flushNow } = await import("@/lib/utils/client-queue");
        await flushNow().catch(() => {});
        await Promise.all([
          fetchLinktrees(false, true, true),
          fetchAnalyticsTotals({ rethrow: true }),
        ]);
      } catch (error) {
        if (rethrow) throw error;
        toast.error("نوێکردنەوەی پەڕەکانی لینک‌تری سەرکەوتوو نەبوو");
      } finally {
        setIsRefreshing(false);
      }
    },
    [fetchLinktrees, fetchAnalyticsTotals, setIsRefreshing],
  );

  const refreshSharedDashboardData = useCallback(
    () => refreshDashboardState(true),
    [refreshDashboardState],
  );
  const dashboardRefresh = useBusinessDashboardRefreshController(
    refreshSharedDashboardData,
  );
  const handleGlobalDashboardRefresh = useCallback(async () => {
    const result = await dashboardRefresh.refresh();
    if (result.failed > 0) {
      toast.error("هەندێک لە داتاکانی داشبۆرد نوێ نەکرانەوە");
      return;
    }
    toast.success("داتاکانی داشبۆرد نوێکرانەوە");
  }, [dashboardRefresh]);

  const handleClearAllAnalytics = async () => {
    if (isClearingAnalytics || !hasAnalyticsData) return;

    setIsClearingAnalytics(true);
    try {
      await Promise.all(
        linktreesData.map(async (linktree) => {
          const response = await fetch(
            `/api/linktrees/${encodeURIComponent(linktree.id)}/analytics/clear`,
            {
              method: "POST",
              credentials: "include",
              cache: "no-store",
            },
          );
          if (!response.ok) {
            throw new Error("Failed to clear Linktree analytics");
          }
        }),
      );

      const { clearCachedData } = await import("@/lib/utils/cache");
      clearCachedData("/api/linktrees");

      resetAnalyticsTotals();
      mapLinktrees((item) => ({
        ...item,
        analytics: item.analytics
          ? { ...item.analytics, unique_views: 0, unique_clicks: 0 }
          : item.analytics,
      }));
      setIsClearAnalyticsModalOpen(false);
      await Promise.all([fetchLinktrees(false, true), fetchAnalyticsTotals()]);
    } catch (error) {
      console.error("Error clearing analytics:", error);
    } finally {
      setIsClearingAnalytics(false);
    }
  };

  // Client-side authentication check - redirect if no username provided.
  // Ongoing session validity rides along with the dashboard-state poll above,
  // which already sees a revoked session on /api/auth/effective-access.
  useEffect(() => {
    if (!currentUsername || currentUsername.trim() === "") {
      window.location.href = "/login";
    }
  }, [currentUsername]);

  useEffect(() => {
    // Preload modal component in background for faster subsequent opens
    import("@/components/business/LinktreeEditorModal").catch(() => {
      // Silently fail preload - not critical
    });
  }, []);

  const handleEdit = useCallback(async (id: string) => {
    // Open modal immediately for better UX
    setIsModalOpen(true);
    setIsLoadingEditData(true);
    setEditData(null); // Clear previous data

    try {
      // apiRequest owns envelope parsing, so a failure arrives as an
      // ApiRequestError carrying the server's message rather than a raw body.
      const data = await apiRequest<{
        linktree: Linktree;
        links: NonNullable<typeof editData>["links"];
      }>(`/api/linktrees/${id}/edit`);

      // Validate required fields
      if (!data?.linktree?.id) {
        throw new Error("Invalid response format: missing linktree data");
      }

      if (!Array.isArray(data.links)) {
        throw new Error("Invalid response format: links must be an array");
      }

      setEditData({ linktree: data.linktree, links: data.links });
    } catch (error) {
      // If unauthorized, suggest re-login and keep the modal open otherwise.
      if (isApiRequestError(error, 401)) {
        const shouldReload = window.confirm(
          "دەستپێکردنەوەت بەسەرهاتووە. دەتەوێت دووبارە لۆگین بکەیت؟",
        );
        if (shouldReload) {
          window.location.href = "/login";
        }
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Failed to load linktree data";
      console.error(`Failed to load linktree data: ${errorMessage}`);

      setIsModalOpen(false); // Close modal on error
    } finally {
      setIsLoadingEditData(false);
    }
  }, []);

  const handleViewAnalytics = (id: string, name: string) => {
    setAnalyticsModalLinktree({ id, name });
  };

  const handleDelete = useCallback((id: string, uid: string, name: string) => {
    // Prevent deletion of default "id" linktree
    if (uid === "id") {
      console.error("ناتوانیت پەیج پێشگریمان بسڕیتەوە");
      return;
    }

    setLinktreeToDelete({ id, uid, name });
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!linktreeToDelete || isDeleting) return;

    setIsDeleting(true);

    // Optimistic update - remove from UI immediately
    const deletedId = linktreeToDelete.id;
    removeLinktree(deletedId);

    // Close modal immediately for better UX
    setIsDeleteModalOpen(false);
    setLinktreeToDelete(null);

    try {
      const response = await fetch(`/api/linktrees/${deletedId}`, {
        method: "DELETE",
        credentials: "include", // Include cookies for authentication
        cache: "no-store",
      });

      if (!response.ok) {
        // Revert optimistic update on error
        await fetchLinktrees(false, true);
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to delete linktree";
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Clear cache after successful deletion (batch clear)
      const { clearCachedData } = await import("@/lib/utils/cache");
      if (linktreeToDelete) {
        // Clear all related caches in one batch
        clearCachedData("/api/linktrees");
        clearCachedData(`/api/linktrees/${linktreeToDelete.id}`);
        clearCachedData(`/api/linktrees/${linktreeToDelete.id}/links`);
        clearCachedData(`/api/linktrees/${linktreeToDelete.id}/analytics`);
      }

      // Success - no need to fetch again, optimistic update already applied
      toast.success("پەڕەکە بە سەرکەوتوویی سڕایەوە");
    } catch (error) {
      console.error("Error deleting linktree:", error);
      toast.error("سڕینەوەی پەڕەکە سەرکەوتوو نەبوو");
    } finally {
      setIsDeleting(false);
    }
  }, [linktreeToDelete, isDeleting, fetchLinktrees, removeLinktree]);

  const handleDeleteModalClose = useCallback(() => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
      setLinktreeToDelete(null);
    }
  }, [isDeleting]);

  // Left unmemoised on purpose: React Compiler handles the memoisation here, and
  // wrapping it in useCallback trips react-hooks/preserve-manual-memoization.
  // It only calls state setters, so a fresh identity per render is harmless.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditData(null);
    setIsCreatingDefault(false);
  };

  // Handle ?edit=<id> URL param on initial mount (full page navigation)
  const editParam = searchParams.get("edit");
  useEffect(() => {
    if (!editParam) return;
    const frame = window.requestAnimationFrame(() => {
      void handleEdit(editParam);
      // Strip the param immediately so a later refresh doesn't reopen this modal.
      router.replace("/business/pages", { scroll: false });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editParam, handleEdit, router]);

  const handleCreateNew = useCallback(() => {
    setEditData(null);
    setIsModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (
      data: {
        name: string;
        subtitle?: string;
        description?: string;
        slug: string;
        image: string | null;
        background_color: string;
        templateKey: TemplateKey;
        templateConfig: Record<string, unknown>;
        footer_text?: string;
        footer_phone?: string;
        footer_hidden?: boolean;
        platforms: string[];
        links: Record<string, string[]>;
        linkMetadata?: Record<
          string,
          Array<{
            display_name?: string;
            description?: string;
            default_message?: string;
            metadata?: Record<string, unknown>;
          }>
        >;
        is_default?: boolean;
      },
      editId?: string,
    ) => {
      // Prevent duplicate submissions
      if (isSubmittingRef.current) {
        // Submission already in progress, ignoring duplicate call
        return;
      }

      // Mark as submitting immediately to prevent duplicates
      isSubmittingRef.current = true;
      let errorShown = false; // Track if error was shown

      try {
        const normalizedTemplateConfig = normalizeTemplateConfig(
          data.templateKey,
          data.templateConfig,
        );

        if (editId) {
          // ============================================
          // UPDATE EXISTING LINKTREE
          // ============================================

          // Validate required fields
          if (
            !data.name?.trim() ||
            !data.slug?.trim() ||
            !data.background_color
          ) {
            console.error("Name, slug, and background color are required");
            throw new Error("Missing required fields");
          }

          if (!data.templateKey) {
            console.error("Template key is required");
            throw new Error("Missing template key");
          }

          // Validate links exist
          if (!data.links || Object.keys(data.links).length === 0) {
            console.error("At least one link is required");
            throw new Error("No links provided");
          }

          // Validate editId is a valid UUID
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(editId)) {
            console.error("Invalid linktree ID");
            throw new Error("Invalid linktree ID format");
          }

          // Step 1: Update linktree metadata
          const updateResponse = await fetch(`/api/linktrees/${editId}`, {
            method: "PATCH",
            credentials: "include", // Include cookies for authentication
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name.trim(),
              subtitle: data.subtitle?.trim() || null,
              description: data.description?.trim() || null,
              seo_name: data.slug.trim(),
              image: data.image || null,
              background_color: data.background_color,
              template_config: normalizedTemplateConfig,
              footer_text: data.footer_text?.trim() || null,
              footer_phone: data.footer_phone?.trim() || null,
              footer_hidden: data.footer_hidden ?? false,
            }),
          });

          if (!updateResponse.ok) {
            type ErrorDetail = { field?: string; message?: string };
            let errorData: {
              error?: string;
              details?: ErrorDetail[] | string;
            } | null = null;

            try {
              const text = await updateResponse.text();
              if (text) {
                const parsed = JSON.parse(text) as unknown;
                if (parsed && typeof parsed === "object") {
                  // The API envelope nests the failure: `{ error: { code,
                  // message, details } }`, with `details` a list of plain
                  // strings from class-validator. Reading only a flat
                  // `{ error: string }` meant every validation failure arrived
                  // as a bare "Validation failed" with the one useful part —
                  // which field, and why — thrown away.
                  const body = parsed as {
                    error?: unknown;
                    details?: unknown;
                    message?: unknown;
                  };
                  const envelope =
                    body.error && typeof body.error === "object"
                      ? (body.error as {
                          message?: unknown;
                          details?: unknown;
                        })
                      : undefined;

                  const rawDetails = envelope?.details ?? body.details;
                  const parsedDetails = Array.isArray(rawDetails)
                    ? rawDetails
                        .map((detail): ErrorDetail | null => {
                          // `["createLinks.0.url must be a URL address"]`
                          if (typeof detail === "string") {
                            return { message: detail };
                          }
                          if (typeof detail === "object" && detail !== null) {
                            const entry = detail as ErrorDetail;
                            return {
                              field:
                                typeof entry.field === "string"
                                  ? entry.field
                                  : undefined,
                              message:
                                typeof entry.message === "string"
                                  ? entry.message
                                  : undefined,
                            };
                          }
                          return null;
                        })
                        .filter((detail): detail is ErrorDetail => !!detail)
                    : undefined;

                  const messageOf = (value: unknown) =>
                    typeof value === "string" ? value : undefined;

                  errorData = {
                    error:
                      messageOf(body.error) ??
                      messageOf(envelope?.message) ??
                      messageOf(body.message),
                    details:
                      parsedDetails ?? messageOf(rawDetails) ?? undefined,
                  };
                }
              }
            } catch (parseError) {
              console.error("Failed to parse error response:", parseError);
              errorData = {
                error: `HTTP ${updateResponse.status}: ${updateResponse.statusText}`,
              };
            }

            const detailMessage = Array.isArray(errorData?.details)
              ? errorData.details
                  .filter(
                    (detail) => detail && (detail.field || detail.message),
                  )
                  .map((detail) => {
                    const fieldPrefix = detail.field ? `${detail.field}: ` : "";
                    return `${fieldPrefix}${detail.message ?? ""}`.trim();
                  })
                  .filter((entry) => entry.length > 0)
                  .join(", ")
              : typeof errorData?.details === "string"
                ? errorData.details
                : "";

            const baseMessage =
              errorData?.error ||
              `Failed to update linktree (HTTP ${updateResponse.status})`;
            const errorMessage = detailMessage
              ? `${baseMessage}: ${detailMessage}`
              : baseMessage;
            console.error(
              "Update error:",
              errorMessage,
              errorData ?? undefined,
            );
            throw new Error(errorMessage);
          }

          // Step 2: Fetch existing links (must delete ALL before creating new ones)
          const linksResponse = await fetch(`/api/linktrees/${editId}/links`, {
            credentials: "include",
            cache: "no-store",
          });
          const existingLinkIds: string[] = [];
          if (linksResponse.ok) {
            const linksResult = await linksResponse.json();
            const existingLinks = linksResult.data || [];
            existingLinkIds.push(
              ...existingLinks.map((link: { id: string }) => link.id),
            );
          } else {
            console.error(
              "Failed to fetch existing links:",
              linksResponse.status,
              linksResponse.statusText,
            );
            // If we can't fetch existing links, we should still try to delete all links for this linktree
            // This is a safety measure to prevent duplicates
          }

          // Step 3: Prepare links to create
          const linksToCreate: Array<{
            platform: string;
            url: string;
            display_order: number;
            display_name?: string | null;
            description?: string | null;
            default_message?: string | null;
            metadata?: Record<string, unknown>;
          }> = [];

          // Track linkId to index mapping for error display
          const linkIdToIndexMap: Record<number, string> = {};
          let linkCreateIndex = 0;

          if (data.links && Object.keys(data.links).length > 0) {
            let displayOrder = 0;
            for (const [platform, urls] of Object.entries(data.links)) {
              // Validate platform
              if (
                !platform ||
                typeof platform !== "string" ||
                platform.trim().length === 0
              ) {
                continue; // Skip invalid platforms
              }

              // Validate urls array
              if (!Array.isArray(urls) || urls.length === 0) {
                continue; // Skip empty arrays
              }

              const metadataArray = data.linkMetadata?.[platform] || [];
              urls.forEach((url, index) => {
                // Validate URL
                if (
                  !url ||
                  typeof url !== "string" ||
                  url.trim().length === 0
                ) {
                  return; // Skip invalid URLs
                }

                const trimmedPlatform = platform.trim();
                const trimmedUrl = url.trim();

                // Additional validation: ensure platform and URL are not just whitespace
                if (trimmedPlatform.length === 0 || trimmedUrl.length === 0) {
                  return; // Skip empty strings
                }

                const metadata = metadataArray[index] || {};
                linksToCreate.push({
                  platform: trimmedPlatform,
                  url: trimmedUrl,
                  display_order: displayOrder++,
                  display_name: metadata.display_name?.trim() || null,
                  description: metadata.description?.trim() || null,
                  default_message: metadata.default_message?.trim() || null,
                  metadata:
                    metadata.metadata &&
                    typeof metadata.metadata === "object" &&
                    !Array.isArray(metadata.metadata)
                      ? metadata.metadata
                      : {},
                });

                // Store mapping: index in linksToCreate -> platform_index (for error mapping)
                linkIdToIndexMap[linkCreateIndex] =
                  `${trimmedPlatform}_${index}`;
                linkCreateIndex++;
              });
            }
          }

          // Step 4: Batch update links (delete ALL old links first, then create new ones)
          // Always delete existing links first to prevent duplicates, even if linksToCreate is empty
          if (existingLinkIds.length > 0 || linksToCreate.length > 0) {
            const batchResponse = await fetch(
              `/api/linktrees/${editId}/links/batch`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  deleteIds: existingLinkIds, // Delete all existing links
                  createLinks: linksToCreate, // Create new links
                }),
              },
            );

            if (!batchResponse.ok) {
              const errorData = await batchResponse.json().catch(() => ({}));
              let errorMessage = "Failed to update links";

              // Check if there are per-link validation errors
              if (
                Array.isArray(errorData.details) &&
                errorData.details.length > 0
              ) {
                // Map errors to link positions for display in modal
                // The API returns errors with index corresponding to linksToCreate array
                const linkErrors: Record<string, string> = {};

                errorData.details.forEach(
                  (d: {
                    index?: number;
                    platform?: string;
                    url?: string;
                    reason?: string;
                  }) => {
                    if (d.index !== undefined && d.platform && d.reason) {
                      // Map API index to platform_index format using our mapping
                      const mappedKey = linkIdToIndexMap[d.index];
                      if (mappedKey) {
                        linkErrors[mappedKey] = d.reason;
                      } else {
                        // Fallback: use platform_index directly
                        linkErrors[`${d.platform}_${d.index}`] = d.reason;
                      }
                    }
                  },
                );

                // Store link errors to pass to modal
                errorMessage =
                  errorData.message ||
                  errorData.error ||
                  "Some links have validation errors";
                console.error(errorMessage);

                // Throw error with link errors attached
                const error = new Error(errorMessage) as Error & {
                  linkErrors?: Record<string, string>;
                };
                error.linkErrors = linkErrors;
                throw error;
              } else {
                if (errorData.message) {
                  errorMessage = errorData.message;
                } else if (errorData.error) {
                  errorMessage = errorData.error;
                }
                console.error(errorMessage);
                throw new Error(errorMessage);
              }
            } else {
              // Clear cache after successful batch update
              const { clearCachedData } = await import("@/lib/utils/cache");
              clearCachedData(`/api/linktrees/${editId}/links`);
              clearCachedData(`/api/linktrees/${editId}`);
              clearCachedData("/api/linktrees");
            }
          }

          // Optimistic update - update in UI immediately
          const updateResponseData = await updateResponse.json();
          if (updateResponseData.data) {
            // Clear cache after successful update
            const { clearCachedData } = await import("@/lib/utils/cache");
            clearCachedData("/api/linktrees");
            clearCachedData(`/api/linktrees/${editId}`);
            clearCachedData(`/api/linktrees/${editId}/links`);
            if (updateResponseData.data.uid) {
              clearCachedData(
                `/api/linktrees/uid/${updateResponseData.data.uid}`,
              );
              clearCachedData(
                `/api/public/linktrees/${updateResponseData.data.uid}`,
              );
            }

            mergeLinktree(editId, updateResponseData.data);
          }

          // Step 5: Show success notification
          if (!errorShown) {
            toast.info("پەڕەکە بە سەرکەوتوویی نوێکرایەوە");
            errorShown = true;
          }

          // Close modal immediately for better UX
          setIsModalOpen(false);
          setEditData(null);

          // Background refresh disabled to reduce server load on free hosting
        } else {
          // ============================================
          // CREATE NEW LINKTREE
          // ============================================

          // Validate required fields
          if (
            !data.name?.trim() ||
            !data.slug?.trim() ||
            !data.background_color
          ) {
            console.error("Name, slug, and background color are required");
            throw new Error("Missing required fields");
          }

          if (!data.templateKey) {
            console.error("Template key is required");
            throw new Error("Missing template key");
          }

          if (!data.links || Object.keys(data.links).length === 0) {
            console.error("Please add at least one link");
            throw new Error("No links provided");
          }

          if (!data.platforms || data.platforms.length === 0) {
            console.error("At least one platform is required");
            throw new Error("No platforms provided");
          }

          const createResponse = await fetch("/api/linktrees", {
            method: "POST",
            credentials: "include", // Include cookies for authentication
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name.trim(),
              subtitle: data.subtitle?.trim() || null,
              description: data.description?.trim() || null,
              slug: data.slug.trim(),
              image: data.image || null,
              background_color: data.background_color,
              template_config: normalizedTemplateConfig,
              footer_text: data.footer_text?.trim() || null,
              footer_phone: data.footer_phone?.trim() || null,
              footer_hidden: data.footer_hidden ?? false,
              platforms: data.platforms,
              links: data.links,
              linkMetadata: data.linkMetadata,
              ...((data as { is_default?: boolean }).is_default
                ? { is_default: true }
                : {}),
            }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}));
            const errorMessage =
              errorData.error || errorData.details
                ? `${errorData.error || "Validation failed"}: ${Array.isArray(errorData.details) ? errorData.details.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join(", ") : ""}`
                : "Failed to create linktree";
            console.error(errorMessage);
            throw new Error(errorMessage);
          }

          const result = await createResponse.json();
          if (result.data) {
            // Clear cache after successful creation
            const { clearCachedData } = await import("@/lib/utils/cache");
            clearCachedData("/api/linktrees");

            // Optimistic update - add to UI immediately
            prependLinktree(result.data);

            toast.success("پەڕەکە بە سەرکەوتوویی دروستکرا");
            handleModalClose();

            // Background refresh disabled to reduce server load on free hosting
          } else {
            console.error("Failed to create linktree: No data returned");
            throw new Error("No data returned from server");
          }
        }
      } catch (error) {
        console.error("Error saving linktree:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        // Show error only if not already shown
        if (!errorShown) {
          console.error(
            editId
              ? `Failed to update linktree: ${errorMessage}`
              : `Failed to create linktree: ${errorMessage}`,
          );
        }
        // Re-throw error so modal can handle it and display per-link errors
        throw error;
      } finally {
        // ALWAYS reset submission flag, even on error
        isSubmittingRef.current = false;
      }
    },
    [handleModalClose, mergeLinktree, prependLinktree],
  );

  // Don't render anything if not authenticated (after all hooks)
  // This check happens after all hooks are declared to follow React rules
  if (badGateway) {
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.badGateway}
        theme={businessErrorTheme({
          websiteColor: parseWebsiteColor(
            wColor || websiteColor || DEFAULT_BUSINESS_ACCENT,
          ),
          favicon: favicon || null,
          logo: logo || null,
          name: name || null,
          subdomain: null,
        })}
        homeHref="/"
        onReset={() => window.location.reload()}
      />
    );
  }

  if (serviceUnavailable) {
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.serviceUnavailable}
        theme={businessErrorTheme({
          websiteColor: parseWebsiteColor(
            wColor || websiteColor || DEFAULT_BUSINESS_ACCENT,
          ),
          favicon: favicon || null,
          logo: logo || null,
          name: name || null,
          subdomain: null,
        })}
        homeHref="/"
        onReset={() => window.location.reload()}
      />
    );
  }

  if (gatewayTimeout) {
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.gatewayTimeout}
        theme={businessErrorTheme({
          websiteColor: parseWebsiteColor(
            wColor || websiteColor || DEFAULT_BUSINESS_ACCENT,
          ),
          favicon: favicon || null,
          logo: logo || null,
          name: name || null,
          subdomain: null,
        })}
        homeHref="/"
        onReset={() => window.location.reload()}
      />
    );
  }

  if (accessForbidden) {
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.forbidden}
        theme={businessErrorTheme({
          websiteColor: parseWebsiteColor(
            wColor || websiteColor || DEFAULT_BUSINESS_ACCENT,
          ),
          favicon: favicon || null,
          logo: logo || null,
          name: name || null,
          subdomain: null,
        })}
        homeHref="/"
      />
    );
  }

  if (!currentUsername || currentUsername.trim() === "") {
    return null; // Return null while redirecting
  }

  return (
    <ThemeProvider websiteColor={wColor ?? null}>
      <BusinessDashboardRefreshProvider value={dashboardRefresh}>
        <div
          className="h-screen bg-slate-50 dark:bg-[#161B22] text-slate-800 dark:text-gray-100 flex flex-col md:flex-row relative overflow-hidden"
          dir="ltr"
          inert={onboardingRequired ? true : undefined}
          aria-hidden={onboardingRequired ? true : undefined}
        >
          <DashboardSidebar
            brandName="MultiTree"
            brandSubtitle="داشبۆردی بزنس"
            brandImage="/images/Logo.jpg"
            brandImageAlt="MultiTree"
            items={sidebarItems}
            collapsed={isSidebarCollapsed}
            mobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            footer={
              <BusinessSidebarFooter
                collapsed={isSidebarCollapsed}
                planCode={liveEffectiveAccess?.subscription.planCode}
                planName={liveEffectiveAccess?.subscription.planName}
                onSupport={() => router.push("/business/settings?tab=messages")}
                onUpgrade={() => router.push("/#pricing")}
              />
            }
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            <DashboardHeader
              title={BUSINESS_PAGE_TITLES[activeTab]}
              theme={theme}
              mounted={mounted}
              refreshing={dashboardRefresh.isRefreshing}
              onToggleSidebar={() => {
                if (window.matchMedia("(max-width: 767px)").matches) {
                  setIsMobileSidebarOpen((open) => !open);
                } else {
                  setIsSidebarCollapsed((collapsed) => !collapsed);
                }
              }}
              onToggleTheme={toggleTheme}
              onRefresh={handleGlobalDashboardRefresh}
              notifications={<BusinessCommunicationBell />}
              profile={{
                name,
                email,
                badge: liveEffectiveAccess?.subscription.planName,
                avatarSrc: logo,
                items: [
                  {
                    id: "settings",
                    label: "ڕێکخستنەکان",
                    icon: <Settings className="h-4 w-4" />,
                    onClick: () => router.push("/business/settings"),
                  },
                  {
                    id: "divider",
                    label: "",
                    icon: null,
                    divider: true,
                    onClick: () => undefined,
                  },
                  {
                    id: "logout",
                    label: "چوونەدەرەوە",
                    icon: <LogOut className="h-4 w-4" />,
                    danger: true,
                    onClick: () => void handleLogout(),
                  },
                ],
              }}
              onProfileItemClick={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main Content */}
            <main
              className={`flex-1 w-full relative ${pageLocked ? "overflow-hidden" : "overflow-y-auto"}`}
              dir="ltr"
            >
              <div
                className={`max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 md:py-8 lg:py-10 relative z-10 ${pageLocked ? "flex h-full flex-col overflow-hidden" : ""}`}
              >
                <BusinessAnnouncementBanners />
                <LockedBusinessContent
                  locked={pageLocked}
                  reason={pageLockReason}
                >
                  {/*
                  A locked page renders a placeholder, never the real feature.
                  The feature components load their own data on mount, and on a
                  plan that does not include them every one of those requests
                  comes back 403 — which at best logs noise behind the blur and
                  at worst throws past this overlay into the error boundary,
                  replacing the whole dashboard with an error page. The lock
                  panel is the content here; there is nothing to fetch.
                */}
                  {pageLocked ? (
                    <SkeletonDashboardPage statCount={4} body="analytics" />
                  ) : activeTab === "dashboard" ? (
                    <BusinessDashboardOverviewPage
                      access={liveEffectiveAccess}
                    />
                  ) : activeTab === "linktrees" ? (
                    <BusinessLinktreesPage
                      linktrees={filteredLinktrees}
                      linktreeCount={linktreesData.length}
                      isLoading={isLoading || isAnalyticsLoading}
                      totalViews={analyticsTotals.total_views}
                      uniqueViews={analyticsTotals.unique_views}
                      totalClicks={analyticsTotals.total_clicks}
                      conversions={analyticsTotals.conversions}
                      isRefreshing={isRefreshing}
                      isClearingAnalytics={isClearingAnalytics}
                      hasAnalyticsData={hasAnalyticsData}
                      searchQuery={searchQuery}
                      isSearchModalOpen={isSearchModalOpen}
                      viewMode={viewMode}
                      onClearAnalytics={() =>
                        setIsClearAnalyticsModalOpen(true)
                      }
                      onRefresh={handleRefresh}
                      onSearchAction={() =>
                        searchQuery.trim()
                          ? setSearchQuery("")
                          : setIsSearchModalOpen(true)
                      }
                      onViewModeChange={setViewMode}
                      onCreate={handleCreateNew}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onViewAnalytics={handleViewAnalytics}
                    />
                  ) : activeTab === "mini-website" ? (
                    <MiniWebsitesPage
                      businessLogo={logo}
                      businessDefaultAvatar={businessDefaults?.default_avatar}
                      websiteColor={wColor}
                    />
                  ) : activeTab === "analytics" ? (
                    <BusinessAnalyticsPage />
                  ) : activeTab === "crm" ? (
                    <BusinessCrmPage />
                  ) : activeTab === "tiktok-config" ? (
                    <BusinessTikTokConfigPage />
                  ) : activeTab === "templates" ? (
                    <TemplatesPage canCreate={false} />
                  ) : activeTab === "advertising" ? (
                    <AdvertisingServicePage
                      name={name || currentUsername || "Business"}
                      logo={logo}
                      accentColor={parseWebsiteColor(wColor).primary}
                      phone={phone}
                      subdomain={currentUsername}
                    />
                  ) : activeTab === "settings" ? (
                    <BusinessSettingsPage />
                  ) : (
                    <div className="flex items-center justify-center min-h-[60vh]">
                      <div className="text-center">
                        {activeTab === "profile" ? (
                          <User className="h-16 w-16 mx-auto mb-6 text-slate-300 dark:text-gray-600" />
                        ) : (
                          <Settings className="h-16 w-16 mx-auto mb-6 text-slate-300 dark:text-gray-600" />
                        )}
                        <h2 className="text-2xl font-bold text-slate-600 dark:text-gray-300 mb-2">
                          {activeTab === "profile" ? "پڕۆفایل" : "ڕێکخستنەکان"}
                        </h2>
                        <p className="text-slate-400 dark:text-gray-500">
                          Coming Soon
                        </p>
                      </div>
                    </div>
                  )}
                </LockedBusinessContent>
              </div>
            </main>
          </div>

          {/* Delete Confirmation Modal */}
          {isDeleteModalOpen && linktreeToDelete && (
            <ConfirmDeleteModal
              isOpen={isDeleteModalOpen}
              onClose={handleDeleteModalClose}
              onConfirm={handleDeleteConfirm}
              title={
                "\u0633\u0695\u06cc\u0646\u06d5\u0648\u06d5\u06cc \u0644\u0627\u067e\u06d5\u0695\u06d5"
              }
              isDeleting={isDeleting}
              message={
                <p>
                  {
                    "\u0626\u0627\u06cc\u0627 \u062f\u06b5\u0646\u06cc\u0627\u06cc\u062a \u0644\u06d5 \u0633\u0695\u06cc\u0646\u06d5\u0648\u06d5\u06cc \u0644\u0627\u067e\u06d5\u0695\u06d5\u06cc"
                  }{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    &quot;{linktreeToDelete.name}&quot;
                  </span>
                  {
                    "\u061f \u0626\u06d5\u0645 \u06a9\u0631\u062f\u0627\u0631\u06d5 \u0646\u0627\u06af\u06d5\u0695\u06ce\u0646\u0631\u06ce\u062a\u06d5\u0648\u06d5."
                  }
                </p>
              }
            />
          )}

          {/* Clear All Analytics Confirmation Modal */}
          <ConfirmDeleteModal
            isOpen={isClearAnalyticsModalOpen}
            onClose={() => {
              if (!isClearingAnalytics) setIsClearAnalyticsModalOpen(false);
            }}
            onConfirm={handleClearAllAnalytics}
            title="پاککردنەوەی ئاماری لینک‌تری"
            confirmLabel="بەڵێ، پاکی بکەوە"
            loadingLabel="پاکدەکرێتەوە..."
            cancelLabel="هەڵوەشاندنەوە"
            isDeleting={isClearingAnalytics}
            message={
              <p>
                دڵنیایت لە پاککردنەوەی تەنها ئامارەکانی پەڕەکانی لینک‌تری؟
                ئاماری مینی وێبسایتەکان دەستکاری ناکرێت.
              </p>
            }
          />

          {/* Create/Edit Modal */}
          {isModalOpen && (
            <LinktreeEditorModal
              isOpen={isModalOpen}
              onClose={handleModalClose}
              onSubmit={handleSubmit}
              editData={editData}
              isLoadingEditData={isLoadingEditData}
              businessDefaults={defaults}
              businessIdentity={{ name, phone }}
              isDefault={isCreatingDefault}
            />
          )}

          {analyticsModalLinktree && (
            <BusinessLinktreeAnalyticsModal
              isOpen={Boolean(analyticsModalLinktree)}
              onClose={() => setAnalyticsModalLinktree(null)}
              linktreeId={analyticsModalLinktree.id}
              linktreeName={analyticsModalLinktree.name}
              canClearAnalytics={
                liveEffectiveAccess?.permissions[
                  "business:analytics:clear-linktree"
                ]?.outcome === "allow"
              }
            />
          )}

          {/* Floating Command Palette Search Modal */}
          {isSearchModalOpen && (
            <div className="modal-ltr fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300">
              <div
                ref={searchModalRef}
                className="relative w-full max-w-lg rounded-2xl bg-white/95 dark:bg-[#161B22]/95 border border-gray-200/80 dark:border-white/10 shadow-2xl overflow-hidden    duration-200"
                dir="ltr"
              >
                {/* Search Input Box */}
                <div className="relative flex items-center border-b border-gray-100 dark:border-white/10">
                  <div className="absolute right-4 text-slate-400 dark:text-gray-500 pointer-events-none">
                    <Search className="h-5 w-5" />
                  </div>
                  <input
                    autoFocus
                    type="text"
                    placeholder="ناوی پەیج بنووسە بۆ گەڕان..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setIsSearchModalOpen(false);
                      }
                    }}
                    className="w-full pr-12 pl-14 py-4 text-sm sm:text-base bg-transparent focus:outline-none text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 font-kurdish text-left"
                  />
                  <button
                    onClick={() => setIsSearchModalOpen(false)}
                    className="absolute left-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-slate-400 dark:text-gray-500 font-sans font-bold">
                      ESC
                    </span>
                  </button>
                </div>

                {/* Results Grid List */}
                <div
                  className="max-h-[320px] overflow-y-auto p-2"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {!searchQuery.trim() ? (
                    <div className="py-8 text-center text-slate-400 dark:text-gray-500 text-xs sm:text-sm font-kurdish flex flex-col items-center justify-center gap-2 select-none">
                      <MotionPulseIcon>
                        <Search
                          className="h-5 w-5 opacity-40"
                          style={{ color: "var(--theme-primary, #FEE049)" }}
                        />
                      </MotionPulseIcon>
                      <span>گەڕان بۆ پەیجەکان بکە.....</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-8 text-center text-slate-450 dark:text-gray-500 text-sm font-kurdish">
                      هیچ ئەنجامێک نەدۆزرایەوە بۆ &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setIsSearchModalOpen(false);
                            handleEdit(item.id);
                          }}
                          className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left transition-all duration-200 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {/* Item Image */}
                            <div className="relative w-10 h-10 overflow-hidden rounded-full border border-gray-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 flex-shrink-0">
                              <Image
                                src={item.image || "/images/DefaultAvatar.png"}
                                alt={item.name}
                                fill
                                sizes="40px"
                                unoptimized
                                className="object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/DefaultAvatar.png";
                                }}
                              />
                            </div>
                            {/* Name and UID slug */}
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-semibold text-slate-700 dark:text-gray-200 transition-colors leading-tight">
                                {item.name}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-gray-500 font-mono leading-none mt-1">
                                /linktree/{item.seo_name || item.uid}
                              </span>
                            </div>
                          </div>
                          {/* Action Trigger */}
                          <div
                            className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 pl-2"
                            style={{ color: "var(--theme-primary, #FEE049)" }}
                          >
                            دەستکاریکردن ←
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {onboardingRequired ? (
          <BusinessGettingStarted initialStep={onboardingStep} />
        ) : null}
      </BusinessDashboardRefreshProvider>
    </ThemeProvider>
  );
});
