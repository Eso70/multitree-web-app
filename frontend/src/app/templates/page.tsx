import type { Metadata } from "next";
import { SponsorKrdMarketingShell } from "@/features/public-site/SponsorKrdMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { TemplateShowcaseSection } from "@/features/public-site/TemplateShowcaseSection";
import { FinalCtaSection } from "@/features/public-site/FinalCtaSection";

export const metadata: Metadata = {
  title: "قاڵبەکان | Sponsor.krd",
  description: "نموونەی قاڵبەکانی Linktree ببینە",
};
export default function TemplatesMarketingPage() {
  return (
    <SponsorKrdMarketingShell>
      <MarketingPageHero
        eyebrow="قاڵبەکان"
        title="دیزاینێک بۆ هەر ناسنامەیەک"
        description="بە نموونەیەک دەست پێ بکە و بە ڕەنگ، وێنە و ناوەڕۆکی خۆت تایبەتی بکە"
        action={{ label: "هەژمار دروست بکە", href: "/signup" }}
      />
      <TemplateShowcaseSection showAll />
      <FinalCtaSection />
    </SponsorKrdMarketingShell>
  );
}
