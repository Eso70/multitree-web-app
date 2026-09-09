import { Check } from "lucide-react";
import { SponsorKrdMarketingShell } from "./SponsorKrdMarketingShell";
import { MarketingPageHero } from "./MarketingPageHero";
import { ProductPreviewWorkspace } from "./ProductPreviewWorkspace";
import { FeatureGridSection } from "./FeatureGridSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { PublicSection } from "@/components/public/PublicSection";

export function ProductMarketingPage() {
  const bullets = [
        "بەستەر و سۆشیالەکان",
        "کرداری WhatsApp و پەیوەندی",
        "لاندینگ پەیجی خێرا بۆ ڕیکلام",
      ];
  return (
    <SponsorKrdMarketingShell>
      <MarketingPageHero
        eyebrow="LINK IN BIO"
        title="هەموو بەستەرەکانت لە یەک پەڕەی خێرا"
        description="بۆ TikTok، Instagram، کمپەین و هەر شوێنێک کە تەنها یەک بەستەرت پێدەدات"
        action={{ label: "پەڕەکەت دروست بکە", href: "/signup" }}
      />
      <PublicSection>
          <ProductPreviewWorkspace />
          <div
            className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3"
            dir="rtl"
          >
            {bullets.map((bullet) => (
              <div
                key={bullet}
                className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/55 p-4 text-sm font-black dark:border-white/10 dark:bg-white/[0.03]"
              >
                <Check className="h-4 w-4 text-[var(--sponsor-krd-accent)]" />
                {bullet}
              </div>
            ))}
          </div>
      </PublicSection>
      <FeatureGridSection compact />
      <FinalCtaSection />
    </SponsorKrdMarketingShell>
  );
}
