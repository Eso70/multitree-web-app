"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { LinktreeListItem } from "@linktree/types";

import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { LinktreeSearchModal } from "@/components/shared/LinktreeSearchModal";
import {
  SkeletonLinktreeEditorModal,
  SkeletonPageAnalyticsModal,
} from "@/components/shared/SkeletonModalLayouts";
import type {
  EditLinkData,
  LinktreeEditorSubmitData,
} from "@/features/link-editor/editor-types";
import { LinktreesManagementPage } from "@/features/link-editor/components/LinktreesManagementPage";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import { apiRequest } from "@/lib/api/request";
import { buildPlatformLinktreePayload } from "@/features/platform-admin/api/platform-linktrees";

const LinktreeEditorModal = dynamic(
  () =>
    import("@/features/link-editor/components/ReusableLinktreeEditorModal").then(
      (module) => ({ default: module.ReusableLinktreeEditorModal }),
    ),
  { ssr: false, loading: () => <SkeletonLinktreeEditorModal /> },
);
const DuplicateLinktreeModal = dynamic(
  () =>
    import("@/features/link-editor/components/ReusableDuplicateLinktreeModal").then(
      (module) => ({ default: module.ReusableDuplicateLinktreeModal }),
    ),
  { ssr: false },
);
const AnalyticsModal = dynamic(
  () =>
    import("@/features/analytics/components/PageAnalyticsModal").then(
      (module) => ({ default: module.PageAnalyticsModal }),
    ),
  { ssr: false, loading: () => <SkeletonPageAnalyticsModal /> },
);

interface AnalyticsTotals {
  total_views: number;
  unique_views: number;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  conversion_value: number;
}

type PlatformLinktreeContext = {
  branding: {
    name: string;
    logo: string | null;
    avatar: string | null;
    favicon: string | null;
    accentColor: string;
  };
  defaults?: {
    default_footer_text?: string | null;
    default_footer_phone?: string | null;
    default_template?: string | null;
    default_background_color?: string | null;
    default_footer_hidden?: boolean;
    default_whatsapp_enabled?: boolean;
    default_avatar?: string | null;
  };
  publicPathPrefix: string;
};

const EMPTY_TOTALS: AnalyticsTotals = {
  total_views: 0,
  unique_views: 0,
  total_clicks: 0,
  unique_clicks: 0,
  conversions: 0,
  conversion_value: 0,
};

export function PlatformLinktreesPage() {
  const apiBase = "/api/platform/linktrees";
  const [context, setContext] = useState<PlatformLinktreeContext | null>(null);
  const [items, setItems] = useState<LinktreeListItem[]>([]);
  const [totals, setTotals] = useState<AnalyticsTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editData, setEditData] = useState<EditLinkData | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [duplicateTarget, setDuplicateTarget] =
    useState<LinktreeListItem | null>(null);
  const [analyticsPageId, setAnalyticsPageId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<LinktreeListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearAllAnalyticsOpen, setClearAllAnalyticsOpen] = useState(false);
  const [clearingAllAnalytics, setClearingAllAnalytics] = useState(false);

  const apiEndpoints = useMemo(
    () => ({
      upload: `${apiBase}/upload`,
      checkSlug: `${apiBase}/check-slug`,
      checkName: `${apiBase}/check-name`,
    }),
    [apiBase],
  );

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const contextUrl =
          `${apiBase}/context`;
        const [nextContext, nextItems, nextTotals] = await Promise.all([
          apiRequest<PlatformLinktreeContext>(contextUrl),
          apiRequest<LinktreeListItem[]>(apiBase),
          apiRequest<AnalyticsTotals>(`${apiBase}/analytics/summary`),
        ]);
        setContext(nextContext);
        setItems(nextItems);
        setTotals(
          nextTotals ??
            nextItems.reduce<AnalyticsTotals>(
              (sum, item) => ({
                ...sum,
                total_views:
                  sum.total_views + (item.analytics?.unique_views ?? 0),
                unique_views:
                  sum.unique_views + (item.analytics?.unique_views ?? 0),
                total_clicks:
                  sum.total_clicks + (item.analytics?.total_clicks ?? 0),
                unique_clicks:
                  sum.unique_clicks + (item.analytics?.unique_clicks ?? 0),
              }),
              { ...EMPTY_TOTALS },
            ),
        );
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === "k" || event.code === "KeyK")
      ) {
        event.preventDefault();
        event.stopPropagation();
        setIsSearchModalOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

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
  const analyticsPage =
    items.find((item) => item.id === analyticsPageId) ?? null;
  const hasAnalyticsData =
    totals.total_views > 0 || totals.total_clicks > 0 || totals.conversions > 0;

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
    [apiBase, load],
  );

  const updateBoolean = useCallback(
    async (
      id: string,
      field: "is_campaign_active" | "is_archived",
      value: boolean,
      endpoint: "campaign-status" | "archive",
    ) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      );
      try {
        await apiRequest(`${apiBase}/${id}/${endpoint}`, {
          method: "PATCH",
          json: { [field]: value },
        });
        toast.success(
          field === "is_archived"
            ? value
              ? "پەڕەکە ئەرشیفکرا"
              : "پەڕەکە لە ئەرشیف گەڕێندرایەوە"
            : value
              ? "پەڕەکە بۆ کەمپین چالاککرا"
              : "پەڕەکە لە کەمپین لابرا",
        );
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

  const handleToggleStatus = useCallback(
    async (id: string, status: "active" | "inactive") => {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      try {
        await apiRequest(`${apiBase}/${id}/status`, {
          method: "PATCH",
          json: { status },
        });
        toast.success(
          status === "active" ? "پەڕەکە چالاککرایەوە" : "پەڕەکە ناچالاککرا",
        );
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

  const clearAllAnalytics = useCallback(async () => {
    if (clearingAllAnalytics || !hasAnalyticsData) return;
    setClearingAllAnalytics(true);
    try {
      await apiRequest(`${apiBase}/analytics`, { method: "DELETE" });
      await load(true);
      setClearAllAnalyticsOpen(false);
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

  return (
    <ThemeProvider websiteColor={context?.branding.accentColor || null}>
      <LinktreesManagementPage
        linktrees={filtered}
        linktreeCount={items.length}
        isLoading={loading}
        totalViews={totals.total_views}
        uniqueViews={totals.unique_views}
        totalClicks={totals.total_clicks}
        conversions={totals.conversions}
        isRefreshing={refreshing}
        isClearingAnalytics={clearingAllAnalytics}
        hasAnalyticsData={hasAnalyticsData}
        searchQuery={query}
        isSearchModalOpen={isSearchModalOpen}
        viewMode={view}
        onClearAnalytics={() => setClearAllAnalyticsOpen(true)}
        onRefresh={load}
        onSearchAction={() =>
          query.trim() ? setQuery("") : setIsSearchModalOpen(true)
        }
        onViewModeChange={setView}
        onCreate={() => {
          setEditData(null);
          setEditorOpen(true);
        }}
        onEdit={(id) => void openEdit(id)}
        onDuplicate={setDuplicateTarget}
        onDelete={(id) =>
          setDeleting(items.find((item) => item.id === id) ?? null)
        }
        onViewAnalytics={(id) => setAnalyticsPageId(id)}
        onToggleCampaign={(id, value) =>
          updateBoolean(id, "is_campaign_active", value, "campaign-status")
        }
        onToggleArchive={(id, value) =>
          updateBoolean(id, "is_archived", value, "archive")
        }
        onToggleStatus={handleToggleStatus}
        description="پەڕە گشتییەکانی پلاتفۆرم دروست و بەڕێوە ببە لە sponsor.krd/linktree/name."
        publicPathPrefix={context?.publicPathPrefix || "/linktree"}
        emptyTitle={
          query.trim()
            ? "هیچ ئەنجامێک بۆ گەڕانەکەت نەدۆزرایەوە"
            : "هێشتا هیچ پەڕەیەکی لینکتریی پلاتفۆرم نییە"
        }
        emptyDescription={
          query.trim()
            ? "وشەیەکی دیکە بنووسە یان گەڕانەکە پاک بکەرەوە."
            : "یەکەم پەڕەی لینکتری لە دۆمەینی سەرەکی دروست بکە."
        }
      />

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
            ...context?.defaults,
            default_avatar:
              context?.defaults?.default_avatar ||
              context?.branding.avatar ||
              null,
          }}
          businessIdentity={{ name: context?.branding.name || "Sponsor.krd" }}
          apiEndpoints={apiEndpoints}
        />
      ) : null}

      {analyticsPage ? (
        <AnalyticsModal
          isOpen
          onClose={() => setAnalyticsPageId(null)}
          pageId={analyticsPage.id}
          pageName={analyticsPage.name}
          pageKind="linktree"
          canClearAnalytics
          summaryOnly={false}
          dataSource="platform-linktree"
          onAnalyticsCleared={load}
        />
      ) : null}

      <ConfirmDeleteModal
        isOpen={clearAllAnalyticsOpen}
        onClose={() => {
          if (!clearingAllAnalytics) setClearAllAnalyticsOpen(false);
        }}
        onConfirm={clearAllAnalytics}
        title="پاککردنەوەی هەموو ئامارەکان"
        confirmLabel="بەڵێ، هەمووی پاک بکەوە"
        loadingLabel="پاکدەکرێتەوە..."
        cancelLabel="هەڵوەشاندنەوە"
        isDeleting={clearingAllAnalytics}
        message={
          <p>
            دڵنیایت لە پاککردنەوەی هەموو داتاکانی بینین و کلیکی پەڕەکانی
            لینکتری؟ ئەم کردارە ناگەڕێتەوە.
          </p>
        }
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        isDeleting={isDeleting}
        title="سڕینەوەی پەڕەی لینکتری"
        message={`دڵنیایت لە سڕینەوەی «${deleting?.name || "ئەم پەڕەیە"}»؟ بەستەرە گشتییەکەی بۆ هەمیشە نامێنێت.`}
        onConfirm={async () => {
          if (!deleting) return;
          setIsDeleting(true);
          try {
            await apiRequest(`${apiBase}/${deleting.id}`, { method: "DELETE" });
            setDeleting(null);
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
        publicPathPrefix={context?.publicPathPrefix || "/linktree"}
      />

      {duplicateTarget ? (
        <DuplicateLinktreeModal
          isOpen
          onClose={() => setDuplicateTarget(null)}
          targetLinktree={duplicateTarget}
          apiBase={apiBase}
          onSuccess={() => void load(true)}
        />
      ) : null}
    </ThemeProvider>
  );
}
