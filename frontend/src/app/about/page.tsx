import type { Metadata } from "next";
import { MultiTreeMarketingShell } from "@/features/public-site/MultiTreeMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { AboutContent } from "@/features/public-site/AboutContent";
import { FinalCtaSection } from "@/features/public-site/FinalCtaSection";

export const metadata: Metadata = {
  title: "دەربارە | MultiTree",
  description: "دەربارەی ئامانج و بنەماکانی MultiTree زیاتر بزانە",
};
export default function AboutPage() {
  return (
    <MultiTreeMarketingShell>
      <MarketingPageHero
        eyebrow="دەربارەی MultiTree"
        title="شوێنێکی سادە بۆ ناسنامەی دیجیتاڵی"
        description="ئێمە دروستکردنی پەڕەی جوان، خێرا و پارێزراو بۆ تاک و بزنس ئاسان دەکەین"
      />
      <AboutContent />
      <FinalCtaSection />
    </MultiTreeMarketingShell>
  );
}
