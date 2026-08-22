"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MotionPulseIcon } from "@/components/motion/MotionPrimitives";
import {
  Users,
  LogOut,
  Search,
  LayoutTemplate,
  Shield,
  History,
  MessagesSquare,
  Key,
  Settings,
  CreditCard,
  UserCog,
  Link2,
  IdCard,
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
import {
  ApprovalNotifications,
  type ApprovalNotificationsHandle,
} from "@/features/platform-admin/components/ApprovalNotifications";
import { BusinessSessionsModal } from "@/features/platform-admin/components/BusinessSessionsModal";
import { CommunicationCenterPage } from "@/features/platform-admin/components/CommunicationCenterPage";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import {
  getMultiTreeAccentInk,
  MULTITREE_ACCENT_COLOR,
} from "@/lib/multitree-theme";
import { applyCursorColor } from "@/lib/utils/cursor-theme";
import { persistAppTheme } from "@/lib/app-theme";
import { PlatformAdminErrorPage } from "@/features/platform-admin/components/PlatformAdminErrorPage";
import {
  DashboardSidebar,
  type DashboardSidebarItem,
} from "@/components/shared/DashboardSidebar";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";
import { apiRequest } from "@/lib/api/request";
import { PlatformLinktreesPage } from "@/features/platform-admin/components/PlatformLinktreesPage";
import { PlatformMiniWebsitesPage } from "@/features/platform-admin/components/PlatformMiniWebsitesPage";
import { CreatorUsersPage } from "@/features/platform-admin/components/CreatorUsersPage";
import {
  getPlatformPage,
  type PlatformPage,
} from "@/features/platform-admin/platform-pages";

const BusinessAnalyticsModal = dynamic(
  () =>
    import("@/features/platform-admin/components/BusinessAnalyticsModal").then(
      (mod) => ({ default: mod.BusinessAnalyticsModal }),
    ),
  { ssr: false, loading: () => null },
);

type PlatformTheme = "light" | "dark";

export function PlatformAdminDashboard() {
  const notificationsRef = useRef<ApprovalNotificationsHandle>(null);
  const [platformBranding, setPlatformBranding] = useState({
    name: "MultiTree",
    logo: null as string | null,
    avatar: null as string | null,
    accentColor: MULTITREE_ACCENT_COLOR,
    accentBackground: MULTITREE_ACCENT_COLOR,
    accentInk: getMultiTreeAccentInk(MULTITREE_ACCENT_COLOR),
  });
  const [administrator, setAdministrator] = useState({
    name: "Platform Admin",
    email: "",
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
        accentColor: accent.primary,
        accentBackground: accent.css,
        accentInk: getMultiTreeAccentInk(accent.primary),
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

  const loadAdministratorProfile = useCallback(async () => {
    const payload = await apiRequest<{
      user: { name?: string; email?: string };
    }>("/api/platform/auth/profile");
    setAdministrator({
      name: payload.user.name?.trim() || "Platform Admin",
      email: payload.user.email?.trim() || "",
    });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadAdministratorProfile().catch(() => undefined);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadAdministratorProfile]);

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

  const handleGlobalRefresh = useCallback(async () => {
    await Promise.all([
      handleRefresh(),
      loadAdministratorProfile().catch(() => undefined),
      notificationsRef.current?.refresh().catch(() => undefined),
    ]);
    router.refresh();
  }, [handleRefresh, loadAdministratorProfile, router]);

  const sidebarItems = useMemo<DashboardSidebarItem[]>(
    () => [
      {
        id: "businesses",
        label: "بەڕێوەبردنی بزنسەکان",
        icon: <Users className="h-4 w-4" />,
        active: activePage === "businesses",
        hidden: permissionsLoaded && !canPage("businesses"),
        onClick: () => router.push(consoleBasePath),
      },
      {
        id: "users",
        label: "بەکارهێنەرەکان",
        icon: <UserCog className="h-4 w-4" />,
        active: activePage === "users",
        hidden: permissionsLoaded && !canPage("users"),
        onClick: () => router.push(`${consoleBasePath}/users`),
      },
      {
        id: "linktrees",
        label: DASHBOARD_PAGE_LABELS.linktrees,
        icon: <Link2 className="h-4 w-4" />,
        active: activePage === "linktrees",
        hidden: permissionsLoaded && !canPage("linktrees"),
        onClick: () => router.push(`${consoleBasePath}/linktrees`),
      },
      {
        id: "mini-websites",
        label: "مینی وێبسایتەکان",
        icon: <IdCard className="h-4 w-4" />,
        active: activePage === "mini-websites",
        hidden: permissionsLoaded && !canPage("mini-websites"),
        onClick: () => router.push(`${consoleBasePath}/mini-websites`),
      },
      {
        id: "templates",
        label: DASHBOARD_PAGE_LABELS.templates,
        icon: <LayoutTemplate className="h-4 w-4" />,
        active: activePage === "templates",
        hidden: permissionsLoaded && !canPage("templates"),
        onClick: () => router.push(`${consoleBasePath}/templates`),
      },
      {
        id: "blocklists",
        label: "ڕێساکانی دەستگەیشتن",
        icon: <Shield className="h-4 w-4" />,
        active: activePage === "blocklists",
        hidden: permissionsLoaded && !canPage("blocklists"),
        onClick: () => router.push(`${consoleBasePath}/blocklists`),
      },
      {
        id: "access-control",
        label: "کۆنترۆڵی دەستگەیشتن",
        icon: <UserCog className="h-4 w-4" />,
        active: activePage === "access-control",
        hidden: permissionsLoaded && !canPage("access-control"),
        onClick: () => router.push(`${consoleBasePath}/access-control`),
      },
      {
        id: "billing",
        label: "پارەدان و بەشدارییەکان",
        icon: <CreditCard className="h-4 w-4" />,
        active: activePage === "billing",
        hidden: permissionsLoaded && !canPage("billing"),
        onClick: () => router.push(`${consoleBasePath}/billing`),
      },
      {
        id: "activity",
        label: "تۆماری چالاکییەکان",
        icon: <History className="h-4 w-4" />,
        active: activePage === "activity",
        hidden: permissionsLoaded && !canPage("activity"),
        onClick: () => router.push(`${consoleBasePath}/activity`),
      },
      {
        id: "communication-center",
        label: "ناوەندی پەیوەندی",
        icon: <MessagesSquare className="h-4 w-4" />,
        active: activePage === "communication-center",
        onClick: () => router.push(`${consoleBasePath}/communication-center`),
      },
      {
        id: "api",
        label: "بەڕێوەبردنی API",
        icon: <Key className="h-4 w-4" />,
        active: activePage === "api",
        onClick: () => router.push(`${consoleBasePath}/api`),
      },
      {
        id: "settings",
        label: DASHBOARD_PAGE_LABELS.settings,
        icon: <Settings className="h-4 w-4" />,
        active: activePage === "settings",
        hidden: permissionsLoaded && !canPage("settings"),
        onClick: () => router.push(`${consoleBasePath}/settings`),
      },
    ],
    [activePage, canPage, consoleBasePath, permissionsLoaded, router],
  );

  const pageTitle: Record<PlatformPage, string> = {
    businesses: "بەڕێوەبردنی بزنسەکان",
    linktrees: DASHBOARD_PAGE_LABELS.linktrees,
    "mini-websites": "مینی وێبسایتەکان",
    users: "بەکارهێنەرەکان",
    templates: DASHBOARD_PAGE_LABELS.templates,
    blocklists: "ڕێساکانی دەستگەیشتن",
    "access-control": "کۆنترۆڵی دەستگەیشتن",
    billing: "پارەدان و بەشدارییەکان",
    activity: "تۆماری چالاکییەکان",
    "communication-center": "ناوەندی پەیوەندی",
    api: "بەڕێوەبردنی API",
    settings: DASHBOARD_PAGE_LABELS.settings,
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
      <PlatformAdminErrorPage
        kind="badGateway"
        branding={platformBranding}
        onReset={() => void fetchBusinesses()}
      />
    );
  }

  if (serviceUnavailable) {
    return (
      <PlatformAdminErrorPage
        kind="serviceUnavailable"
        branding={platformBranding}
        onReset={() => void fetchBusinesses()}
      />
    );
  }

  if (gatewayTimeout) {
    return (
      <PlatformAdminErrorPage
        kind="gatewayTimeout"
        branding={platformBranding}
        onReset={() => void fetchBusinesses()}
      />
    );
  }

  if (permissionsLoaded && !activePageAllowed) {
    return (
      <PlatformAdminErrorPage kind="forbidden" branding={platformBranding} />
    );
  }

  return (
    <div
      className="h-screen bg-slate-50 dark:bg-[#161B22] text-slate-800 dark:text-gray-100 flex flex-col md:flex-row relative overflow-hidden"
      dir="ltr"
      data-multitree-theme
    >
      <DashboardSidebar
        brandName={platformBranding.name}
        brandSubtitle="کۆنترۆڵی گشتی"
        brandImage={
          platformBranding.logo ||
          platformBranding.avatar ||
          "/images/DefaultAvatar.png"
        }
        items={sidebarItems}
        collapsed={isSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        accent="var(--multitree-accent)"
        footer={
          <div className="shrink-0 border-t border-slate-200 p-4 dark:border-white/10">
            <button
              type="button"
              onClick={() => router.push(`${consoleBasePath}/settings`)}
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-slate-100 ${
                isSidebarCollapsed ? "md:justify-center md:px-0" : "gap-3"
              }`}
              title="ڕێکخستنەکانی بەڕێوەبەر"
            >
              <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span
                className={`whitespace-nowrap transition-all duration-300 ${
                  isSidebarCollapsed
                    ? "overflow-hidden md:pointer-events-none md:w-0 md:opacity-0"
                    : "opacity-100"
                }`}
              >
                ڕێکخستنەکانی بەڕێوەبەر
              </span>
            </button>
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <DashboardHeader
          title={pageTitle[activePage]}
          theme={theme}
          mounted={mounted}
          refreshing={isRefreshing}
          onToggleSidebar={() => {
            if (window.matchMedia("(max-width: 767px)").matches) {
              setIsMobileSidebarOpen((open) => !open);
            } else {
              setIsSidebarCollapsed((collapsed) => !collapsed);
            }
          }}
          onToggleTheme={toggleTheme}
          onRefresh={handleGlobalRefresh}
          notifications={<ApprovalNotifications ref={notificationsRef} />}
          profile={{
            name: administrator.name,
            email: administrator.email,
            badge: "Platform Admin",
            avatarSrc: platformBranding.avatar || platformBranding.logo,
            items: [
              {
                id: "settings",
                label: DASHBOARD_PAGE_LABELS.settings,
                icon: <Settings className="h-4 w-4" />,
                onClick: () => router.push(`${consoleBasePath}/settings`),
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
            ) : activePage === "linktrees" ? (
              <PlatformLinktreesPage />
            ) : activePage === "users" ? (
              <CreatorUsersPage />
            ) : activePage === "mini-websites" ? (
              <PlatformMiniWebsitesPage />
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
