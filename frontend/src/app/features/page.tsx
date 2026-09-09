import type { Metadata } from "next";
import { SponsorKrdMarketingShell } from "@/features/public-site/SponsorKrdMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { FeatureGridSection } from "@/features/public-site/FeatureGridSection";
import { HowItWorksSection } from "@/features/public-site/HowItWorksSection";
import { FinalCtaSection } from "@/features/public-site/FinalCtaSection";

export const metadata: Metadata = {
  title: "تایبەتمەندییەکان | Sponsor.krd",
  description: "تایبەتمەندییەکانی Linktree ـی Sponsor.krd",
};
export default function FeaturesPage() {
  return (
    <SponsorKrdMarketingShell>
      <MarketingPageHero
        eyebrow="تایبەتمەندییەکان"
        title="هەموو ئەو ئامرازانەی بۆ پەڕەیەکی کاریگەر پێویستن"
        description="لە ناسنامەی تایبەت و دیزاینی مۆبایلەوە تا ئامار و لاندینگ پەیجی ڕیکلام"
        action={{ label: "بەخۆڕایی دەست پێ بکە", href: "/signup" }}
      />
      <FeatureGridSection />
      <HowItWorksSection />
      <FinalCtaSection />
    </SponsorKrdMarketingShell>
  );
}
