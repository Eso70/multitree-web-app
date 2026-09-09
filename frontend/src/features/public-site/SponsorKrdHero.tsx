import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { PublicMarketingHero } from "@/components/public/PublicMarketingHero";
import { PublicSection } from "@/components/public/PublicSection";
import {
  SPONSOR_KRD_ACCENT_COLOR,
  SPONSOR_KRD_ACCENT_GRADIENT,
} from "@/lib/sponsor-krd-theme";
import { ProductPreviewWorkspace } from "./ProductPreviewWorkspace";

const SPONSOR_KRD_HERO_DECORATIONS = [
  "ناسنامەی دیجیتاڵی",
  "Linktree ـی تایبەت",
] as const;

export function SponsorKrdHero() {
  return (
    <>
      <PublicMarketingHero
        accentColor={SPONSOR_KRD_ACCENT_COLOR}
        title={
          <>
            هەموو بەستەر و ناسنامەی دیجیتاڵیت،{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: SPONSOR_KRD_ACCENT_GRADIENT }}
            >
              لە یەک شوێن
            </span>
          </>
        }
        description="Linktree ـێکی جوان دروست بکە، بە sponsor.krd بڵاوی بکەرەوە و بزانە بینەرانت چیان پێ باشە"
        primaryAction={{
          label: "بەخۆڕایی دەست پێ بکە",
          href: "/signup",
          color: SPONSOR_KRD_ACCENT_COLOR,
          background: SPONSOR_KRD_ACCENT_GRADIENT,
          ink: "#111827",
        }}
        secondaryAction={{ label: "بینینی نموونە", href: "#product-preview" }}
        decorations={
          <BusinessSectionDecorations
            colors={["#25F4EE", "#FE2C55"]}
            labels={SPONSOR_KRD_HERO_DECORATIONS}
            variant={0}
          />
        }
      />
      <PublicSection
        id="product-preview"
        label="پێشبینینی بەرهەمەکانی Sponsor.krd"
      >
        <ProductPreviewWorkspace />
        <p className="mx-auto mt-7 max-w-2xl text-center text-sm leading-7 text-black/45 dark:text-white/45">
          تاقیکردنەوە کاتێک دەست پێدەکات کە یەکەم پەڕەکەت دروست دەکەیت
        </p>
      </PublicSection>
    </>
  );
}
