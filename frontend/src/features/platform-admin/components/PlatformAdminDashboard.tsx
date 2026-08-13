"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { MotionPulseIcon } from "@/components/motion/MotionPrimitives";
import {
  Users,
  LogOut,
  X,
  Sun,
  Moon,
  Menu,
  Search,
  LayoutTemplate,
  Shield,
  History,
  MessagesSquare,
  Key,
  Settings,
  Languages,
  CreditCard,
  UserCog,
} from "lucide-react";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { CreateBusinessModal } from "@/features/platform-admin/components/CreateBusinessModal";
import { TemplatesPage } from "@/features/templates/components/TemplatesPage";
import { SearchModal } from "@/components/shared/SearchModal";
import { BlocklistsPage } from "@/features/platform-admin/components/BlocklistsPage";
import { ActivityLogPage } from "@/features/platform-admin/components/ActivityLogPage";
import { APIManagementPage } from "@/features/platform-admin/components/APIManagementPage";
import { PlatformSettingsPage } from "@/features/platform-admin/components/PlatformSettingsPage";
import { BillingPage } from "@/features/platform-admin/components/BillingPage";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { startBusinessImpersonation } from "@/features/platform-admin/api/businesses";
import { useBusinesses } from "@/features/platform-admin/hooks/useBusinesses";
import type { PlatformBusiness as Business } from "@linktree/types";
import { PlatformBusinessesPage } from "@/features/platform-admin/components/PlatformBusinessesPage";
import { AccessControlPage } from "@/features/platform-admin/components/AccessControlPage";
import { ApprovalNotifications } from "@/features/platform-admin/components/ApprovalNotifications";
import { BusinessSessionsModal } from "@/features/platform-admin/components/BusinessSessionsModal";
import { CommunicationCenterPage } from "@/features/platform-admin/components/CommunicationCenterPage";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import {
  getMultiTreeAccentInk,
  MULTITREE_ACCENT_COLOR,
} from "@/lib/multitree-theme";
import { applyCursorColor } from "@/lib/utils/cursor-theme";
import { persistAppTheme } from "@/lib/app-theme";
import { ErrorPage } from "@/components/error-pages/ErrorPage";
import { MULTITREE_ERROR_THEME } from "@/components/error-pages/error-theme";
import { ERROR_PAGE_COPY } from "@/components/error-pages/copy";

const BusinessAnalyticsModal = dynamic(
  () =>
    import("@/features/platform-admin/components/BusinessAnalyticsModal").then(
      (mod) => ({ default: mod.BusinessAnalyticsModal }),
    ),
  { ssr: false, loading: () => null },
);

type PlatformTheme = "light" | "dark";
type PlatformPage =
  | "businesses"
  | "templates"
  | "blocklists"
  | "access-control"
  | "activity"
  | "communication-center"
  | "api"
  | "settings"
  | "billing";
function getPlatformPage(pathname: string): PlatformPage {
  const segment = pathname.split("/").filter(Boolean)[1];
  return segment === "templates" ||
    segment === "blocklists" ||
    segment === "access-control" ||
    segment === "activity" ||
    segment === "communication-center" ||
    segment === "api" ||
    segment === "settings" ||
    segment === "billing"
    ? segment
    : "businesses";
}

export function PlatformAdminDashboard() {
  const [platformBranding, setPlatformBranding] = useState({
    name: "MultiTree",
    logo: null as string | null,
    avatar: null as string | null,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [deletingBusiness, setDeletingBusiness] = useState<Business | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyticsBusiness, setAnalyticsBusiness] = useState<Business | null>(
    null,
  );
  const [sessionsBusiness, setSessionsBusiness] = useState<Business | null>(
    null,
  );
  const router = useRouter();
  const pathname = usePathname();
  const consoleBasePath = `/${pathname.split("/").filter(Boolean)[0]}`;
  const handleUnauthorized = useCallback(
    () => router.push(`${consoleBasePath}/login`),
    [consoleBasePath, router],
  );
  const {
    businesses,
    isLoading: loading,
    isRefreshing,
    error,
    badGateway,
    serviceUnavailable,
    gatewayTimeout,
    reload: fetchBusinesses,
    refresh: handleRefresh,
    removeBusiness,
    setOperationError,
    page: businessPage,
    setPage: setBusinessPage,
    search: searchQuery,
    setSearch: setSearchQuery,
    pagination: businessPagination,
    summary: businessSummary,
  } = useBusinesses(handleUnauthorized);

  const [theme, setTheme] = useState<PlatformTheme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("app-theme");
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });
  const [mounted, setMounted] = useState(false);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const activePage = getPlatformPage(pathname);
  const canPage = useCallback((_page: PlatformPage) => true, []);
  const permissionsLoaded = true;
  const activePageAllowed = true;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    if (typeof window === "undefined") return;
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const applyPlatformBranding = useCallback(
    (settings: Record<string, unknown>) => {
      const accent = parseWebsiteColor(
        typeof settings.accent_color === "string"
          ? settings.accent_color
          : MULTITREE_ACCENT_COLOR,
      );
      document.documentElement.style.setProperty(
        "--multitree-accent",
        accent.primary,
      );
      document.documentElement.style.setProperty(
        "--multitree-accent-gradient",
        accent.css,
      );
      void applyCursorColor(accent.primary).catch(() => undefined);
      document.documentElement.style.setProperty(
        "--multitree-accent-ink",
        getMultiTreeAccentInk(accent.primary),
      );
      setPlatformBranding({
        name: typeof settings.name === "string" ? settings.name : "MultiTree",
        logo: typeof settings.logo === "string" ? settings.logo : null,
        avatar: typeof settings.avatar === "string" ? settings.avatar : null,
      });

      if (typeof settings.favicon === "string" && settings.favicon) {
        let favicon =
          document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
        if (!favicon) {
          favicon = document.createElement("link");
          favicon.rel = "icon";
          document.head.appendChild(favicon);
        }
        favicon.href = settings.favicon;
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/platform/settings", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (!cancelled && payload?.data) applyPlatformBranding(payload.data);
      })
      .catch(() => undefined);

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      if (detail) applyPlatformBranding(detail);
    };
    window.addEventListener("platform-settings-updated", handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("platform-settings-updated", handleUpdate);
    };
  }, [applyPlatformBranding]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  }, [theme]);

  const filteredBusinesses = businesses;

  useEffect(() => {
    persistAppTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        if (activePage !== "businesses") return;
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePage]);

  const handleLogout = async () => {
    await fetch("/api/platform/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push(`${consoleBasePath}/login`);
  };

  const handleDelete = useCallback(
    (id: string) => {
      const business = businesses.find((a) => a.id === id);
      if (business) {
        setDeletingBusiness(business);
      }
    },
    [businesses],
  );

  const handleViewAnalytics = useCallback((business: Business) => {
    setAnalyticsBusiness(business);
  }, []);

  /**
   * Opens the business dashboard as that business in a new tab.
   *
   * The tab is opened synchronously on the click so the browser attributes it
   * to a user gesture; the single-use handoff URL is only assigned once the
   * request returns. Waiting for the response before calling `window.open`
   * would be treated as an unrequested popup and blocked.
   */
  const handleOpenDashboard = useCallback((business: Business) => {
    const tenantTab = window.open("about:blank", "_blank");
    if (tenantTab) {
      tenantTab.opener = null;
    }
    startBusinessImpersonation(business.id)
      .then(({ redirectUrl }) => {
        if (tenantTab) {
          tenantTab.location.href = redirectUrl;
          return;
        }
        window.location.href = redirectUrl;
      })
      .catch((error: unknown) => {
        tenantTab?.close();
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to open the business dashboard",
        );
      });
  }, []);

  const confirmDelete = async () => {
    if (!deletingBusiness) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/platform/businesses/${deletingBusiness.id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (res.ok) {
        removeBusiness(deletingBusiness.id);
        toast.success("بزنسەکە بە سەرکەوتوویی سڕایەوە");
      } else {
        const errData = await res.json();
        const message = errData.message || "Failed to delete business";
        setOperationError(message);
        toast.error("سڕینەوەی بزنسەکە سەرکەوتوو نەبوو", {
          description: message,
        });
      }
    } catch (err) {
      const message = (err as Error).message;
      setOperationError(message);
      toast.error("سڕینەوەی بزنسەکە سەرکەوتوو نەبوو", { description: message });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#161B22]">
        <div className="text-slate-500 dark:text-gray-400">چاوەڕوان بە...</div>
      </div>
    );
  }

  if (badGateway) {
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.badGateway}
        theme={MULTITREE_ERROR_THEME}
        homeHref="/"
        onReset={() => void fetchBusinesses()}
      />
    );
  }

  if (serviceUnavailable) {
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.serviceUnavailable}
        theme={MULTITREE_ERROR_THEME}
        homeHref="/"
        onReset={() => void fetchBusinesses()}
      />
    );
  }

  if (gatewayTimeout) {
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.gatewayTimeout}
        theme={MULTITREE_ERROR_THEME}
        homeHref="/"
        onReset={() => void fetchBusinesses()}
      />
    );
  }

  if (permissionsLoaded && !activePageAllowed) {
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.forbidden}
        theme={MULTITREE_ERROR_THEME}
        homeHref="/"
      />
    );
  }

  return (
    <div
      className="h-screen bg-slate-50 dark:bg-[#161B22] text-slate-800 dark:text-gray-100 flex flex-col md:flex-row relative overflow-hidden"
      dir="ltr"
      data-multitree-theme
    >
      {/* Mobile Sidebar overlay backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 overflow-hidden transition-[transform,width] duration-300 ease-out will-change-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:will-change-auto ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isSidebarCollapsed ? "w-64 md:w-20" : "w-64 md:w-72"
        } flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#161B22]`}
      >
        {/* Sidebar Header */}
        <div
          className={`p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between ${isSidebarCollapsed ? "md:justify-center" : ""}`}
        >
          <div
            className={`flex items-center ${isSidebarCollapsed ? "md:justify-center md:gap-0" : "gap-3"}`}
          >
            <div className="w-12 h-12 flex-shrink-0">
              <Image
                src={
                  platformBranding.logo ||
                  platformBranding.avatar ||
                  "/images/DefaultAvatar.png"
                }
                alt="Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div
              className={`transition-all duration-300 ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              <h2 className="text-base font-bold leading-tight whitespace-nowrap">
                {platformBranding.name}
              </h2>
              <span className="text-xs text-slate-400 dark:text-gray-500 block whitespace-nowrap">
                کۆنتڕۆڵی گشتی
              </span>
            </div>
          </div>

          {/* Close mobile button */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg p-0 text-slate-400 transition-[background-color,color,transform] duration-200 hover:bg-slate-50 hover:text-slate-600 active:scale-95 dark:hover:bg-white/5 dark:hover:text-gray-300 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4 shrink-0" />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="custom-scrollbar lime-custom-scrollbar flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <button
            hidden={permissionsLoaded && !canPage("businesses")}
            onClick={() => {
              router.push(consoleBasePath);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "businesses"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "businesses"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="بەڕێوەبردنی بزنسەکان"
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              بەڕێوەبردنی بزنسەکان
            </span>
          </button>
          <button
            hidden={permissionsLoaded && !canPage("templates")}
            onClick={() => {
              router.push(`${consoleBasePath}/templates`);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "templates"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "templates"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="قالبەکان"
          >
            <LayoutTemplate className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              قالبەکان
            </span>
          </button>
          <button
            hidden={permissionsLoaded && !canPage("blocklists")}
            onClick={() => {
              router.push(`${consoleBasePath}/blocklists`);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "blocklists"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "blocklists"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="ڕێساکانی دەستگەیشتن"
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              ڕێساکانی دەستگەیشتن
            </span>
          </button>
          <button
            hidden={permissionsLoaded && !canPage("access-control")}
            onClick={() => {
              router.push(`${consoleBasePath}/access-control`);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "access-control"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "access-control"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="کۆنترۆڵی دەستگەیشتن"
          >
            <UserCog className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              کۆنترۆڵی دەستگەیشتن
            </span>
          </button>
          <button
            hidden={permissionsLoaded && !canPage("billing")}
            onClick={() => {
              router.push(`${consoleBasePath}/billing`);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "billing"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "billing"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="پارەدان و بەشدارییەکان"
          >
            <CreditCard className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              پارەدان و بەشدارییەکان
            </span>
          </button>
          <button
            hidden={permissionsLoaded && !canPage("activity")}
            onClick={() => {
              router.push(`${consoleBasePath}/activity`);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "activity"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "activity"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="تۆماری چالاکییەکان"
          >
            <History className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              تۆماری چالاکییەکان
            </span>
          </button>
          <button
            onClick={() => {
              router.push(`${consoleBasePath}/communication-center`);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "communication-center"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "communication-center"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="ناوەندی پەیوەندی"
          >
            <MessagesSquare className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              ناوەندی پەیوەندی
            </span>
          </button>
          <button
            onClick={() => {
              router.push(`${consoleBasePath}/api`);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "api"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "api"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="بەڕێوەبردنی API"
          >
            <Key className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              بەڕێوەبردنی API
            </span>
          </button>
          <button
            hidden={permissionsLoaded && !canPage("settings")}
            onClick={() => {
              router.push(`${consoleBasePath}/settings`);
              setIsMobileSidebarOpen(false);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } ${
              activePage === "settings"
                ? "text-slate-700 dark:text-gray-200"
                : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-gray-200"
            }`}
            style={
              activePage === "settings"
                ? {
                    background:
                      "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                    color: "var(--multitree-accent)",
                  }
                : undefined
            }
            title="ڕێکخستنەکان"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              ڕێکخستنەکان
            </span>
          </button>
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isSidebarCollapsed
                ? "md:justify-center md:px-0 md:gap-0"
                : "gap-3"
            } text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20`}
            title="چوونەدەرەوە"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? "md:opacity-0 md:w-0 md:pointer-events-none overflow-hidden" : "opacity-100"}`}
            >
              چوونەدەرەوە
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#161B22]/80 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
            {/* Header Right (Title & Hamburger toggle) */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    setIsMobileSidebarOpen((open) => !open);
                  } else {
                    setIsSidebarCollapsed((collapsed) => !collapsed);
                  }
                }}
                className="group relative flex items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-100 dark:from-white/5 dark:to-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:from-white/10 dark:hover:to-white/10 transition-all duration-300 text-slate-500 hover:text-slate-700 shadow-sm hover:shadow cursor-pointer"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />
              </button>
              <h1 className="text-base sm:text-lg font-bold">
                {activePage === "businesses"
                  ? "بەڕێوەبردنی بزنسەکان"
                  : activePage === "templates"
                    ? "قالبەکان"
                    : activePage === "billing"
                      ? "پارەدان و بەشدارییەکان"
                      : activePage === "blocklists"
                        ? "ڕێساکانی دەستگەیشتن"
                        : activePage === "access-control"
                          ? "کۆنترۆڵی دەستگەیشتن"
                          : activePage === "activity"
                            ? "تۆماری چالاکییەکان"
                            : activePage === "communication-center"
                              ? "ناوەندی پەیوەندی"
                              : activePage === "api"
                                ? "بەڕێوەبردنی API"
                                : "ڕێکخستنەکان"}
              </h1>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              <ApprovalNotifications />

              {/* Language Toggle Button */}
              <button
                className="group relative flex items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-100 dark:from-white/5 dark:to-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:from-white/10 dark:hover:to-white/10 transition-all duration-300 text-slate-500 hover:text-slate-700 shadow-sm hover:shadow cursor-pointer"
                aria-label="Toggle language"
                title="گۆڕینی زمان"
              >
                <Languages className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />
              </button>

              {/* Theme Selector Toggle */}
              <button
                onClick={toggleTheme}
                className="group relative flex items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-100 dark:from-white/5 dark:to-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:from-white/10 dark:hover:to-white/10 transition-all duration-300 text-slate-500 hover:text-slate-700 shadow-sm hover:shadow cursor-pointer"
                aria-label="Toggle theme"
                title="گۆڕینی ڕووکار"
              >
                {!mounted ? (
                  <div className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                ) : (
                  <>
                    {theme === "light" && (
                      <Moon className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />
                    )}
                    {theme === "dark" && (
                      <Sun className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full overflow-y-auto relative" dir="ltr">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 md:py-8 lg:py-10 relative z-10">
            {error && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {activePage === "businesses" ? (
              <PlatformBusinessesPage
                businesses={businesses}
                filteredBusinesses={filteredBusinesses}
                isRefreshing={isRefreshing}
                searchQuery={searchQuery}
                isSearchModalOpen={isSearchModalOpen}
                viewMode={viewMode}
                page={businessPage}
                pagination={businessPagination}
                summary={businessSummary}
                onPageChange={setBusinessPage}
                onRefresh={handleRefresh}
                onSearchAction={() =>
                  searchQuery.trim()
                    ? setSearchQuery("")
                    : setIsSearchModalOpen(true)
                }
                onViewModeChange={setViewMode}
                onEdit={(business) => {
                  void fetch(`/api/platform/businesses/${business.id}`, {
                    credentials: "include",
                    cache: "no-store",
                  })
                    .then(async (response) => {
                      const payload = await response.json().catch(() => ({}));
                      if (!response.ok) {
                        throw new Error(
                          payload.message || "Failed to load business",
                        );
                      }
                      setEditingBusiness(payload.data as Business);
                      setShowCreateModal(true);
                    })
                    .catch((error: unknown) =>
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Failed to load business",
                      ),
                    );
                }}
                onDelete={handleDelete}
                onViewAnalytics={handleViewAnalytics}
                onManageSessions={setSessionsBusiness}
                onOpenDashboard={handleOpenDashboard}
              />
            ) : activePage === "templates" ? (
              <TemplatesPage />
            ) : activePage === "billing" ? (
              <BillingPage />
            ) : activePage === "blocklists" ? (
              <BlocklistsPage />
            ) : activePage === "access-control" ? (
              <AccessControlPage />
            ) : activePage === "activity" ? (
              <ActivityLogPage />
            ) : activePage === "communication-center" ? (
              <CommunicationCenterPage />
            ) : activePage === "api" ? (
              <APIManagementPage />
            ) : (
              <PlatformSettingsPage />
            )}
          </div>
        </main>
      </div>

      {/* Create/Edit Business Modal */}
      <CreateBusinessModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingBusiness(null);
        }}
        onSubmit={async (data, editId) => {
          try {
            if (!editId)
              throw new Error("Manual business creation is disabled");
            const method = "PATCH";
            const url = `/api/platform/businesses/${editId}`;
            const body = {
              name: data.name,
              phone: data.phone,
              username: data.username,
              subscriptionPlanId: data.subscriptionPlanId,
              subdomain: data.subdomain,
              logo: data.logo,
              favicon: data.favicon,
              default_avatar: data.default_avatar,
              website_color: data.website_color,
              pixel_id: data.pixel_id,
              events_token: data.events_token,
              tiktok_configs: data.tiktok_configs,
            };

            const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              credentials: "include",
            });

            if (!res.ok) {
              const errData = await res.json();
              toast.error(
                errData.message || "پاشەکەوتکردنی بزنس سەرکەوتوو نەبوو",
              );
              return;
            }

            await fetchBusinesses();
            setShowCreateModal(false);
            setEditingBusiness(null);
            if (editId) {
              toast.info("بزنسەکە بە سەرکەوتوویی نوێکرایەوە");
            } else {
              toast.success("بزنسەکە بە سەرکەوتوویی دروستکرا");
            }
          } catch (err) {
            console.error("Error saving business:", err);
            toast.error("هەڵەیەک ڕوویدا لە پاشەکەوتکردندا");
          }
        }}
        editData={editingBusiness}
        existingBusinesses={businesses}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingBusiness}
        onClose={() => setDeletingBusiness(null)}
        onConfirm={confirmDelete}
        title="سڕینەوەی بزنس"
        isDeleting={isDeleting}
        message={
          <p>
            {
              "\u0626\u0627\u06cc\u0627 \u062f\u06b5\u0646\u06cc\u0627\u06cc\u062a \u0644\u06d5 \u0633\u0695\u06cc\u0646\u06d5\u0648\u06d5\u06cc \u0626\u06d5\u062f\u0645\u06cc\u0646\u06cc"
            }{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              &quot;{deletingBusiness?.name || ""}&quot;
            </span>
            {
              "\u061f \u0626\u06d5\u0645 \u06a9\u0631\u062f\u0627\u0631\u06d5 \u0646\u0627\u06af\u06d5\u0695\u06ce\u0646\u0631\u06ce\u062a\u06d5\u0648\u06d5."
            }
          </p>
        }
      />

      {/* Business Analytics Modal */}
      {analyticsBusiness && (
        <BusinessAnalyticsModal
          isOpen={!!analyticsBusiness}
          onClose={() => setAnalyticsBusiness(null)}
          businessId={analyticsBusiness.id}
          businessName={analyticsBusiness.name}
          businessDefaultAvatar={analyticsBusiness.default_avatar}
        />
      )}
      <BusinessSessionsModal
        business={sessionsBusiness}
        onClose={() => setSessionsBusiness(null)}
      />
      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        placeholder="ناوی بزنس بنووسە بۆ گەڕان..."
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      >
        {!searchQuery.trim() ? (
          <div className="py-8 text-center text-slate-400 dark:text-gray-500 text-xs sm:text-sm font-kurdish flex flex-col items-center justify-center gap-2 select-none">
            <MotionPulseIcon>
              <Search
                className="h-5 w-5 opacity-40"
                style={{ color: "var(--multitree-accent)" }}
              />
            </MotionPulseIcon>
            <span>گەڕان بۆ بزنسەکان بکە.....</span>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="py-8 text-center text-slate-450 dark:text-gray-500 text-sm font-kurdish">
            هیچ ئەنجامێک نەدۆزرایەوە بۆ &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filteredBusinesses.map((business) => (
              <button
                key={business.id}
                onClick={() => {
                  setEditingBusiness(business);
                  setShowCreateModal(true);
                  setIsSearchModalOpen(false);
                }}
                className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-gray-300">
                    {business.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-slate-700 dark:text-gray-200 sa-group-hover-text transition-colors leading-tight">
                      {business.name}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-gray-555 leading-none mt-1">
                      @{business.username}
                    </span>
                  </div>
                </div>
                <div
                  className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 pl-2"
                  style={{ color: "var(--multitree-accent)" }}
                >
                  دەستکاریکردن ←
                </div>
              </button>
            ))}
          </div>
        )}
      </SearchModal>
    </div>
  );
}
