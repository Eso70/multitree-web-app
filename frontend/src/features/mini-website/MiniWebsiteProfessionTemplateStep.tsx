"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Check,
  Dumbbell,
  GraduationCap,
  Hammer,
  HeartPulse,
  Landmark,
  LayoutGrid,
  Palette,
  Search,
  Tractor,
  Utensils,
} from "lucide-react";
import {
  PROFESSION_TEMPLATES,
  applyProfessionTemplate,
  type ProfessionTemplateCategoryKey,
} from "./profession-templates";
import type { MiniWebsiteDraft } from "./types";

type CategoryIcon = ComponentType<{ className?: string }>;

const CATEGORY_ICONS: Record<ProfessionTemplateCategoryKey, CategoryIcon> = {
  custom: LayoutGrid,
  education: GraduationCap,
  healthcare: HeartPulse,
  engineeringTechnology: Building2,
  businessProfessional: BriefcaseBusiness,
  tradesServices: Hammer,
  creativeMedia: Palette,
  hospitalityLifestyle: Utensils,
  transportAgriculture: Tractor,
  sports: Dumbbell,
  publicCommunity: Landmark,
  organizations: Building2,
};

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function MiniWebsiteProfessionTemplateStep({
  draft,
  onChange,
  error,
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const search = normalized(query);
  const visibleTemplates = useMemo(
    () =>
      PROFESSION_TEMPLATES.filter((template) => {
        if (!search) return true;
        return normalized(
          `${template.label} ${template.englishLabel} ${template.searchTerms}`,
        ).includes(search);
      }),
    [search],
  );

  return (
    <div className="space-y-5">
      <div dir="rtl">
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
          قالبێکبۆ پیشە یان بوارەکەت هەڵبژێرە
        </h3>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="گەڕان بە پیشە، پسپۆڕی یان بوار..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pl-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--theme-primary,#64748b)] dark:border-white/10 dark:bg-[#161B22] dark:text-slate-100"
          dir="auto"
        />
      </label>

      <div className="grid max-h-[25rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {visibleTemplates.map((template) => {
          const selected = draft.professionTemplate === template.key;
          const Icon = CATEGORY_ICONS[template.category];
          return (
            <button
              key={template.key}
              type="button"
              onClick={() =>
                onChange(applyProfessionTemplate(draft, template.key))
              }
              aria-pressed={selected}
              className={`group relative flex min-h-20 w-full items-center gap-3 rounded-2xl border p-3.5 text-right transition-all duration-200 ${
                selected
                  ? "shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161B22] dark:hover:border-white/20"
              }`}
              style={
                selected
                  ? {
                      borderColor: "var(--theme-primary, #64748b)",
                      backgroundColor:
                        "color-mix(in srgb, var(--theme-primary, #64748b) 8%, transparent)",
                    }
                  : undefined
              }
              dir="rtl"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--theme-primary, #64748b)" }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-800 dark:text-slate-100">
                  {template.label}
                </span>
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? "text-white"
                    : "border-slate-300 dark:border-white/20"
                }`}
                style={
                  selected
                    ? {
                        background: "var(--theme-primary, #64748b)",
                        borderColor: "var(--theme-primary, #64748b)",
                      }
                    : undefined
                }
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      {!visibleTemplates.length && (
        <div
          className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs font-bold text-slate-400 dark:border-white/10"
          dir="rtl"
        >
          هیچ تمپڵێک نەدۆزرایەوە؛ «پڕۆفایلی تایبەت» هەڵبژێرە و بەشەکان خۆت دیاری
          بکە.
        </div>
      )}

      {error && (
        <p className="text-[11px] font-bold text-red-500" dir="rtl">
          {error}
        </p>
      )}
    </div>
  );
}
