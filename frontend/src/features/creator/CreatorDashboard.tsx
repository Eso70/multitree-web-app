"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FileText,
  LayoutTemplate,
  LogOut,
  Settings,
} from "lucide-react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";
import {
  DashboardSidebar,
  type DashboardSidebarItem,
} from "@/components/shared/DashboardSidebar";
import {
  SkeletonDashboardShell,
  SkeletonTemplatePage,
} from "@/components/shared/Skeleton";
import {
  SkeletonPageManagement,
  SkeletonSettingsPage,
} from "@/components/shared/SkeletonPageLayouts";
import { apiRequest } from "@/lib/api/request";
import { persistAppTheme, readAppTheme, type AppTheme } from "@/lib/app-theme";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import { SPONSOR_KRD_LOGO } from "@/lib/brand/brand-assets";
import { CreatorSidebarFooter } from "./CreatorSidebarFooter";
import type { CreatorContext } from "./creator-dashboard.types";

const RootLinktreesPage = dynamic(
  () =>
    import("@/features/platform-admin/components/PlatformLinktreesPage").then(
      (module) => ({ default: module.RootLinktreesPage }),
    ),
  { ssr: false, loading: () => <SkeletonPageManagement /> },
);

const TemplatesPage = dynamic(
  () =>
    import("@/features/templates/components/TemplatesPage").then((module) => ({
      default: module.TemplatesPage,
    })),
  { ssr: false, loading: () => <SkeletonTemplatePage /> },
);

const CreatorAccountSettingsPage = dynamic(
  () =>
    import("./CreatorAccountSettingsPage").then((module) => ({
      default: module.CreatorAccountSettingsPage,
    })),
  {
    ssr: false,
    loading: () => <SkeletonSettingsPage tabCount={3} />,
  },
);

type CreatorDashboardPage = "home" | "linktree" | "templates" | "settings";

const PAGE_TITLES: Record<CreatorDashboardPage, string> = {
  home: DASHBOARD_PAGE_LABELS.linktrees,
  linktree: DASHBOARD_PAGE_LABELS.linktrees,
  templates: DASHBOARD_PAGE_LABELS.templates,
  settings: DASHBOARD_PAGE_LABELS.settings,
};

function activeDashboardPage(pathname: string): CreatorDashboardPage {
  if (pathname.endsWith("/settings")) return "settings";
  if (pathname.endsWith("/linktree")) return "linktree";
  if (pathname.endsWith("/templates")) return "templates";
  return "home";
}

export function CreatorDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const activePage = activeDashboardPage(pathname);
  const [context, setContext] = useState<CreatorContext | null>(null);
  const [theme, setTheme] = useState<AppTheme>(() => readAppTheme());
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const load = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      try {
        setContext(await apiRequest<CreatorContext>("/api/creator/context"));
      } catch {
        router.replace("/login");
      } finally {
        if (quiet) setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const currentTheme = readAppTheme();
      persistAppTheme(currentTheme);
      setTheme(currentTheme);
      setMounted(true);
      void load();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  useEffect(() => {
    if (pathname !== "/account" || !context) return;
    router.replace("/account/linktree");
  }, [context, pathname, router]);

  const logout = useCallback(async () => {
    await apiRequest("/api/creator/auth/logout", { method: "POST" });
    router.replace("/login");
  }, [router]);

  const sidebarItems = useMemo<DashboardSidebarItem[]>(
    () => [
      {
        id: "linktree",
        label: DASHBOARD_PAGE_LABELS.linktrees,
        icon: <FileText className="h-4 w-4" />,
        active: activePage === "linktree",
        onClick: () => router.push("/account/linktree"),
      },
      {
        id: "templates",
        label: DASHBOARD_PAGE_LABELS.templates,
        icon: <LayoutTemplate className="h-4 w-4" />,
        active: activePage === "templates",
        onClick: () => router.push("/account/templates"),
      },
      {
        id: "settings",
        label: DASHBOARD_PAGE_LABELS.settings,
        icon: <Settings className="h-4 w-4" />,
        active: activePage === "settings",
        onClick: () => router.push("/account/settings"),
      },
    ],
    [activePage, router],
  );

  if (!context)
    return (
      <SkeletonDashboardShell navigationItems={3}>
        <SkeletonPageManagement />
      </SkeletonDashboardShell>
    );

  return (
    <ThemeProvider websiteColor={context.branding.accentColor}>
      <div
        className="relative flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-800 dark:bg-[#161B22] dark:text-gray-100 md:flex-row"
        dir="ltr"
        data-sponsor-krd-theme
      >
        <DashboardSidebar
          brandName="Sponsor.krd"
          brandSubtitle="داشبۆردی بەکارهێنەر"
          brandImage={SPONSOR_KRD_LOGO}
          brandImageAlt="Sponsor.krd"
          items={sidebarItems}
          collapsed={isSidebarCollapsed}
          mobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          footer={
            <CreatorSidebarFooter
              collapsed={isSidebarCollapsed}
              billingStatus={context.account.billingStatus}
            />
          }
          accent="var(--sponsor-krd-accent)"
        />

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader
            title={PAGE_TITLES[activePage]}
            theme={theme}
            mounted={mounted}
            refreshing={refreshing}
            onToggleSidebar={() => {
              if (window.matchMedia("(max-width: 767px)").matches) {
                setIsMobileSidebarOpen((open) => !open);
              } else {
                setIsSidebarCollapsed((collapsed) => !collapsed);
              }
            }}
            onToggleTheme={() => {
              const next = theme === "light" ? "dark" : "light";
              persistAppTheme(next);
              setTheme(next);
            }}
            onRefresh={() => load(true)}
            notifications={null}
            profile={{
              name: context.account.display_name,
              email: context.account.email,
              badge: billingBadge(context.account.billingStatus),
              avatarSrc: context.account.avatar_url || context.branding.avatar,
              items: [
                {
                  id: "settings",
                  label: DASHBOARD_PAGE_LABELS.settings,
                  icon: <Settings className="h-4 w-4" />,
                  onClick: () => router.push("/account/settings"),
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
                  onClick: () => void logout(),
                },
              ],
            }}
            onProfileItemClick={() => setIsMobileSidebarOpen(false)}
          />

          <main className="relative w-full flex-1 overflow-y-auto" dir="ltr">
            <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
              {activePage === "templates" ? (
                <TemplatesPage accessMode="all" />
              ) : activePage === "settings" ? (
                <CreatorAccountSettingsPage account={context.account} />
              ) : activePage === "home" ? (
                <SkeletonPageManagement />
              ) : (
                <RootLinktreesPage
                  apiBase="/api/creator/linktrees"
                  analyticsDataSource="creator-linktree"
                  ownerLabel="تۆ"
                  maxPages={1}
                  canDelete={false}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

function billingBadge(status: CreatorContext["account"]["billingStatus"]) {
  const labels = {
    not_started: "نوێ",
    trialing: "تاقیکردنەوە",
    grace_period: "ماوەی زیادە",
    expired: "بەسەرچووە",
    active: "چالاک",
  } as const;
  return labels[status];
}
