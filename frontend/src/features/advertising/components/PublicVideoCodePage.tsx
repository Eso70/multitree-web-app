"use client";

import { BusinessPublicSiteShell } from "@/components/business/BusinessPublicSiteShell";
import { BusinessHeroAccentBackdrop } from "@/components/business/BusinessHeroAccentBackdrop";
import { AdvertisingVideoPlayer } from "./AdvertisingVideoPlayer";
import type { AdvertisingBusinessBranding, AdvertisingServiceConfig } from "../types";

interface PublicVideoCodePageProps {
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

export function PublicVideoCodePage({
  branding,
  config,
  embedded = false,
  footer,
}: PublicVideoCodePageProps) {
  const accent = branding.accentColor || "#111827";

  return (
    <BusinessPublicSiteShell
      embedded={embedded}
      businessName={branding.name}
      logo={branding.logo}
      accentColor={accent}
      homeHref="/"
      navigationItems={[{ label: "ڕیکلام", href: "/advertising" }]}
      action={{ label: "گەڕانەوە بۆ پەڕەی ڕیکلام", href: "/advertising" }}
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
      <section className="relative overflow-hidden bg-transparent px-5 pb-20 pt-36 text-center sm:px-8 sm:pb-24 sm:pt-40">
        <BusinessHeroAccentBackdrop accentColor={accent} />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
          <h1
            className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl"
            dir="auto"
          >
            {config.videoTutorialTitle}
          </h1>

          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-black/10 shadow-xl dark:border-white/10">
            <div className="aspect-[9/16] w-full">
              <AdvertisingVideoPlayer size="full" src={config.videoUrl} />
            </div>
          </div>
        </div>
      </section>
    </BusinessPublicSiteShell>
  );
}
