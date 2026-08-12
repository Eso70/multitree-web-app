"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  IdCard,
  LayoutGrid,
  MousePointerClick,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Target,
  TrendingUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/StatCard";
import { BusinessPageAnalyticsModal } from "@/components/business/BusinessPageAnalyticsModal";
import { SearchModal } from "@/components/shared/SearchModal";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { PageHeader } from "@/components/shared/PageHeader";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import { LinktreesGrid } from "@/components/business/LinktreesGrid";
import { LinktreesTable } from "@/components/business/LinktreesTable";
import { MiniWebsiteEditorModal } from "./MiniWebsiteEditorModal";
import {
  createMiniWebsiteDraft,
  type MiniWebsite,
  type MiniWebsiteDraft,
} from "./types";
import { useBusinessAnalyticsTotals } from "@/features/business/hooks/useBusinessAnalyticsTotals";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { AccentActionButton } from "@/components/shared/AccentActionButton";

type ViewMode = "grid" | "table";

export function MiniWebsitesPage({
  businessLogo = null,
  businessDefaultAvatar = null,
  websiteColor = "#b6f20d",
}: {
  businessLogo?: string | null;
  businessDefaultAvatar?: string | null;
  websiteColor?: string | null;
}) {
  const accent = websiteColor?.startsWith("#") ? websiteColor : "#b6f20d";
  const defaultAvatar =
    businessDefaultAvatar || businessLogo || "/images/DefaultAvatar.png";
  const [profiles, setProfiles] = useState<MiniWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MiniWebsiteDraft>(() =>
    createMiniWebsiteDraft({
      businessLogo,
      businessDefaultAvatar,
      accentColor: accent,
    }),
  );
  const [deleteTarget, setDeleteTarget] = useState<MiniWebsite | null>(null);
  const [analyticsTarget, setAnalyticsTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const {
    totals: analyticsTotals,
    hasData: hasAnalyticsData,
    isLoading: isAnalyticsLoading,
    isRefreshing: isAnalyticsRefreshing,
    refresh: refreshAnalytics,
  } = useBusinessAnalyticsTotals("mini_website");

  const loadProfiles = useCallback(
    async (quiet = false, rethrow = false) => {
      if (!quiet) setLoading(true);
      else setRefreshing(true);
      try {
        const response = await fetch("/api/mini-websites", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            payload?.message || "نەتوانرا مینی وێبسایتەکان باربکرێن",
          );
        const base = createMiniWebsiteDraft({
          businessLogo,
          businessDefaultAvatar,
        });
        setProfiles(
          Array.isArray(payload?.data)
            ? payload.data.map((profile: MiniWebsite) => ({
                ...profile,
                professionTemplate: profile.professionTemplate || "custom",
                backgroundStyle:
                  profile.backgroundStyle || base.backgroundStyle,
                avatar:
                  !profile.avatar ||
                  profile.avatar === "/images/DefaultAvatar.png"
                    ? defaultAvatar
                    : profile.avatar,
                content: {
                  ...base.content,
                  ...(profile.content || {}),
                  heroBackgroundType:
                    profile.content?.heroBackgroundType ||
                    (profile.cover
                      ? "image"
                      : profile.content?.heroYoutubeUrl
                        ? "video"
                        : "color"),
                  heroBackgroundColor:
                    profile.content?.heroBackgroundColor ||
                    profile.accentColor ||
                    base.content.heroBackgroundColor,
                },
                socialLinks: Array.isArray(profile.socialLinks)
                  ? profile.socialLinks
                  : [],
                sections: Array.isArray(profile.sections)
                  ? profile.sections
                  : base.sections,
                locations: Array.isArray(profile.locations)
                  ? profile.locations
                  : base.locations,
                // Every section that keeps its own rows has to be carried across
                // as well. Leaving one out did not just hide it in the editor —
                // saving then sent an empty list and wiped it.
                hours: Array.isArray(profile.hours)
                  ? profile.hours
                  : base.hours,
                gallery: Array.isArray(profile.gallery)
                  ? profile.gallery
                  : base.gallery,
                faq: Array.isArray(profile.faq) ? profile.faq : base.faq,
                services: Array.isArray(profile.services)
                  ? profile.services
                  : base.services,
                bookings: Array.isArray(profile.bookings)
                  ? profile.bookings
                  : base.bookings,
                team: Array.isArray(profile.team) ? profile.team : base.team,
                certificates: Array.isArray(profile.certificates)
                  ? profile.certificates
                  : base.certificates,
                videos: Array.isArray(profile.videos)
                  ? profile.videos
                  : base.videos,
                youtubeVideos: Array.isArray(profile.youtubeVideos)
                  ? profile.youtubeVideos
                  : base.youtubeVideos,
                stories: Array.isArray(profile.stories)
                  ? profile.stories
                  : base.stories,
                partners: Array.isArray(profile.partners)
                  ? profile.partners
                  : base.partners,
                reviews: Array.isArray(profile.reviews)
                  ? profile.reviews
                  : base.reviews,
                beforeAfter: Array.isArray(profile.beforeAfter)
                  ? profile.beforeAfter
                  : base.beforeAfter,
                coverage: Array.isArray(profile.coverage)
                  ? profile.coverage
                  : base.coverage,
                paymentMethods: Array.isArray(profile.paymentMethods)
                  ? profile.paymentMethods
                  : base.paymentMethods,
                specialOffers: Array.isArray(profile.specialOffers)
                  ? profile.specialOffers
                  : base.specialOffers,
                events: Array.isArray(profile.events)
                  ? profile.events
                  : base.events,
                audio: Array.isArray(profile.audio)
                  ? profile.audio
                  : base.audio,
                advantages: Array.isArray(profile.advantages)
                  ? profile.advantages
                  : base.advantages,
                impactStats: Array.isArray(profile.impactStats)
                  ? profile.impactStats
                  : base.impactStats,
                processSteps: Array.isArray(profile.processSteps)
                  ? profile.processSteps
                  : base.processSteps,
                documents: Array.isArray(profile.documents)
                  ? profile.documents
                  : base.documents,
                ownedProperties: Array.isArray(profile.ownedProperties)
                  ? profile.ownedProperties
                  : base.ownedProperties,
                education: Array.isArray(profile.education)
                  ? profile.education
                  : base.education,
                experience: Array.isArray(profile.experience)
                  ? profile.experience
                  : base.experience,
              }))
            : [],
        );
      } catch (error) {
        // Keep the last visible state when loading fails.
        if (rethrow) throw error;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [businessDefaultAvatar, businessLogo, defaultAvatar],
  );

  const refreshForDashboard = useCallback(
    async () => {
      await Promise.all([
        loadProfiles(true, true),
        refreshAnalytics({ rethrow: true }),
      ]);
    },
    [loadProfiles, refreshAnalytics],
  );
  useRegisterBusinessDashboardRefresh("mini-websites", refreshForDashboard);

  const filtered = useMemo(
    () =>
      profiles.filter((profile) =>
        `${profile.name} ${profile.slug} ${profile.headline}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [profiles, query],
  );
  const actionRate =
    analyticsTotals.total_views > 0
      ? (
          (analyticsTotals.total_clicks / analyticsTotals.total_views) *
          100
        ).toFixed(1)
      : "0.0";
  const displayProfiles = useMemo(
    () =>
      filtered.map((profile) => ({
        id: profile.id,
        image: profile.avatar || defaultAvatar,
        name: profile.name,
        subtitle: profile.headline,
        seo_name:
          profile.status === "published"
            ? "بڵاوکراوە"
            : profile.status === "paused"
              ? "ڕاگیراوە"
              : "ڕەشنووس",
        public_identifier: profile.slug,
        uid: profile.slug,
        created_at: profile.updatedAt,
        updated_at: profile.updatedAt,
        business_logo: businessLogo || undefined,
        analytics: {
          unique_views: profile.views,
          unique_clicks: profile.actions,
        },
      })),
    [businessLogo, defaultAvatar, filtered],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProfiles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProfiles]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const openCreate = () => {
    setEditorId(null);
    setDraft(
      createMiniWebsiteDraft({
        businessLogo,
        businessDefaultAvatar,
        accentColor: accent,
      }),
    );
    setEditorOpen(true);
  };
  const openEdit = (profile: MiniWebsite) => {
    const {
      id: _id,
      views: _views,
      actions: _actions,
      conversions: _conversions,
      updatedAt: _updatedAt,
      ...next
    } = profile;
    setEditorId(profile.id);
    setDraft(next);
    setEditorOpen(true);
  };
  const saveProfile = async (next: MiniWebsiteDraft) => {
    try {
      const response = await fetch(
        editorId ? `/api/mini-websites/${editorId}` : "/api/mini-websites",
        {
          method: editorId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload?.message || "پاشەکەوتکردن سەرکەوتوو نەبوو");
      setEditorOpen(false);
      await loadProfiles(true);
      toast.success(
        editorId ? "مینی وێبسایتەکە نوێکرایەوە" : "مینی وێبسایت دروستکرا",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "پاشەکەوتکردن سەرکەوتوو نەبوو";
      toast.error(
        message.toLowerCase().includes("slug")
          ? "ئەم لینکە پێشتر بەکارهاتووە"
          : /[\u0600-\u06ff]/.test(message)
            ? message
            : "پاشەکەوتکردن سەرکەوتوو نەبوو",
      );
    }
  };
  const findProfile = (id: string) =>
    profiles.find((profile) => profile.id === id);

  return (
    <div dir="ltr">
      <StatCardGrid columns={3} className="mb-8">
        <StatCard
          loading={loading || isAnalyticsLoading}
          icon={IdCard}
          label="کۆی مینی وێبسایتەکان"
          value={profiles.length}
          color="blue"
        />
        <StatCard
          loading={loading || isAnalyticsLoading}
          icon={Eye}
          label="کۆی بینینەکانی مینی وێبسایت"
          value={analyticsTotals.total_views}
          color="purple"
        />
        <StatCard
          loading={loading || isAnalyticsLoading}
          icon={Users}
          label="بینەری تاکی مینی وێبسایت"
          value={analyticsTotals.unique_views}
          color="slate"
        />
        <StatCard
          loading={loading || isAnalyticsLoading}
          icon={MousePointerClick}
          label="کۆی کردارەکانی مینی وێبسایت"
          value={analyticsTotals.total_clicks}
          color="green"
        />
        <StatCard
          loading={loading || isAnalyticsLoading}
          icon={Target}
          label="ڕێژەی کردار"
          value={`${actionRate}%`}
          color="orange"
        />
        <StatCard
          loading={loading || isAnalyticsLoading}
          icon={TrendingUp}
          label="گۆڕانەکانی مینی وێبسایت"
          value={analyticsTotals.conversions}
          color="pink"
        />
      </StatCardGrid>

      <DashboardSurface className="space-y-6">
        <PageHeader
          title="مینی وێبسایت"
          description="مینی وێبسایتی پیشەیی دروست و بەڕێوە ببە و بینین و کلیکەکانی هەر یەکێک چاودێری بکە."
          icon={IdCard}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await Promise.all(
                      profiles.map(async (profile) => {
                        const response = await fetch(
                          `/api/mini-websites/${profile.id}/analytics`,
                          { method: "DELETE", credentials: "include" },
                        );
                        if (!response.ok)
                          throw new Error("پاککردنەوە سەرکەوتوو نەبوو");
                      }),
                    );
                    await Promise.all([
                      loadProfiles(true),
                      refreshAnalytics(),
                    ]);
                    toast.success("ئامارەکان پاککرانەوە");
                  } catch {
                    toast.error("پاککردنەوەی ئامارەکان سەرکەوتوو نەبوو");
                  }
                }}
                disabled={
                  refreshing || isAnalyticsRefreshing || !hasAnalyticsData
                }
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-500 shadow-sm transition-all hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/20 dark:from-rose-500/10 dark:to-pink-500/10 dark:text-rose-400"
                title="پاککردنەوەی هەموو داتاکانی بینین و کلیک"
              >
                <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
              </button>
              <button
                type="button"
                onClick={() =>
                  void Promise.all([loadProfiles(true), refreshAnalytics()])
                }
                disabled={refreshing || isAnalyticsRefreshing}
                aria-busy={refreshing || isAnalyticsRefreshing}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:shadow dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                title="نوێکردنەوە"
              >
                <MotionSpinner active={refreshing || isAnalyticsRefreshing}><RefreshCw
                  className="h-4 w-4 -transform"
                 /></MotionSpinner>
              </button>
              <button
                type="button"
                onClick={() =>
                  query.trim() ? setQuery("") : setSearchOpen(true)
                }
                className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border px-0 shadow-sm transition-all duration-300 hover:shadow ${query.trim() ? "" : "sm:w-44 sm:justify-between sm:px-3.5"} ${searchOpen ? "text-slate-700 dark:text-gray-200" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"}`}
                style={
                  searchOpen
                    ? {
                        background:
                          "color-mix(in srgb, var(--theme-css, #64748b) 20%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--theme-css, #64748b) 35%, transparent)",
                        color: "var(--theme-css, #64748b)",
                      }
                    : undefined
                }
                title={query.trim() ? "پاککردنەوەی گەڕان" : "گەڕان (Ctrl+K)"}
              >
                {query.trim() ? (
                  <X className="h-4 w-4 text-slate-500 transition-transform group-hover:scale-110 dark:text-gray-400" />
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <Search className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:scale-110 dark:text-gray-500" />
                      <span className="hidden truncate text-xs font-semibold text-slate-400 transition-colors group-hover:text-slate-600 dark:text-gray-500 dark:group-hover:text-gray-300 sm:inline">
                        گەڕان...
                      </span>
                    </div>
                    <kbd className="hidden select-none items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 font-sans text-[8px] font-bold text-slate-400 dark:bg-white/10 dark:text-gray-500 sm:inline-flex">
                      <span>Ctrl</span>
                      <span>K</span>
                    </kbd>
                  </>
                )}
              </button>
              <div className="flex h-10 shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all duration-300 ${view === "grid" ? "text-white shadow-md" : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"}`}
                  style={
                    view === "grid"
                      ? { background: "var(--theme-css, #64748b)" }
                      : undefined
                  }
                  aria-label="پیشاندانی تۆڕی"
                  title="بینینی گرید"
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all duration-300 ${view === "table" ? "text-white shadow-md" : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"}`}
                  style={
                    view === "table"
                      ? { background: "var(--theme-css, #64748b)" }
                      : undefined
                  }
                  aria-label="پیشاندانی خشتەیی"
                  title="بینینی خشتە"
                >
                  <Table2 className="h-4 w-4 shrink-0" />
                </button>
              </div>
              <AccentActionButton
                onClick={openCreate}
                title="دروستکردنی مینی وێبسایتی نوێ"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>مینی وێبسایتی نوێ</span>
              </AccentActionButton>
            </div>
          }
        />
        <div className="border-t border-slate-100 pt-6 dark:border-white/5">
          {view === "grid" ? (
            <LinktreesGrid
              publicPathPrefix="/bio"
              data={displayProfiles}
              isLoading={loading}
              emptyTitle="هیچ مینی وێبسایتێک نەدۆزرایەوە"
              emptyDescription="دەست پێ بکە بە دروستکردنی یەکەم مینی وێبسایت"
              onEdit={(id) => {
                const profile = findProfile(id);
                if (profile) openEdit(profile);
              }}
              onDelete={(id) => {
                const profile = findProfile(id);
                if (profile) setDeleteTarget(profile);
              }}
              onViewAnalytics={(id, name) => setAnalyticsTarget({ id, name })}
            />
          ) : (
            <LinktreesTable
              publicPathPrefix="/bio"
              data={displayProfiles}
              isLoading={loading}
              emptyTitle="هیچ مینی وێبسایتێک نەدۆزرایەوە"
              onEdit={(id) => {
                const profile = findProfile(id);
                if (profile) openEdit(profile);
              }}
              onDelete={(id) => {
                const profile = findProfile(id);
                if (profile) setDeleteTarget(profile);
              }}
              onViewAnalytics={(id, name) => setAnalyticsTarget({ id, name })}
            />
          )}
        </div>
      </DashboardSurface>

      {analyticsTarget && (
        <BusinessPageAnalyticsModal
          isOpen
          onClose={() => setAnalyticsTarget(null)}
          pageId={analyticsTarget.id}
          pageName={analyticsTarget.name}
          pageKind="mini_website"
        />
      )}

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        placeholder="ناوی مینی وێبسایت بنووسە بۆ گەڕان..."
        searchQuery={query}
        onSearchQueryChange={setQuery}
      >
        {filtered.slice(0, 6).map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => {
              setSearchOpen(false);
              openEdit(profile);
            }}
            className="group flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 text-left transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                <IdCard className="h-4 w-4 text-slate-400" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                  {profile.name}
                </span>
                <span
                  className="mt-0.5 block truncate text-[10px] text-slate-400"
                  dir="ltr"
                >
                  /bio/{profile.slug}
                </span>
              </span>
            </div>
          </button>
        ))}
      </SearchModal>
      <MiniWebsiteEditorModal
        isOpen={editorOpen}
        initial={draft}
        editorId={editorId}
        defaultAvatar={defaultAvatar}
        onClose={() => setEditorOpen(false)}
        onSave={saveProfile}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const response = await fetch(
            `/api/mini-websites/${deleteTarget.id}`,
            { method: "DELETE", credentials: "include" },
          );
          if (!response.ok) throw new Error("سڕینەوە سەرکەوتوو نەبوو");
          setDeleteTarget(null);
          await Promise.all([loadProfiles(true), refreshAnalytics()]);
          toast.success("مینی وێبسایتەکە سڕایەوە");
        }}
        title="سڕینەوەی مینی وێبسایت"
        message={`دڵنیایت لە سڕینەوەی “${deleteTarget?.name || ""}”؟ ئەم کردارە ناگەڕێتەوە.`}
        confirmLabel="سڕینەوە"
      />
    </div>
  );
}
