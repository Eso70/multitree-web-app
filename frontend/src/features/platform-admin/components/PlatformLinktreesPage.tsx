"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleCheckBig,
  Eye,
  FileText,
  LayoutGrid,
  MousePointerClick,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Target,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { LinktreeListItem } from "@linktree/types";
import type {
  EditLinkData,
  LinktreeEditorSubmitData,
} from "@/features/link-editor/editor-types";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { SkeletonLinktreeGrid } from "@/components/shared/SkeletonPageLayouts";
import {
  SkeletonLinktreeEditorModal,
  SkeletonPageAnalyticsModal,
} from "@/components/shared/SkeletonModalLayouts";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import { apiRequest } from "@/lib/api/request";
import { buildPlatformLinktreePayload } from "@/features/platform-admin/api/platform-linktrees";
import { ClearAnalyticsButton } from "@/components/shared/ClearAnalyticsButton";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";
import { ANALYTICS_TERMS } from "@/components/shared/analytics-terminology";
import { Tooltip } from "@/components/shared/Tooltip";

const LinktreesGrid = dynamic(
  () =>
    import("@/components/business/LinktreesGrid").then((module) => ({
      default: module.LinktreesGrid,
    })),
  { ssr: false, loading: () => <SkeletonLinktreeGrid count={6} /> },
);

const LinktreesTable = dynamic(
  () =>
    import("@/components/business/LinktreesTable").then((module) => ({
      default: module.LinktreesTable,
    })),
  { ssr: false, loading: () => <SkeletonTable rows={6} columns={8} /> },
);

const LinktreeEditorModal = dynamic(
  () =>
    import("@/features/link-editor/components/ReusableLinktreeEditorModal").then(
      (module) => ({
        default: module.ReusableLinktreeEditorModal,
      }),
    ),
  { ssr: false, loading: () => <SkeletonLinktreeEditorModal /> },
);

const DuplicateLinktreeModal = dynamic(
  () =>
    import("@/components/business/DuplicateLinktreeModal").then((module) => ({
      default: module.DuplicateLinktreeModal,
    })),
  { ssr: false },
);

const LinktreeSearchModal = dynamic(
  () =>
    import("@/components/shared/LinktreeSearchModal").then((module) => ({
      default: module.LinktreeSearchModal,
    })),
  { ssr: false },
);

const BusinessPageAnalyticsModal = dynamic(
  () =>
    import("@/components/business/BusinessPageAnalyticsModal").then(
      (module) => ({ default: module.BusinessPageAnalyticsModal }),
    ),
  { ssr: false, loading: () => <SkeletonPageAnalyticsModal /> },
);

const SummaryBusinessPageAnalyticsModal = dynamic(
  () =>
    import("@/components/business/BusinessPageAnalyticsModal").then((mod) => ({
      default: mod.BusinessPageAnalyticsModal,
    })),
  {
    ssr: false,
    loading: () => <SkeletonPageAnalyticsModal summaryOnly />,
  },
);

type PlatformLinktreeContext = {
  branding: {
    name: string;
    logo: string | null;
    avatar: string | null;
    favicon: string | null;
    accentColor: string;
  };
  publicPathPrefix: string;
};

export interface RootLinktreesPageProps {
  apiBase?: string;
  analyticsDataSource?: "platform-linktree" | "creator-linktree";
  ownerLabel?: string;
  maxPages?: number;
  canDelete?: boolean;
  onCreated?: () => void;
}

export function PlatformLinktreesPage() {
  return <RootLinktreesPage />;
}

export function RootLinktreesPage({
  apiBase = "/api/platform/linktrees",
  analyticsDataSource = "platform-linktree",
  ownerLabel = "پلاتفۆرم",
  maxPages,
  canDelete = true,
  onCreated,
}: RootLinktreesPageProps) {
  const apiEndpoints = useMemo(
    () => ({
      upload: `${apiBase}/upload`,
      checkSlug: `${apiBase}/check-slug`,
      checkName: `${apiBase}/check-name`,
    }),
    [apiBase],
  );
  const [context, setContext] = useState<PlatformLinktreeContext | null>(null);
  const [items, setItems] = useState<LinktreeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] =
    useState<LinktreeListItem | null>(null);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editData, setEditData] = useState<EditLinkData | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [analyticsPageId, setAnalyticsPageId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<LinktreeListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearAllAnalyticsOpen, setClearAllAnalyticsOpen] = useState(false);
  const [clearingAllAnalytics, setClearingAllAnalytics] = useState(false);

  // Search keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isKKey = e.key === "k" || e.key === "K" || e.code === "KeyK";
      if ((e.ctrlKey || e.metaKey) && isKKey) {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [nextContext, nextItems] = await Promise.all([
          apiRequest<PlatformLinktreeContext>(
            apiBase === "/api/creator/linktrees"
              ? "/api/creator/context"
              : `${apiBase}/context`,
          ),
          apiRequest<LinktreeListItem[]>(apiBase),
        ]);
        setContext(nextContext);
        setItems(nextItems);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "بارکردنی پەڕەکانی لینکتری سەرکەوتوو نەبوو",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiBase],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(value) ||
        item.uid.toLowerCase().includes(value) ||
        item.seo_name?.toLowerCase().includes(value),
    );
  }, [items, query]);

  const analytics = useMemo(
    () =>
      items.reduce(
        (totals, item) => ({
          uniqueViews: totals.uniqueViews + (item.analytics?.unique_views ?? 0),
          uniqueClicks:
            totals.uniqueClicks + (item.analytics?.unique_clicks ?? 0),
          totalClicks: totals.totalClicks + (item.analytics?.total_clicks ?? 0),
        }),
        { uniqueViews: 0, uniqueClicks: 0, totalClicks: 0 },
      ),
    [items],
  );
  const activePages = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items],
  );
  const clickThroughRate =
    analytics.uniqueViews > 0
      ? ((analytics.uniqueClicks / analytics.uniqueViews) * 100).toFixed(1)
      : "0.0";
  const hasAnalyticsData =
    analytics.uniqueViews > 0 ||
    analytics.uniqueClicks > 0 ||
    analytics.totalClicks > 0;
  const analyticsPage = useMemo(
    () => items.find((item) => item.id === analyticsPageId) ?? null,
    [analyticsPageId, items],
  );
  const pageLimitReached = maxPages !== undefined && items.length >= maxPages;

  const openClearAllAnalytics = useCallback(() => {
    setClearAllAnalyticsOpen(true);
  }, []);

  const closeClearAllAnalytics = useCallback(() => {
    if (!clearingAllAnalytics) setClearAllAnalyticsOpen(false);
  }, [clearingAllAnalytics]);

  const clearAllAnalytics = useCallback(async () => {
    if (clearingAllAnalytics || !hasAnalyticsData) return;
    setClearingAllAnalytics(true);
    try {
      await apiRequest(`${apiBase}/analytics`, {
        method: "DELETE",
      });
      await load(true);
      toast.success("هەموو ئامارەکانی لینکتری پاککرانەوە");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "پاککردنەوەی هەموو ئامارەکان سەرکەوتوو نەبوو",
      );
      throw error;
    } finally {
      setClearingAllAnalytics(false);
    }
  }, [apiBase, clearingAllAnalytics, hasAnalyticsData, load]);

  const openEdit = useCallback(
    async (id: string) => {
      setEditorOpen(true);
      setLoadingEdit(true);
      setEditData(null);
      try {
        setEditData(await apiRequest<EditLinkData>(`${apiBase}/${id}/edit`));
      } catch (error) {
        setEditorOpen(false);
        toast.error(
          error instanceof Error
            ? error.message
            : "بارکردنی پەڕەی لینکتری سەرکەوتوو نەبوو",
        );
      } finally {
        setLoadingEdit(false);
      }
    },
    [apiBase],
  );

  const save = useCallback(
    async (data: LinktreeEditorSubmitData, editId?: string) => {
      try {
        await apiRequest(editId ? `${apiBase}/${editId}` : apiBase, {
          method: editId ? "PATCH" : "POST",
          json: buildPlatformLinktreePayload(data),
        });
        setEditorOpen(false);
        setEditData(null);
        toast.success(
          editId ? "پەڕەی لینکتری نوێ کرایەوە" : "پەڕەی لینکتری دروست کرا",
        );
        if (!editId) onCreated?.();
        await load(true);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "پاشەکەوتکردنی پەڕەی لینکتری سەرکەوتوو نەبوو",
        );
        throw error;
      }
    },
    [apiBase, load, onCreated],
  );

  const handleToggleStatus = useCallback(
    async (id: string, nextStatus: "active" | "inactive") => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: nextStatus } : item,
        ),
      );

      try {
        await apiRequest(`${apiBase}/${id}/status`, {
          method: "PATCH",
          json: { status: nextStatus },
        });

        if (nextStatus === "active") {
          toast.success("پەڕەکە چالاککرایەوە");
        } else {
          toast.success("پەڕەکە ناچالاککرا");
        }
      } catch (error) {
        await load(true);
        toast.error(
          error instanceof Error
            ? error.message
            : "گۆڕینی دۆخی پەڕە سەرکەوتوو نەبوو",
        );
      }
    },
    [apiBase, load],
  );

  const content =
    view === "grid" ? (
      <LinktreesGrid
        data={filtered}
        isLoading={loading}
        onEdit={(id) => void openEdit(id)}
        onDuplicate={(item) => setDuplicateTarget(item)}
        onDelete={
          canDelete
            ? (id) => setDeleting(items.find((item) => item.id === id) || null)
            : undefined
        }
        onViewAnalytics={(id) => setAnalyticsPageId(id)}
        onToggleStatus={handleToggleStatus}
        viewActionLabel="ئامار"
        publicPathPrefix="/linktree"
        showLinktreeMeta
        emptyTitle={
          query.trim()
            ? "هیچ ئەنجامێک بۆ گەڕانەکەت نەدۆزرایەوە"
            : `هێشتا هیچ پەڕەیەکی لینکتریی ${ownerLabel} نییە`
        }
        emptyDescription={
          query.trim()
            ? "وشەیەکی دیکە بنووسە یان گەڕانەکە پاک بکەرەوە."
            : "یەکەم پەڕەی لینکتری لە دۆمەینی سەرەکی دروست بکە."
        }
      />
    ) : (
      <LinktreesTable
        data={filtered}
        isLoading={loading}
        onEdit={(id) => void openEdit(id)}
        onDuplicate={(item) => setDuplicateTarget(item)}
        onDelete={
          canDelete
            ? (id) => setDeleting(items.find((item) => item.id === id) || null)
            : undefined
        }
        onViewAnalytics={(id) => setAnalyticsPageId(id)}
        onToggleStatus={handleToggleStatus}
        viewActionLabel="ئامار"
        publicPathPrefix="/linktree"
        showLinktreeMeta
        emptyTitle={
          query.trim()
            ? "هیچ ئەنجامێک بۆ گەڕانەکەت نەدۆزرایەوە"
            : "هێشتا هیچ پەڕەیەکی لینکتریی پلاتفۆرم نییە"
        }
      />
    );

  return (
    <ThemeProvider websiteColor={context?.branding.accentColor || null}>
      <StatCardGrid columns={3} className="mb-8">
        <StatCard
          loading={loading}
          icon={FileText}
          label="کۆی پەڕەکانی لینکتری"
          value={items.length}
          color="blue"
        />
        <StatCard
          loading={loading}
          icon={Eye}
          label={ANALYTICS_TERMS.uniqueViewer}
          value={analytics.uniqueViews}
          color="purple"
        />
        <StatCard
          loading={loading}
          icon={MousePointerClick}
          label={ANALYTICS_TERMS.totalClicks}
          value={analytics.totalClicks}
          color="slate"
        />
        <StatCard
          loading={loading}
          icon={Users}
          label={ANALYTICS_TERMS.uniqueClicker}
          value={analytics.uniqueClicks}
          color="green"
        />
        <StatCard
          loading={loading}
          icon={Target}
          label={ANALYTICS_TERMS.clickRate}
          value={`${clickThroughRate}%`}
          color="orange"
        />
        <StatCard
          loading={loading}
          icon={CircleCheckBig}
          label="پەڕە چالاکەکان"
          value={activePages}
          color="pink"
        />
      </StatCardGrid>

      <DashboardSurface as="div" className="space-y-6">
        <PageHeader
          title={DASHBOARD_PAGE_LABELS.linktrees}
          description={`پەڕە گشتییەکانی ${ownerLabel} دروست و بەڕێوە ببە لە sponsor.krd/linktree/name.`}
          icon={FileText}
          action={
            <div className="flex items-center gap-2">
              <ClearAnalyticsButton
                onClick={openClearAllAnalytics}
                hasData={hasAnalyticsData}
                disabled={refreshing || clearingAllAnalytics}
              />
              {maxPages === undefined || items.length < maxPages ? (
                <Tooltip content="نوێکردنەوەی پەیجەکان" side="bottom">
                  <button
                    type="button"
                    onClick={() => void load(true)}
                    aria-busy={refreshing}
                    disabled={refreshing}
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 cursor-pointer"
                    aria-label="نوێکردنەوە"
                  >
                    <MotionSpinner active={refreshing}>
                      <RefreshCw className="h-4 w-4" />
                    </MotionSpinner>
                  </button>
                </Tooltip>
              ) : null}

              <Tooltip
                content={
                  query.trim()
                    ? "پاککردنەوەی گەڕان"
                    : "گەڕان لە پەڕەکان (Ctrl+K)"
                }
                side="bottom"
              >
                <button
                  type="button"
                  onClick={() =>
                    query.trim()
                      ? setQuery("")
                      : setIsSearchModalOpen(true)
                  }
                  className={`group relative flex items-center justify-center h-10 w-10 px-0 rounded-xl border transition-all duration-300 shadow-sm hover:shadow cursor-pointer ${
                    query.trim() ? "" : "sm:w-44 sm:justify-between sm:px-3.5"
                  } ${
                    isSearchModalOpen
                      ? "text-slate-700 dark:text-gray-200"
                      : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/10"
                  }`}
                  style={
                    isSearchModalOpen
                      ? {
                          background:
                            "color-mix(in srgb, var(--theme-css, #64748b) 20%, transparent)",
                          borderColor:
                            "color-mix(in srgb, var(--theme-css, #64748b) 35%, transparent)",
                          color: "var(--theme-css, #64748b)",
                        }
                      : undefined
                  }
                  aria-label={query.trim() ? "پاککردنەوەی گەڕان" : "گەڕان"}
                >
                  {query.trim() ? (
                    <X className="h-4 w-4 text-slate-500 transition-transform group-hover:scale-110 dark:text-gray-400" />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-gray-500 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline text-xs font-semibold text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-300 transition-colors truncate">
                          گەڕان...
                        </span>
                      </div>
                      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[8px] font-sans font-bold text-slate-400 dark:text-gray-500 select-none">
                        <span>Ctrl</span>
                        <span>K</span>
                      </kbd>
                    </>
                  )}
                </button>
              </Tooltip>

              <div className="flex h-10 shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                <Tooltip content="پیشاندانی تۆڕی (گرید)" side="bottom">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all duration-300 ${view === "grid" ? "text-white shadow-md" : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"}`}
                    style={
                      view === "grid"
                        ? { background: "var(--theme-css, #64748b)" }
                        : undefined
                    }
                    aria-pressed={view === "grid"}
                    aria-label="بینینی گرید"
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0" />
                  </button>
                </Tooltip>
                <Tooltip content="پیشاندانی خشتەیی" side="bottom">
                  <button
                    type="button"
                    onClick={() => setView("table")}
                    className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all duration-300 ${view === "table" ? "text-white shadow-md" : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"}`}
                    style={
                      view === "table"
                        ? { background: "var(--theme-css, #64748b)" }
                        : undefined
                    }
                    aria-pressed={view === "table"}
                    aria-label="بینینی خشتە"
                  >
                    <Table2 className="h-4 w-4 shrink-0" />
                  </button>
                </Tooltip>
              </div>

              <Tooltip
                content={
                  pageLimitReached
                    ? "سنووری دروستکردنی پەڕە پڕ بووە"
                    : "دروستکردنی پەیجی نوێ"
                }
                side="bottom"
              >
                <button
                  type="button"
                  disabled={pageLimitReached}
                  onClick={() => {
                    if (pageLimitReached) return;
                    setEditData(null);
                    setEditorOpen(true);
                  }}
                  title={
                    pageLimitReached
                      ? "سنووری دروستکردنی پەڕە پڕ بووە"
                      : "دروستکردنی پەیجی نوێ"
                  }
                  className="group flex h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>پەیجی نوێ</span>
                </button>
              </Tooltip>
            </div>
          }
        />
        <div className="border-t border-slate-100 pt-6 dark:border-white/5">
          {content}
        </div>
      </DashboardSurface>

      {editorOpen ? (
        <LinktreeEditorModal
          isOpen
          onClose={() => {
            setEditorOpen(false);
            setEditData(null);
          }}
          onSubmit={save}
          editData={editData}
          isLoadingEditData={loadingEdit}
          businessDefaults={{
            default_avatar: context?.branding.avatar || null,
          }}
          businessIdentity={{ name: context?.branding.name || "MultiTree" }}
          apiEndpoints={apiEndpoints}
        />
      ) : null}

      {analyticsPage ? (
        analyticsDataSource === "platform-linktree" ? (
          <SummaryBusinessPageAnalyticsModal
            isOpen
            onClose={() => setAnalyticsPageId(null)}
            pageId={analyticsPage.id}
            pageName={analyticsPage.name}
            pageKind="linktree"
            canClearAnalytics
            summaryOnly
            dataSource={analyticsDataSource}
            onAnalyticsCleared={load}
          />
        ) : (
          <BusinessPageAnalyticsModal
            isOpen
            onClose={() => setAnalyticsPageId(null)}
            pageId={analyticsPage.id}
            pageName={analyticsPage.name}
            pageKind="linktree"
            canClearAnalytics
            summaryOnly={false}
            dataSource={analyticsDataSource}
            onAnalyticsCleared={load}
          />
        )
      ) : null}

      <ConfirmDeleteModal
        isOpen={clearAllAnalyticsOpen}
        onClose={closeClearAllAnalytics}
        onConfirm={clearAllAnalytics}
        title="پاککردنەوەی هەموو ئامارەکان"
        confirmLabel="بەڵێ، هەمووی پاک بکەوە"
        loadingLabel="پاکدەکرێتەوە..."
        cancelLabel="هەڵوەشاندنەوە"
        isDeleting={clearingAllAnalytics}
        message={
          <p>
            دڵنیایت لە پاککردنەوەی هەموو داتاکانی بینین و کلیکی پەڕەکانی لینکتری
            پلاتفۆرم؟ ئەم کردارە ناگەڕێتەوە.
          </p>
        }
      />

      <ConfirmDeleteModal
        isOpen={canDelete && Boolean(deleting)}
        onClose={() => setDeleting(null)}
        isDeleting={isDeleting}
        title="سڕینەوەی پەڕەی لینکتری"
        message={`دڵنیایت لە سڕینەوەی «${deleting?.name || "ئەم پەڕەیە"}»؟ بەستەرە گشتییەکەی بۆ هەمیشە نامێنێت.`}
        onConfirm={async () => {
          if (!deleting) return;
          setIsDeleting(true);
          try {
            await apiRequest(`${apiBase}/${deleting.id}`, {
              method: "DELETE",
            });
            toast.success("پەڕەی لینکتری سڕایەوە");
            await load(true);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "سڕینەوەی پەڕەی لینکتری سەرکەوتوو نەبوو",
            );
            throw error;
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      <LinktreeSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        searchQuery={query}
        onSearchQueryChange={setQuery}
        items={items}
        onSelect={(item) => {
          setIsSearchModalOpen(false);
          void openEdit(item.id);
        }}
        publicPathPrefix="/linktree"
      />

      {duplicateTarget ? (
        <DuplicateLinktreeModal
          isOpen={Boolean(duplicateTarget)}
          onClose={() => setDuplicateTarget(null)}
          targetLinktree={duplicateTarget}
          apiBase={apiBase}
          onSuccess={() => {
            void load(true);
          }}
        />
      ) : null}
    </ThemeProvider>
  );
}
