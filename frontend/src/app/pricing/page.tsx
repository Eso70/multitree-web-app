import type { Metadata } from "next";
import { SponsorKrdMarketingShell } from "@/features/public-site/SponsorKrdMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { PricingSection } from "@/features/public-site/PricingSection";
import { FaqSection } from "@/features/public-site/FaqSection";

export const metadata: Metadata = {
  title: "نرخەکان | Sponsor.krd",
  description: "زانیاری تاقیکردنەوە و پلانی Creator لە Sponsor.krd",
};
export default function PricingPage() {
  return (
    <SponsorKrdMarketingShell>
      <MarketingPageHero
        eyebrow="نرخەکان"
        title="ڕوون، بێ نرخ و بەڵێنی ساختە"
        description="سەرەتا تاقی بکەرەوە؛ نرخە ڕاستەقینەکان تەنها کاتێک پیشان دەدرێن کە billing ئامادە و بڵاوکرابێتەوە"
      />
      <PricingSection />
      <FaqSection />
    </SponsorKrdMarketingShell>
  );
}
