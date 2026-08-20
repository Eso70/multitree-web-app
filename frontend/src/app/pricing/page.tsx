import type { Metadata } from "next";
import { MultiTreeMarketingShell } from "@/features/public-site/MultiTreeMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { PricingSection } from "@/features/public-site/PricingSection";
import { FaqSection } from "@/features/public-site/FaqSection";

export const metadata: Metadata = {
  title: "نرخەکان | MultiTree",
  description: "زانیاری تاقیکردنەوە و پلانی Creator لە MultiTree",
};
export default function PricingPage() {
  return (
    <MultiTreeMarketingShell>
      <MarketingPageHero
        eyebrow="نرخەکان"
        title="ڕوون، بێ نرخ و بەڵێنی ساختە"
        description="سەرەتا تاقی بکەرەوە؛ نرخە ڕاستەقینەکان تەنها کاتێک پیشان دەدرێن کە billing ئامادە و بڵاوکرابێتەوە"
      />
      <PricingSection />
      <FaqSection />
    </MultiTreeMarketingShell>
  );
}
