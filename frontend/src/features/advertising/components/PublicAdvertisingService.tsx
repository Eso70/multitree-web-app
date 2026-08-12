"use client";

import { type CSSProperties } from "react";
import { BusinessPublicSiteShell } from "@/components/business/BusinessPublicSiteShell";
import { readableInk } from "@/lib/utils/parse-website-color";
import { AdvertisingHeroSection } from "./AdvertisingHeroSection";
import { AdvertisingSponsorshipJourney } from "./AdvertisingSponsorshipJourney";
import { AdvertisingResultsShowcaseSection } from "./AdvertisingResultsShowcaseSection";
import { AdvertisingPackagesSection } from "./AdvertisingPackagesSection";
import { AdvertisingTestimonialsSection } from "./AdvertisingTestimonialsSection";
import { AdvertisingFaqSection } from "./AdvertisingFaqSection";
import { AdvertisingClosingCtaSection } from "./AdvertisingClosingCtaSection";
import type {
  AdvertisingBusinessBranding,
  AdvertisingServiceConfig,
} from "../types";

interface PublicAdvertisingServiceProps {
  branding: AdvertisingBusinessBranding;
  /** Always supplied by the server: the route 404s when no published page exists. */
  config: AdvertisingServiceConfig;
  embedded?: boolean;
  footer?: {
    description?: string | null;
    phone?: string | null;
    whatsappEnabled?: boolean | null;
    linktrees?: Array<{ name: string; href: string }>;
    miniWebsites?: Array<{ name: string; href: string }>;
  };
}

export function PublicAdvertisingService({
  branding,
  config,
  embedded = false,
  footer,
}: PublicAdvertisingServiceProps) {
  const accent = branding.accentColor || "#111827";
  const accentInk = readableInk(accent);

  // The "service unavailable" screen this used to render is gone: the public
  // endpoint 404s for a page that is not published, so the route reaches
  // notFound() before any of this renders.

  const whatsappHref = config.whatsappNumber.trim()
    ? `https://wa.me/${config.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("سڵاو، دەمەوێت داواکاری ڕیکلامی تیکتۆک بکەم")}`
    : "#packages";
  const pageStyle = {
    "--advertising-accent": accent,
    "--advertising-accent-ink": accentInk,
  } as CSSProperties;

  return (
    <BusinessPublicSiteShell
      embedded={embedded}
      businessName={branding.name}
      logo={branding.logo}
      accentColor={accent}
      homeHref="/"
      // Only link to sections this page actually renders; an anchor to a
      // section that was hidden or left empty scrolls nowhere.
      navigationItems={[
        config.sections.journey && {
          label: "قۆناغەکانی سپۆنسەر",
          href: "#how-it-works",
        },
        config.sections.results &&
          config.results.length > 0 && { label: "ئەنجامەکان", href: "#results" },
        config.sections.packages && { label: "نرخەکان", href: "#packages" },
        config.sections.testimonials &&
          config.testimonials.length > 0 && {
            label: "ڕای کڕیاران",
            href: "#testimonials",
          },
        config.sections.faq &&
          config.faqs.length > 0 && { label: "پرسیارەکان", href: "#faq" },
        { label: "ڤیدیۆی فێرکاری", href: "/advertising/video-code" },
      ].filter((item): item is { label: string; href: string } =>
        Boolean(item),
      )}
      action={{
        label: "نامە بنێرە",
        href: whatsappHref,
        external: whatsappHref.startsWith("http"),
      }}
      footer={{
        logo: branding.logo,
        description: footer?.description,
        phone: footer?.phone,
        whatsappEnabled: footer?.whatsappEnabled,
        // Reaching this page means the advertising pages are live, so the
        // footer can link to them.
        advertisingEnabled: true,
        linktrees: footer?.linktrees,
        miniWebsites: footer?.miniWebsites,
      }}
    >
      <div className="overflow-hidden" style={pageStyle}>
        {config.sections.hero && (
          <AdvertisingHeroSection
            title={config.title}
            description={config.description}
            accentColor={accent}
            embedded={embedded}
          />
        )}

        {config.sections.journey && (
          <AdvertisingSponsorshipJourney
            videoUrl={config.videoUrl}
            videoTutorialTitle={config.videoTutorialTitle}
            tutorialSteps={config.tutorialSteps}
            packageTiers={config.packageTiers}
            paymentProviders={config.paymentProviders}
            receiptExampleImageUrl={config.receiptExampleImageUrl}
          />
        )}

        {/*
          Content-driven sections need their toggle *and* something to show.
          A business starts with these empty, and a heading over an empty strip
          reads as a broken page rather than an unused feature.
        */}
        {config.sections.results && config.results.length > 0 && (
          <AdvertisingResultsShowcaseSection items={config.results} />
        )}

        {config.sections.packages && <AdvertisingPackagesSection packageTiers={config.packageTiers} />}

        {config.sections.testimonials && config.testimonials.length > 0 && (
          <AdvertisingTestimonialsSection items={config.testimonials} />
        )}

        {config.sections.faq && config.faqs.length > 0 && (
          <AdvertisingFaqSection items={config.faqs} />
        )}

        {config.sections.closingCta && (
          <AdvertisingClosingCtaSection
            title={config.closingCta.title}
            description={config.closingCta.description}
            buttonLabel={config.closingCta.buttonLabel}
            whatsappHref={whatsappHref}
          />
        )}
      </div>
    </BusinessPublicSiteShell>
  );
}
