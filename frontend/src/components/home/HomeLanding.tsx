import { HomepageCommunications } from "@/features/communications/HomepageCommunications";
import { SponsorKrdMarketingShell } from "@/features/public-site/SponsorKrdMarketingShell";
import { SponsorKrdHero } from "@/features/public-site/SponsorKrdHero";
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
    <SponsorKrdMarketingShell>
      <HomepageCommunications />
      <SponsorKrdHero />
      <ProductChoiceSection />
      <HowItWorksSection />
      <FeatureGridSection />
      <UseCasesSection />
      <TemplateShowcaseSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
    </SponsorKrdMarketingShell>
  );
}
