import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { PublicMarketingHero } from "@/components/public/PublicMarketingHero";
import { PublicSection } from "@/components/public/PublicSection";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";
import { ProductPreviewWorkspace } from "./ProductPreviewWorkspace";

const MULTITREE_HERO_DECORATIONS = [
  "ناسنامەی دیجیتاڵی",
  "Linktree و Mini Website",
] as const;

export function MultiTreeHero() {
  return (
    <>
      <PublicMarketingHero
        accentColor={MULTITREE_ACCENT_COLOR}
        title={
          <>
            هەموو بەستەر و ناسنامەی دیجیتاڵیت،{" "}
            <span className="text-[#9bd400]">لە یەک شوێن</span>
          </>
        }
        description="Linktree یان مینی وێبسایتێکی جوان دروست بکە، بە sponsor.krd بڵاوی بکەرەوە و بزانە بینەرانت چیان پێ باشە"
        primaryAction={{
          label: "بەخۆڕایی دەست پێ بکە",
          href: "/signup",
          color: MULTITREE_ACCENT_COLOR,
          ink: "#111827",
        }}
        secondaryAction={{ label: "بینینی نموونە", href: "#product-preview" }}
        decorations={
          <BusinessSectionDecorations
            colors={[MULTITREE_ACCENT_COLOR, "#60a5fa"]}
            labels={MULTITREE_HERO_DECORATIONS}
            variant={0}
          />
        }
      />
      <PublicSection
        id="product-preview"
        label="پێشبینینی بەرهەمەکانی MultiTree"
      >
        <ProductPreviewWorkspace />
        <p className="mx-auto mt-7 max-w-2xl text-center text-sm leading-7 text-black/45 dark:text-white/45">
          تاقیکردنەوە کاتێک دەست پێدەکات کە یەکەم پەڕەکەت دروست دەکەیت
        </p>
      </PublicSection>
    </>
  );
}
