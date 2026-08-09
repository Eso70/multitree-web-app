"use client";

import { BusinessHeroAccentBackdrop } from "@/components/business/BusinessHeroAccentBackdrop";

interface AdvertisingHeroSectionProps {
  title: string;
  description?: string;
  accentColor: string;
  embedded?: boolean;
}

export function AdvertisingHeroSection({
  title,
  description = "ڤیدیۆکانت بگەیەنە بە بینەری زیاتر و کڕیاری ڕاستەقینە لە ڕێگای سپۆنسەری فەرمی تیکتۆکەوە بە ئەد ئەکاونتی فەرمی تیکتۆک",
  accentColor,
  embedded = false,
}: AdvertisingHeroSectionProps) {
  return (
    <section
      className={`relative overflow-hidden bg-transparent px-5 pb-20 text-center sm:px-8 sm:pb-24 ${
        embedded ? "pt-20" : "pt-36 sm:pt-40"
      }`}
    >
      <BusinessHeroAccentBackdrop accentColor={accentColor} />
      <div className="relative mx-auto max-w-4xl">
        <h1 className="mx-auto max-w-4xl break-words text-[clamp(2.6rem,5.8vw,5.5rem)] font-medium leading-[1.06] tracking-[-0.045em] text-balance [overflow-wrap:anywhere]">
          {title}
        </h1>
        <p className="mx-auto mt-7 max-w-2xl break-words text-base leading-8 text-black/55 [overflow-wrap:anywhere] dark:text-white/55 sm:text-lg sm:leading-9">
          {description}
        </p>
      </div>
    </section>
  );
}
