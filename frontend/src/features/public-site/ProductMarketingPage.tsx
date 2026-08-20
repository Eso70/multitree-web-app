import { Check } from "lucide-react";
import { MultiTreeMarketingShell } from "./MultiTreeMarketingShell";
import { MarketingPageHero } from "./MarketingPageHero";
import { ProductPreviewWorkspace } from "./ProductPreviewWorkspace";
import { FeatureGridSection } from "./FeatureGridSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { PublicSection } from "@/components/public/PublicSection";

export function ProductMarketingPage({
  product,
}: {
  product: "linktree" | "mini-website";
}) {
  const linktree = product === "linktree";
  const bullets = linktree
    ? [
        "بەستەر و سۆشیالەکان",
        "کرداری WhatsApp و پەیوەندی",
        "لاندینگ پەیجی خێرا بۆ ڕیکلام",
      ]
    : [
        "خزمەتگوزاری و گەلەری",
        "شوێن، کاتەکان و پەیوەندی",
        "بەش و قاڵبی پیشەیی",
      ];
  return (
    <MultiTreeMarketingShell>
      <MarketingPageHero
        eyebrow={linktree ? "LINK IN BIO" : "MINI WEBSITE"}
        title={
          linktree
            ? "هەموو بەستەرەکانت لە یەک پەڕەی خێرا"
            : "ماڵپەڕێکی بچووک، ناساندنێکی تەواو"
        }
        description={
          linktree
            ? "بۆ TikTok، Instagram، کمپەین و هەر شوێنێک کە تەنها یەک بەستەرت پێدەدات"
            : "بەبێ ئاڵۆزیی وێبسایتێکی گەورە، خزمەتگوزاری و ناسنامەی پیشەییت پیشان بدە"
        }
        action={{ label: "پەڕەکەت دروست بکە", href: "/signup" }}
      />
      <PublicSection>
          <ProductPreviewWorkspace initial={product} />
          <div
            className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3"
            dir="rtl"
          >
            {bullets.map((bullet) => (
              <div
                key={bullet}
                className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/55 p-4 text-sm font-black dark:border-white/10 dark:bg-white/[0.03]"
              >
                <Check className="h-4 w-4 text-[var(--multitree-accent)]" />
                {bullet}
              </div>
            ))}
          </div>
      </PublicSection>
      <FeatureGridSection compact />
      <FinalCtaSection />
    </MultiTreeMarketingShell>
  );
}
