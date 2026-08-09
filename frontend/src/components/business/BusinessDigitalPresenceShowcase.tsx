"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Link2,
  Megaphone,
  PanelsTopLeft,
  type LucideIcon,
} from "lucide-react";
import { getMultiTreeAccentInk } from "@/lib/multitree-theme";
import { BusinessCardPreview } from "@/components/business/BusinessCardPreview";
import { BusinessCardStack } from "@/components/business/BusinessCardStack";
import { BUSINESS_PROFILE_CARD_PALETTE } from "@/components/business/business-profile-palette";
import {
  BUSINESS_LANDING_DECORATION_COLORS,
  BUSINESS_LANDING_DECORATION_LABELS,
  BUSINESS_LANDING_SECTION_IDS,
} from "@/components/business/business-landing-sections";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";

export interface BusinessSmartProfileFeature {
  title: string;
  description: string;
  previewTitle: string;
  previewLabel: string;
  color: string;
  surfaceFrom: string;
  surfaceTo: string;
  foreground: string;
  icon: LucideIcon;
}

interface BusinessDigitalPresenceShowcaseProps {
  accentColor: string;
  businessName: string;
  title?: string;
  description?: string;
  items?: ReadonlyArray<BusinessSmartProfileFeature>;
}

const defaultFeatures: ReadonlyArray<BusinessSmartProfileFeature> = [
  {
    title: "لینکتری بۆ هەموو لینکەکانت",
    description:
      "هەموو لینکە گرنگەکان، پەڕەکانی سۆشیاڵ میدیا و ڕێگاکانی پەیوەندی لە یەک پەڕەی خێرا و ڕێکخراودا کۆبکەرەوە.",
    previewTitle: "هەموو لینکەکان لە یەک شوێندا",
    previewLabel: "Linktree",
    ...BUSINESS_PROFILE_CARD_PALETTE.linktree,
    icon: Link2,
  },
  {
    title: "ماڵپەڕی بچووک بۆ ناساندن",
    description:
      "چیرۆک، خزمەتگوزاری و زانیارییە گرنگەکانت لە ماڵپەڕێکی کورت و پرۆفیشناڵدا بە شێوازی خۆت پیشان بدە.",
    previewTitle: "ناسنامەی دیجیتاڵی تەواو",
    previewLabel: "Mini Website",
    ...BUSINESS_PROFILE_CARD_PALETTE.miniWebsite,
    icon: PanelsTopLeft,
  },
  {
    title: "لە TikTok Ads ـەوە بۆ پەڕەی دروست",
    description:
      "سەردانکەری ڕیکلام ڕاستەوخۆ بگەیەنە پەڕەیەکی ڕوون کە ناوەڕۆک و پەیامی TikTok Ads ـەکەت تەواو دەکات.",
    previewTitle: "ڕێڕەوی ڕوونی سەردانکەر",
    previewLabel: "TikTok Ads",
    ...BUSINESS_PROFILE_CARD_PALETTE.tiktokAds,
    icon: Megaphone,
  },
];

export function BusinessDigitalPresenceShowcase({
  accentColor,
  businessName,
  title = "لە یەک سەردانەوە، ڕێگای دروست پیشان بدە",
  description =
    "پەڕەیەکی گشتی کە سەردانکەرانی تیکتۆک و کەناڵەکانی تر بە خێرایی لە ڕیکلامەوە دەگوازێتەوە بۆ ناساندن، ناوەڕۆک و پەیوەندی",
  items = defaultFeatures,
}: BusinessDigitalPresenceShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const safeIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const activeFeature = items[safeIndex];

  if (!activeFeature) return null;

  const ActiveIcon = activeFeature.icon;
  const activeInk = getMultiTreeAccentInk(activeFeature.color);

  return (
    <section
      id={BUSINESS_LANDING_SECTION_IDS.digitalPresence}
      aria-labelledby="business-digital-presence-title"
      className="relative scroll-mt-24 overflow-hidden bg-transparent px-5 py-24 text-[#111827] dark:text-white sm:px-8 sm:py-28 lg:py-32"
    >
      <BusinessSectionDecorations
        colors={BUSINESS_LANDING_DECORATION_COLORS.digitalPresence}
        labels={BUSINESS_LANDING_DECORATION_LABELS.digitalPresence}
        variant={4}
      />
      <div
        aria-hidden="true"
        className="absolute left-[-12rem] top-1/3 h-96 w-96 rounded-full opacity-[0.075] blur-[130px] dark:opacity-[0.09]"
        style={{ backgroundColor: accentColor }}
      />

      <div className="relative mx-auto max-w-7xl">
        <header className="mx-auto max-w-4xl text-center">
          <h2
            id="business-digital-presence-title"
            className="break-words text-[clamp(2.35rem,5vw,4.9rem)] font-medium leading-[1.06] tracking-[-0.04em] text-balance [overflow-wrap:anywhere]"
          >
            {title}
          </h2>
          <p className="mx-auto mt-7 max-w-3xl break-words text-base leading-8 text-black/55 [overflow-wrap:anywhere] dark:text-white/55 sm:text-lg sm:leading-9">
            {description}
          </p>
        </header>

        <div className="mt-16 grid items-start gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.92fr)] lg:gap-14">
          <div className="relative min-h-[25rem] sm:min-h-[31rem]">
            <BusinessCardStack
              businessName={businessName}
              items={items.map((item) => ({
                title: item.title,
                label: item.previewLabel,
                color: item.color,
                surfaceFrom: item.surfaceFrom,
                surfaceTo: item.surfaceTo,
                foreground: item.foreground,
                icon: item.icon,
              }))}
              activeIndex={safeIndex}
              onSelect={setActiveIndex}
            />
          </div>

          <div className="lg:sticky lg:top-24">
            <article
              id="business-feature-detail"
              aria-live="polite"
              className="overflow-hidden rounded-[2rem] border border-black/9 bg-white/78 shadow-[0_28px_80px_-48px_rgba(15,23,42,.42)] backdrop-blur-xl dark:border-white/9 dark:bg-white/[0.055] dark:shadow-[0_30px_86px_-48px_rgba(0,0,0,.85)]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`details-${activeFeature.title}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        backgroundColor: activeFeature.color,
                        color: activeInk,
                      }}
                    >
                      <ActiveIcon className="h-3.5 w-3.5" />
                      {activeFeature.previewLabel}
                    </span>
                    <span className="text-xs tabular-nums text-black/35 dark:text-white/35">
                      {String(safeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-7 break-words text-3xl font-medium leading-tight tracking-[-0.025em] [overflow-wrap:anywhere] sm:text-4xl">
                    {activeFeature.title}
                  </h3>
                  <p className="mt-5 break-words text-sm leading-7 text-black/55 [overflow-wrap:anywhere] dark:text-white/52 sm:text-base sm:leading-8">
                    {activeFeature.description}
                  </p>
                </div>
                </motion.div>
              </AnimatePresence>

              <div className="border-t border-black/8 bg-black/[0.025] p-5 dark:border-white/8 dark:bg-black/12 sm:p-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`preview-${activeFeature.title}`}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.985 }}
                    transition={{ duration: 0.28 }}
                  >
                  <BusinessCardPreview
                    businessName={businessName}
                    title={activeFeature.previewTitle}
                    label={activeFeature.previewLabel}
                    description={activeFeature.description}
                    accentColor={activeFeature.color}
                    secondaryAccent="#64748b"
                    icon={ActiveIcon}
                    iconColor={activeInk}
                  />
                  </motion.div>
                </AnimatePresence>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
