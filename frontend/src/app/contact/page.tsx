import type { Metadata } from "next";
import { MultiTreeMarketingShell } from "@/features/public-site/MultiTreeMarketingShell";
import { MarketingPageHero } from "@/features/public-site/MarketingPageHero";
import { ContactContent } from "@/features/public-site/ContactContent";

export const metadata: Metadata = {
  title: "پەیوەندی | MultiTree",
  description: "ڕێگاکانی یارمەتی و پەیوەندی لەگەڵ MultiTree",
};
export default function ContactPage() {
  return (
    <MultiTreeMarketingShell>
      <MarketingPageHero
        eyebrow="پەیوەندی"
        title="چۆن دەتوانین یارمەتیت بدەین؟"
        description="ڕێگای گونجاو بۆ هەژمار، پرسیارە باوەکان یان زانیاری گشتی هەڵبژێرە"
      />
      <ContactContent />
    </MultiTreeMarketingShell>
  );
}
