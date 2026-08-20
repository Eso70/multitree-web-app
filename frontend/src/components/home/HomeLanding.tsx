import { HomepageCommunications } from "@/features/communications/HomepageCommunications";
import { MultiTreeMarketingShell } from "@/features/public-site/MultiTreeMarketingShell";
import { MultiTreeHero } from "@/features/public-site/MultiTreeHero";
import { ProductChoiceSection } from "@/features/public-site/ProductChoiceSection";
import { HowItWorksSection } from "@/features/public-site/HowItWorksSection";
import { FeatureGridSection } from "@/features/public-site/FeatureGridSection";
import { UseCasesSection } from "@/features/public-site/UseCasesSection";
import { TemplateShowcaseSection } from "@/features/public-site/TemplateShowcaseSection";
import { PricingSection } from "@/features/public-site/PricingSection";
import { FaqSection } from "@/features/public-site/FaqSection";
import { FinalCtaSection } from "@/features/public-site/FinalCtaSection";

export function HomeLanding() {
  return (
    <MultiTreeMarketingShell>
      <HomepageCommunications />
      <MultiTreeHero />
      <ProductChoiceSection />
      <HowItWorksSection />
      <FeatureGridSection />
      <UseCasesSection />
      <TemplateShowcaseSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
    </MultiTreeMarketingShell>
  );
}
