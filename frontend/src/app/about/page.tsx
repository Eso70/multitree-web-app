import type { Metadata } from "next";
import { SponsorKrdMarketingShell } from "@/features/public-site/SponsorKrdMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { AboutContent } from "@/features/public-site/AboutContent";
import { FinalCtaSection } from "@/features/public-site/FinalCtaSection";

export const metadata: Metadata = {
  title: "دەربارە | Sponsor.krd",
  description: "دەربارەی ئامانج و بنەماکانی Sponsor.krd زیاتر بزانە",
};
export default function AboutPage() {
  return (
    <SponsorKrdMarketingShell>
      <MarketingPageHero
        eyebrow="دەربارەی Sponsor.krd"
        title="شوێنێکی سادە بۆ ناسنامەی دیجیتاڵی"
        description="ئێمە دروستکردنی پەڕەی جوان، خێرا و پارێزراو بۆ تاک و بزنس ئاسان دەکەین"
      />
      <AboutContent />
      <FinalCtaSection />
    </SponsorKrdMarketingShell>
  );
}
