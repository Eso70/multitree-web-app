"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  LayoutTemplate,
  Link2,
  PanelsTopLeft,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useTemplateAccess } from "@/hooks/useTemplateAccess";
import { StatCard } from "@/components/shared/StatCard";
import { TEMPLATE_OPTIONS, type TemplateKey } from "@/lib/templates/config";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchModal } from "@/components/shared/SearchModal";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { SkeletonTemplatePage } from "@/components/shared/Skeleton";
import {
  SegmentedTabs,
  type SegmentedTab,
} from "@/components/shared/SegmentedTabs";
import { DynamicTemplate } from "@/components/templates/DynamicTemplate";
import { MonitorMockup } from "@/components/shared/MonitorMockup";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import type {
  LinktreePresentation as Linktree,
} from "@linktree/types";
import {
  createBusinessContactPreviewLinks,
  createLinktreeTemplatePreview,
  LINKTREE_TEMPLATE_PREVIEW_THEMES,
} from "@/components/templates/preview-fixtures";
import {
  TemplatePhonePreview,
  TemplatePreviewSkeleton,
} from "./TemplatePhonePreview";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

type TemplateCategory = "linktree" | "mini-website";

const TEMPLATE_CATEGORY_TABS: SegmentedTab<TemplateCategory>[] = [
  {
    id: "linktree",
    label: "قالبەکانی لینک تری",
    icon: Link2,
  },
  {
    id: "mini-website",
    label: "قالبەکانی مینی وێبسایت",
    icon: PanelsTopLeft,
  },
];

const SAMPLE_LINKS = createBusinessContactPreviewLinks();

const LinktreeTemplatePreview = memo(function LinktreeTemplatePreview({
  templateId,
  templateName,
  locked,
}: {
  templateId: TemplateKey;
  templateName: string;
  locked?: boolean;
}) {
  const linktree = useMemo<Linktree>(
    () => createLinktreeTemplatePreview({ templateId }),
    [templateId],
  );

  const darkTheme = useMemo(() => {
    return LINKTREE_TEMPLATE_PREVIEW_THEMES[templateId].from !== "#ffffff";
  }, [templateId]);

  return (
    <TemplatePhonePreview
      name={templateName}
      ariaLabel={`${templateName} mobile preview`}
      darkTheme={darkTheme}
      locked={locked}
    >
      {(isNear) =>
        isNear ? (
          <div
            className="h-full overflow-hidden"
            style={
              {
                "--business-website-color": "#b6f20d",
              } as React.CSSProperties
            }
          >
            <DynamicTemplate
              linktree={linktree}
              links={SAMPLE_LINKS}
              theme={LINKTREE_TEMPLATE_PREVIEW_THEMES[templateId]}
              onLinkClick={(_linkId: string, url: string) => {
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            />
          </div>
        ) : (
          <TemplatePreviewSkeleton />
        )
      }
    </TemplatePhonePreview>
  );
});

const EmptyMiniWebsiteTemplatePreview = memo(function EmptyMiniWebsiteTemplatePreview() {
  return (
    <MonitorMockup
      name=""
      ariaLabel="Empty mini website template monitor"
      deferContent={false}
    >
      <div aria-hidden="true" className="h-[1000px] bg-white dark:bg-[#161B22]" />
    </MonitorMockup>
  );
});

export function TemplatesPage({ canCreate = true }: { canCreate?: boolean }) {
  const { isLoading, isTemplateAllowed, refresh } = useTemplateAccess(!canCreate);
  const [category, setCategory] = useState<TemplateCategory>("linktree");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  useRegisterBusinessDashboardRefresh("templates", () =>
    refresh({ rethrow: true }),
  );

  const activeTemplates = useMemo(
    () => (category === "linktree" ? TEMPLATE_OPTIONS : []),
    [category],
  );

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return activeTemplates;

    return activeTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.id.toLowerCase().includes(query),
    );
  }, [activeTemplates, searchQuery]);

  const availableTemplateCount = useMemo(
    () =>
      category === "mini-website"
        ? 0
        : TEMPLATE_OPTIONS.filter((template) =>
            isTemplateAllowed(template.id),
          ).length,
    [category, isTemplateAllowed],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "k") return;
      event.preventDefault();
      setIsSearchModalOpen((open) => !open);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const changeCategory = (nextCategory: TemplateCategory) => {
    setCategory(nextCategory);
    setSearchQuery("");
    setIsSearchModalOpen(false);
  };

  const selectSearchResult = (templateId: string) => {
    const element = document.getElementById(
      `template-${category}-${templateId}`,
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-4", "ring-indigo-500/50");
      window.setTimeout(
        () => element.classList.remove("ring-4", "ring-indigo-500/50"),
        2000,
      );
    }
    setIsSearchModalOpen(false);
  };

  if (isLoading) return <SkeletonTemplatePage />;

  return (
    <section
      className="w-full min-w-0 space-y-4 pb-8 sm:space-y-6 sm:pb-10"
      dir="ltr"
    >
      <StatCardGrid>
        <StatCard
          icon={LayoutTemplate}
          label="کۆی قالبەکان"
          value={activeTemplates.length}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="بەردەستەکان"
          value={availableTemplateCount}
          color="green"
        />
        <StatCard
          icon={Link2}
          label="قالبی لینک تری"
          value={TEMPLATE_OPTIONS.length}
          color="purple"
        />
        <StatCard
          icon={PanelsTopLeft}
          label="قالبی مینی وێبسایت"
          value={0}
          color="orange"
        />
      </StatCardGrid>

      <SegmentedTabs
        tabs={TEMPLATE_CATEGORY_TABS}
        value={category}
        onChange={changeCategory}
        fullWidth
      />

      <DashboardSurface
        as="div"
        className="min-w-0 space-y-4 overflow-hidden sm:space-y-6"
      >
        <PageHeader
          title="قالبەکان"
          description="قالبەکانی لینک تری و مینی وێبسایت ببینە و دیزاینەکان پێشبینی بکە."
          icon={LayoutTemplate}
          action={
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  searchQuery.trim()
                    ? setSearchQuery("")
                    : setIsSearchModalOpen(true)
                }
                className={`group relative flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-xl border px-0 shadow-sm transition-all hover:shadow ${
                  searchQuery.trim()
                    ? "w-10 flex-none"
                    : "flex-1 sm:w-44 sm:flex-none sm:justify-between sm:px-3.5"
                } ${
                  isSearchModalOpen
                    ? "sa-soft sa-soft-border"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
                title={
                  searchQuery.trim()
                    ? "پاککردنەوەی گەڕان"
                    : "گەڕان (Ctrl+K)"
                }
              >
                {searchQuery.trim() ? (
                  <X className="h-4 w-4 text-slate-500 transition-transform group-hover:scale-110 dark:text-gray-400" />
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <Search className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:scale-110 dark:text-gray-500" />
                      <span className="hidden truncate text-xs font-semibold text-slate-400 transition-colors group-hover:text-slate-600 dark:text-gray-500 dark:group-hover:text-gray-300 sm:inline">
                        گەڕان...
                      </span>
                    </div>
                    <kbd className="hidden items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 font-sans text-[8px] font-bold text-slate-400 dark:bg-white/10 dark:text-gray-500 sm:inline-flex">
                      <span>Ctrl</span>
                      <span>K</span>
                    </kbd>
                  </>
                )}
              </button>

              {canCreate && (
                <button
                  type="button"
                  data-create-template
                  onClick={() =>
                    alert(
                      category === "linktree"
                        ? "زیادکردنی قالبی لینک تری بەم نزیکانە زیاد دەکرێت"
                        : "زیادکردنی قالبی مینی وێبسایت بەم نزیکانە زیاد دەکرێت",
                    )
                  }
                  className="sa-gradient sa-gradient-hover group relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-0 text-xs font-bold text-white shadow-md transition-all duration-300 sm:w-auto sm:px-4 sm:text-sm"
                >
                  <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>زیادکردنی قالب</span>
                </button>
              )}
            </div>
          }
        />

        <div
          className="border-t border-slate-100 pt-4 dark:border-white/5 sm:pt-6"
          data-template-category={category}
        >
          {category === "mini-website" ? (
            <div className="mx-auto w-full max-w-5xl py-2 sm:py-4">
              <EmptyMiniWebsiteTemplatePreview />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/20 py-12 text-center text-slate-400 shadow-sm dark:border-white/5 dark:bg-white/5 dark:text-gray-500">
              <Search className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>هیچ قالبێک نەدۆزرایەوە</p>
              <p className="mt-1 text-xs">
                دووبارە گەڕان بکەرەوە بە وشەیەکی تر
              </p>
            </div>
          ) : (
            <div
              className={`grid w-full min-w-0 grid-cols-1 gap-4 ${
                category === "linktree" ? "lg:grid-cols-2 2xl:grid-cols-3" : ""
              }`}
            >
              {filteredTemplates.map((template) => (
                <article
                  id={`template-linktree-${template.id}`}
                  key={template.id}
                  className="group min-w-0 rounded-2xl px-0 pb-3 text-center transition duration-300 hover:-translate-y-0.5 [contain-intrinsic-size:260px_610px] [content-visibility:auto] sm:px-1 sm:[contain-intrinsic-size:330px_730px]"
                >
                  <LinktreeTemplatePreview
                    templateId={template.id as TemplateKey}
                    templateName={template.name}
                    locked={!canCreate && !isTemplateAllowed(template.id)}
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      </DashboardSurface>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        placeholder={
          category === "linktree"
            ? "ناوی قالبی لینک تری بنووسە..."
            : "ناوی قالبی مینی وێبسایت بنووسە..."
        }
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      >
        {!searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-slate-400 select-none dark:text-gray-500 sm:text-sm">
            <Search className="sa-accent-text h-5 w-5 opacity-40" />
            <span>گەڕان بۆ قالبەکان بکە...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400 dark:text-gray-500">
            هیچ ئەنجامێک نەدۆزرایەوە بۆ &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filteredTemplates.map((template) => {
              const ResultIcon =
                category === "linktree" ? Link2 : PanelsTopLeft;

              return (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => selectSearchResult(template.id)}
                  className="group flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 text-left transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-gray-300">
                      <ResultIcon className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold leading-tight text-slate-700 transition-colors group-hover:text-indigo-500 dark:text-gray-200">
                        {template.name}
                      </span>
                      <span className="mt-1 text-xs leading-none text-slate-400 dark:text-gray-500">
                        {template.id}
                      </span>
                    </div>
                  </div>
                  <span className="translate-x-1 pl-2 text-xs font-semibold text-indigo-500 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    پیشاندان ←
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </SearchModal>
    </section>
  );
}
