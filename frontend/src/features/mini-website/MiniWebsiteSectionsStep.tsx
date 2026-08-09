"use client";

import { memo, useMemo, useState } from "react";
import {
  Award,
  BadgeCheck,
  BadgePercent,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Check,
  CirclePlay,
  ClipboardList,
  Clock3,
  Columns2,
  GraduationCap,
  HelpCircle,
  Headphones,
  Handshake,
  Images,
  Languages,
  MapPin,
  ListChecks,
  CreditCard,
  Crown,
  Files,
  Search,
  Share2,
  Star,
  Users,
  Video,
  WalletCards,
  Youtube,
} from "lucide-react";
import { PlatformSelectionStep } from "@/features/link-editor/components/PlatformSelectionStep";
import {
  MINI_WEBSITE_SECTIONS,
  type MiniWebsiteDraft,
  type MiniWebsiteSectionKey,
} from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

/**
 * Only the sections currently offered need an icon; the key union is wider.
 *
 * Exported so the third step draws each block with the same mark the picker
 * used — the two views of a section are otherwise easy to let drift apart.
 */
export const SECTION_ICONS: Partial<
  Record<MiniWebsiteSectionKey, typeof MapPin>
> = {
  socials: Share2,
  location: MapPin,
  hours: Clock3,
  gallery: Images,
  faq: HelpCircle,
  services: BriefcaseBusiness,
  booking: CalendarDays,
  team: Users,
  credentials: Award,
  shortVideos: Video,
  youtubeVideos: Youtube,
  stories: CirclePlay,
  partners: Handshake,
  reviews: Star,
  beforeAfter: Columns2,
  serviceAreas: Languages,
  payments: CreditCard,
  offers: BadgePercent,
  events: CalendarRange,
  audio: Headphones,
  whyChooseUs: BadgeCheck,
  impactStats: ChartNoAxesCombined,
  process: ListChecks,
  documents: Files,
  ownedProperties: Crown,
  education: GraduationCap,
  experience: BriefcaseBusiness,
  leadForm: ClipboardList,
  pricing: WalletCards,
};

function isEnabled(
  draft: MiniWebsiteDraft,
  key: MiniWebsiteSectionKey,
): boolean {
  return draft.sections.some(
    (section) => section.key === key && section.enabled,
  );
}

/**
 * One selectable section. Kept deliberately generic — a new section only needs
 * an entry in `MINI_WEBSITE_SECTIONS` and an icon to appear here.
 */
const SectionCard = memo(function SectionCard({
  label,
  icon: Icon,
  selected,
  onToggle,
}: {
  label: string;
  icon: typeof MapPin;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group relative flex w-full items-start gap-3 rounded-2xl border p-4 text-right transition-all duration-200 ${
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
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: "var(--theme-primary, #64748b)" }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 self-center">
        <span className="block text-sm font-black text-slate-800 dark:text-slate-100">
          {label}
        </span>
      </span>
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          selected ? "text-white" : "border-slate-300 dark:border-white/20"
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
});

/**
 * Step two of the mini website editor: choose which sections the page shows,
 * then configure the ones that are on.
 *
 * Replaces the old platform-only step. Social platforms are now one section
 * among others rather than the whole step, so further sections slot in without
 * reshaping the wizard.
 */
export function MiniWebsiteSectionsStep({
  draft,
  onChange,
  onTogglePlatform,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  onTogglePlatform: (platformId: string) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const [query, setQuery] = useState("");
  const visibleSections = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return MINI_WEBSITE_SECTIONS;
    return MINI_WEBSITE_SECTIONS.filter((section) =>
      `${section.label} ${section.key}`.toLocaleLowerCase().includes(search),
    );
  }, [query]);

  const toggleSection = (key: MiniWebsiteSectionKey) => {
    const enabled = isEnabled(draft, key);
    const next = draft.sections.filter((section) => section.key !== key);
    next.push({ key, enabled: !enabled });

    onChange({
      ...draft,
      sections: next,
      // Turning socials off clears the links, so a hidden section cannot keep
      // publishing destinations the business thinks are gone.
      ...(key === "socials" && enabled ? { socialLinks: [] } : {}),
    });
  };

  const socialsOn = isEnabled(draft, "socials");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
          بەشەکانی مینی وێبسایت
        </h3>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">
          ئەو بەشانە هەڵبژێرە کە دەتەوێت لە پەڕەکەت پیشان بدرێن.
        </p>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="گەڕان بە ناوی بەش..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pl-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--theme-primary,#64748b)] dark:border-white/10 dark:bg-[#161B22] dark:text-slate-100"
          dir="auto"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleSections.map((section) => (
          <SectionCard
            key={section.key}
            label={section.label}
            icon={SECTION_ICONS[section.key] ?? MapPin}
            selected={isEnabled(draft, section.key)}
            onToggle={() => toggleSection(section.key)}
          />
        ))}
      </div>

      {!visibleSections.length && (
        <p
          className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs font-bold text-slate-400 dark:border-white/10"
          dir="rtl"
        >
          هیچ بەشێک نەدۆزرایەوە.
        </p>
      )}

      {errors.sections && (
        <p className="text-[11px] font-bold text-red-500">{errors.sections}</p>
      )}

      {socialsOn && (
        <section className="border-t border-slate-100 pt-6 dark:border-white/5">
          <PlatformSelectionStep
            socialLinks={draft.socialLinks}
            error={errors.platforms}
            touched={Boolean(errors.platforms)}
            onTogglePlatform={onTogglePlatform}
          />
        </section>
      )}
    </div>
  );
}
