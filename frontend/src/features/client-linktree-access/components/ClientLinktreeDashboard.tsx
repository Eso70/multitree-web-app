"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Eye,
  FileText,
  LayoutTemplate,
  LogOut,
  MousePointerClick,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import type { LinktreeListItem } from "@linktree/types";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { BusinessPageAnalyticsModal } from "@/components/business/BusinessPageAnalyticsModal";
import { LinktreesGrid } from "@/components/business/LinktreesGrid";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import {
  DashboardSidebar,
  type DashboardSidebarItem,
} from "@/components/shared/DashboardSidebar";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { Tooltip } from "@/components/shared/Tooltip";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { SkeletonTemplatePage } from "@/components/shared/Skeleton";
import { ANALYTICS_TERMS } from "@/components/shared/analytics-terminology";
import { persistAppTheme, readAppTheme, type AppTheme } from "@/lib/app-theme";
import { BUSINESS_LOGO_PLACEHOLDER } from "@/lib/brand/brand-assets";
import type { BusinessSubdomainTheme } from "@/lib/utils/business-error-theme";
import type { ClientAccessContext, ClientLinktreeAnalytics } from "../types";

const TemplatesPage = dynamic(
  () =>
    import("@/features/templates/components/TemplatesPage").then(
      (module) => module.TemplatesPage,
    ),
  {
    ssr: false,
    loading: () => <SkeletonTemplatePage />,
  },
);

type ClientDashboardPage = "pages" | "templates";

export function ClientLinktreeDashboard({
  context,
  theme,
  analytics,
  analyticsLoading,
  onCreate,
  onRefreshAnalytics,
  onLogout,
}: {
  context: ClientAccessContext;
  theme: BusinessSubdomainTheme | null;
  analytics: ClientLinktreeAnalytics | null;
  analyticsLoading: boolean;
  onCreate: () => void;
  onRefreshAnalytics: () => void;
  onLogout: () => void;
}) {
  const page = context.linktree;
  const brandName = theme?.name || "Business";
  const brandImage = theme?.logo || BUSINESS_LOGO_PLACEHOLDER;
  const [appTheme, setAppTheme] = useState<AppTheme>("light");
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [activePage, setActivePage] = useState<ClientDashboardPage>("pages");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAppTheme(readAppTheme());
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const totalViews = analytics?.total_views || 0;
  const totalClicks = analytics?.total_clicks || 0;
  const stats = [
    {
      icon: Eye,
      label: ANALYTICS_TERMS.totalViews,
      value: totalViews,
      loading: analyticsLoading && !analytics,
      color: "blue",
    },
    {
      icon: Users,
      label: ANALYTICS_TERMS.uniqueViewer,
      value: analytics?.unique_views || 0,
      loading: analyticsLoading && !analytics,
      color: "purple",
    },
    {
      icon: MousePointerClick,
      label: ANALYTICS_TERMS.totalClicks,
      value: totalClicks,
      loading: analyticsLoading && !analytics,
      color: "green",
    },
    {
      icon: MousePointerClick,
      label: ANALYTICS_TERMS.uniqueClicker,
      value: analytics?.unique_clicks || 0,
      loading: analyticsLoading && !analytics,
      color: "orange",
    },
  ] as const;
  const pages: LinktreeListItem[] = page
    ? [
        {
          id: page.id,
          uid: page.uid,
          name: page.name,
          subtitle: page.subtitle,
          description: page.description,
          seo_name: page.slug,
          image: page.image,
          template_key: page.templateKey,
          whatsapp_modal_enabled: page.whatsappModalEnabled,
          status: page.status === "inactive" ? "inactive" : "active",
          created_at: page.createdAt,
          updated_at: page.updatedAt,
          analytics: {
            unique_views: analytics?.unique_views || 0,
            unique_clicks: analytics?.unique_clicks || 0,
            total_clicks: totalClicks,
          },
        },
      ]
    : [];

  const sidebarItems: DashboardSidebarItem[] = [
    {
      id: "pages",
      label: DASHBOARD_PAGE_LABELS.linktrees,
      icon: <FileText className="h-4 w-4" />,
      active: activePage === "pages",
      onClick: () => {
        setAnalyticsModalOpen(false);
        setActivePage("pages");
      },
    },
    {
      id: "templates",
      label: DASHBOARD_PAGE_LABELS.templates,
      icon: <LayoutTemplate className="h-4 w-4" />,
      active: activePage === "templates",
      onClick: () => {
        setAnalyticsModalOpen(false);
        setActivePage("templates");
      },
    },
  ];

  const toggleTheme = () => {
    const next = appTheme === "light" ? "dark" : "light";
    persistAppTheme(next);
    setAppTheme(next);
  };

  return (
    <main
      className="relative flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-800 dark:bg-[#161B22] dark:text-gray-100 md:flex-row"
      dir="ltr"
      data-client-dashboard
    >
      <DashboardSidebar
        brandName={brandName}
        brandSubtitle="داشبۆردی کڕیار"
        brandImage={brandImage}
        brandImageAlt={brandName}
        items={sidebarItems}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        accent="var(--theme-primary)"
      />

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          title={
            activePage === "templates"
              ? DASHBOARD_PAGE_LABELS.templates
              : DASHBOARD_PAGE_LABELS.linktrees
          }
          theme={appTheme}
          mounted={mounted}
          refreshing={analyticsLoading}
          onToggleSidebar={() => {
            if (window.matchMedia("(max-width: 767px)").matches) {
              setMobileSidebarOpen((open) => !open);
            } else {
              setSidebarCollapsed((collapsed) => !collapsed);
            }
          }}
          onToggleTheme={toggleTheme}
          onRefresh={onRefreshAnalytics}
          showRefresh={activePage === "pages" && Boolean(page)}
          showLanguage={false}
          notifications={null}
          profile={{
            name: context.clientLabel,
            email: brandName,
            badge: "کڕیار",
            avatarSrc: brandImage,
            items: [
              {
                id: "logout",
                label: "چوونەدەرەوە",
                icon: <LogOut className="h-4 w-4" />,
                danger: true,
                onClick: onLogout,
              },
            ],
          }}
          onProfileItemClick={() => setMobileSidebarOpen(false)}
        />

        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
            {activePage === "templates" ? (
              <TemplatesPage
                accessMode="provided"
                allowedTemplateKeys={context.templateKeys}
              />
            ) : (
              <>
                <div id="client-page-stats" className="mb-8 scroll-mt-6">
                  <StatCardGrid columns={4}>
                    {stats.map((stat) => (
                      <StatCard key={stat.label} {...stat} />
                    ))}
                  </StatCardGrid>
                </div>

                <DashboardSurface
                  id="client-pages"
                  as="div"
                  className="scroll-mt-6 space-y-6"
                >
                  <PageHeader
                    title={DASHBOARD_PAGE_LABELS.linktrees}
                    description="پەڕەکەت ببینە و بینین و کلیکەکانی چاودێری بکە."
                    icon={FileText}
                    action={
                      <div className="flex items-center gap-2">
                        {page ? (
                          <Tooltip content="نوێکردنەوەی ئامارەکان" side="bottom">
                            <button
                              type="button"
                              onClick={onRefreshAnalytics}
                              aria-busy={analyticsLoading}
                              disabled={analyticsLoading}
                              className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 cursor-pointer"
                              aria-label="نوێکردنەوەی ئامارەکان"
                            >
                              <MotionSpinner active={analyticsLoading}>
                                <RefreshCw className="h-4 w-4" />
                              </MotionSpinner>
                            </button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="دروستکردنی پەیجی نوێ" side="bottom">
                            <button
                              type="button"
                              onClick={onCreate}
                              className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                              <span>پەیجی نوێ</span>
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    }
                  />
                  <div className="border-t border-slate-100 pt-6 dark:border-white/5">
                    <LinktreesGrid
                      data={pages}
                      isLoading={false}
                      showLinktreeMeta
                      emptyTitle="هێشتا پەڕەیەکت نییە"
                      emptyDescription="یەک پەڕەی لینکتری دروست بکە بە قاڵبە بەردەستەکانی پلانی بزنسەکە."
                      onViewAnalytics={
                        page ? () => setAnalyticsModalOpen(true) : undefined
                      }
                    />
                  </div>
                </DashboardSurface>
              </>
            )}
          </div>
        </div>
      </div>
      {activePage === "pages" && page ? (
        <BusinessPageAnalyticsModal
          isOpen={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          pageId={page.id}
          pageName={page.name}
          pageKind="linktree"
          dataSource="client-linktree"
          canClearAnalytics={false}
        />
      ) : null}
    </main>
  );
}
