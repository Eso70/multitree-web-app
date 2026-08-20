import {
  BUSINESS_LANDING_DECORATION_COLORS,
  BUSINESS_LANDING_DECORATION_LABELS,
  BUSINESS_LANDING_SECTION_HREFS,
} from "@/components/business/business-landing-sections";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { PublicMarketingHero } from "@/components/public/PublicMarketingHero";

interface BusinessHeroProps {
  accentColor: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function BusinessHero({
  accentColor,
  title = "هەموو زانیارییەکانت لەناو یەک پەڕەی دیجیتاڵی",
  description =
    "لە یەک شوێنی متمانەپێکراوەوە پەڕە فەرمییەکان، ماڵپەڕەکان و ڕێگاکانی پەیوەندیی ببینە",
  actionLabel = "پەڕەی ئەو کەسانە ببینە کە بەشدارییان کردووە",
  actionHref = BUSINESS_LANDING_SECTION_HREFS.workspace,
}: BusinessHeroProps) {
  return (
    <PublicMarketingHero
      accentColor={accentColor}
      title={title}
      description={description}
      primaryAction={{ label: actionLabel, href: actionHref }}
      decorations={
        <BusinessSectionDecorations
          colors={BUSINESS_LANDING_DECORATION_COLORS.hero}
          labels={BUSINESS_LANDING_DECORATION_LABELS.hero}
          variant={0}
        />
      }
    />
  );
}
