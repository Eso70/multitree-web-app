"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PublicMarketingSiteShell } from "@/components/public/PublicMarketingSiteShell";
import { SPONSOR_KRD_LOGO } from "@/lib/brand/brand-assets";
import {
  SPONSOR_KRD_ACCENT_GRADIENT,
  SPONSOR_KRD_ACCENT_VALUE,
} from "@/lib/sponsor-krd-theme";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { MARKETING_NAVIGATION } from "./marketing-content";
import { SponsorKrdMarketingFooter } from "./SponsorKrdMarketingFooter";

export function SponsorKrdMarketingShell({
  children,
}: {
  children: ReactNode;
}) {
  const [accent, setAccent] = useState(() =>
    parseWebsiteColor(SPONSOR_KRD_ACCENT_VALUE),
  );

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public/platform-theme", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || typeof payload?.data?.accent_color !== "string")
          return;
        setAccent(parseWebsiteColor(payload.data.accent_color));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicMarketingSiteShell
      accentColor={accent.primary}
      accentBackground={accent.css}
      brandName="Sponsor.krd"
      logo={SPONSOR_KRD_LOGO}
      navigationItems={MARKETING_NAVIGATION}
      primaryAction={{ label: "هەژمار دروست بکە", href: "/signup" }}
      primaryActionColor={accent.css || SPONSOR_KRD_ACCENT_GRADIENT}
      primaryActionInk="#111827"
      secondaryAction={{ label: "چوونەژوورەوە", href: "/login" }}
      footer={<SponsorKrdMarketingFooter accentColor={accent.primary} />}
    >
      {children}
    </PublicMarketingSiteShell>
  );
}
