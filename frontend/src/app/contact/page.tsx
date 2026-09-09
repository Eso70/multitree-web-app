import type { Metadata } from "next";
import { SponsorKrdMarketingShell } from "@/features/public-site/SponsorKrdMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { ContactContent } from "@/features/public-site/ContactContent";

export const metadata: Metadata = {
  title: "پەیوەندی | Sponsor.krd",
  description: "ڕێگاکانی یارمەتی و پەیوەندی لەگەڵ Sponsor.krd",
};
export default function ContactPage() {
  return (
    <SponsorKrdMarketingShell>
      <MarketingPageHero
        eyebrow="پەیوەندی"
        title="چۆن دەتوانین یارمەتیت بدەین؟"
        description="ڕێگای گونجاو بۆ هەژمار، پرسیارە باوەکان یان زانیاری گشتی هەڵبژێرە"
      />
      <ContactContent />
    </SponsorKrdMarketingShell>
  );
}
