"use client";

import { PublicMarketingHero } from "@/components/public/PublicMarketingHero";

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
    <PublicMarketingHero
      accentColor={accentColor}
      title={title}
      description={description}
      embedded={embedded}
    />
  );
}
