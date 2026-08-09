import type { CSSProperties } from "react";
import {
  BUSINESS_LANDING_DECORATION_COLORS,
  BUSINESS_LANDING_DECORATION_LABELS,
  BUSINESS_LANDING_SECTION_HREFS,
} from "@/components/business/business-landing-sections";
import { getMultiTreeAccentInk } from "@/lib/multitree-theme";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { BusinessHeroAccentBackdrop } from "@/components/business/BusinessHeroAccentBackdrop";

interface BusinessHeroProps {
  accentColor: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function BusinessHero({
  accentColor,
  title = "هەموو زانیارییەکانت لەناو یەک پەڕەی دیجیتاڵی",
  description =
    "لە یەک شوێنی متمانەپێکراوەوە پەڕە فەرمییەکان، ماڵپەڕەکان و ڕێگاکانی پەیوەندیی ببینە",
  actionLabel = "پەڕەی ئەو کەسانە ببینە کە بەشدارییان کردووە",
  actionHref = BUSINESS_LANDING_SECTION_HREFS.workspace,
}: BusinessHeroProps) {
  return (
    <section
      aria-labelledby="business-hero-title"
      className="relative overflow-hidden text-[#111827] dark:text-white"
    >
      <BusinessHeroAccentBackdrop accentColor={accentColor} />
      <BusinessSectionDecorations
        colors={BUSINESS_LANDING_DECORATION_COLORS.hero}
        labels={BUSINESS_LANDING_DECORATION_LABELS.hero}
        variant={0}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-4 pt-40 text-center sm:px-8 sm:pb-8 sm:pt-48 lg:pb-8 lg:pt-56">
        <h1
          id="business-hero-title"
          className="max-w-4xl break-words text-[clamp(2.75rem,6vw,5.5rem)] font-medium leading-[1.08] tracking-[-0.035em] text-balance [overflow-wrap:anywhere]"
        >
          {title}
        </h1>
        <p className="mt-7 max-w-2xl break-words text-base leading-8 text-gray-600 [overflow-wrap:anywhere] dark:text-white/58 sm:text-lg sm:leading-9">
          {description}
        </p>
        <a
          href={actionHref}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl px-7 py-3 text-sm font-semibold shadow-[0_10px_30px_rgba(15,23,42,.16)] transition-opacity hover:opacity-88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f8f9fa] dark:shadow-[0_12px_32px_rgba(0,0,0,.3)] dark:focus-visible:ring-offset-[#0b0d0e]"
          style={
            {
              backgroundColor: accentColor,
              color: getMultiTreeAccentInk(accentColor),
              "--tw-ring-color": accentColor,
            } as CSSProperties
          }
        >
          {actionLabel}
        </a>
      </div>
    </section>
  );
}
