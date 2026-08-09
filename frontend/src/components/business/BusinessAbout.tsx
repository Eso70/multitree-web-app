import {
  BUSINESS_LANDING_DECORATION_COLORS,
  BUSINESS_LANDING_DECORATION_LABELS,
  BUSINESS_LANDING_SECTION_IDS,
} from "@/components/business/business-landing-sections";
import { BUSINESS_PROFILE_CARD_PALETTE } from "@/components/business/business-profile-palette";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";

interface BusinessAboutProps {
  accentColor: string;
  title?: string;
  description?: string;
  campaignDescription?: string;
}

export function BusinessAbout({
  accentColor,
  title = "دەربارەی ئێمە",
  description =
    "لێرە دەتوانیت پەڕە فەرمییەکان، لینکە گرنگەکان و ڕێگاکانی پەیوەندی لە یەک شوێندا بدۆزیتەوە",
  campaignDescription =
    "ئەم شوێنە بۆ ناساندنی کارەکانمان لە تیکتۆک و ڕیکلامەکانی تیکتۆک ئەدس بەکاردێت؛ لێرە دەتوانیت لینکە پەیوەندیدارەکان، پەڕە تایبەتەکان و زانیاریی پەیوەندی بە ڕوونی بدۆزیتەوە.",
}: BusinessAboutProps) {
  const profileTypes = [
    ["TikTok Ads", BUSINESS_PROFILE_CARD_PALETTE.tiktokAds.color],
    ["Linktree", BUSINESS_PROFILE_CARD_PALETTE.linktree.color],
    ["Mini Website", BUSINESS_PROFILE_CARD_PALETTE.miniWebsite.color],
  ] as const;

  return (
    <section
      id={BUSINESS_LANDING_SECTION_IDS.about}
      aria-labelledby="business-about-title"
      className="relative scroll-mt-24 overflow-hidden bg-transparent px-5 py-24 text-[#111827] dark:text-white sm:px-8 sm:py-28 lg:py-32"
    >
      <BusinessSectionDecorations
        colors={BUSINESS_LANDING_DECORATION_COLORS.about}
        labels={BUSINESS_LANDING_DECORATION_LABELS.about}
        variant={3}
      />
      <div className="relative mx-auto max-w-7xl">
        <header className="mx-auto max-w-4xl text-center">
          <h2
            id="business-about-title"
            className="break-words text-[clamp(2.35rem,5vw,4.9rem)] font-medium leading-[1.06] tracking-[-0.04em] text-balance [overflow-wrap:anywhere]"
          >
            {title}
          </h2>
        </header>

        <div className="relative mx-auto mt-16 max-w-5xl rounded-[2rem] border border-black/10 bg-[#f4f5f6] px-7 py-12 text-center shadow-[0_34px_100px_-60px_rgba(15,23,42,.48)] dark:border-white/10 dark:bg-[#151719] dark:shadow-[0_38px_110px_-62px_rgba(0,0,0,.88)] sm:mt-20 sm:px-11 sm:py-16 lg:px-16 lg:py-20">
          <p className="mx-auto max-w-3xl break-words text-[clamp(1.35rem,2.2vw,2.2rem)] font-medium leading-[1.55] tracking-[-0.02em] text-black/72 [overflow-wrap:anywhere] dark:text-white/74">
            {description}
          </p>

          <div className="mx-auto mt-9 max-w-3xl border-t border-black/10 pt-9 dark:border-white/10">
            <p className="break-words text-base leading-8 text-black/52 [overflow-wrap:anywhere] dark:text-white/52 sm:text-lg sm:leading-9">
              {campaignDescription}
            </p>

            <div
              aria-hidden="true"
              className="mt-8 flex items-center justify-center gap-2 text-black/22 dark:text-white/24"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span className="h-px w-10 bg-current sm:w-14" />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span className="h-px w-10 bg-current sm:w-14" />
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-xs font-semibold tracking-[0.1em] sm:gap-x-6">
              {profileTypes.map(([label, color], index) => (
                <span key={label} className="contents">
                  {index > 0 ? (
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full bg-black/18 dark:bg-white/20"
                    />
                  ) : null}
                  <span style={{ color }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
