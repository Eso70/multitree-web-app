import { SponsorKrdMarketingShell } from "@/features/public-site/SponsorKrdMarketingShell";
import { SponsorKrdHero } from "@/features/public-site/SponsorKrdHero";

export function HomeLanding() {
  return (
    <SponsorKrdMarketingShell>
      <SponsorKrdHero />
    </SponsorKrdMarketingShell>
  );
}
