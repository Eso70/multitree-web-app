import type { Metadata } from "next";
import { MultiTreeMarketingShell } from "@/features/public-site/MultiTreeMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { TemplateShowcaseSection } from "@/features/public-site/TemplateShowcaseSection";
import { FinalCtaSection } from "@/features/public-site/FinalCtaSection";

export const metadata: Metadata = {
  title: "قاڵبەکان | MultiTree",
  description: "نموونەی قاڵبەکانی Linktree و Mini Website ببینە",
};
export default function TemplatesMarketingPage() {
  return (
    <MultiTreeMarketingShell>
      <MarketingPageHero
        eyebrow="قاڵبەکان"
        title="دیزاینێک بۆ هەر ناسنامەیەک"
        description="بە نموونەیەک دەست پێ بکە و بە ڕەنگ، وێنە و ناوەڕۆکی خۆت تایبەتی بکە"
        action={{ label: "هەژمار دروست بکە", href: "/signup" }}
      />
      <TemplateShowcaseSection showAll />
      <FinalCtaSection />
    </MultiTreeMarketingShell>
  );
}
