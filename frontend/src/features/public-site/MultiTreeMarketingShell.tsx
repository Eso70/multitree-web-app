"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PublicMarketingSiteShell } from "@/components/public/PublicMarketingSiteShell";
import { MULTITREE_LOGO } from "@/lib/brand/brand-assets";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { MARKETING_NAVIGATION } from "./marketing-content";
import { MultiTreeMarketingFooter } from "./MultiTreeMarketingFooter";

export function MultiTreeMarketingShell({ children }: { children: ReactNode }) {
  const [accentColor, setAccentColor] = useState(MULTITREE_ACCENT_COLOR);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public/platform-theme", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || typeof payload?.data?.accent_color !== "string")
          return;
        setAccentColor(parseWebsiteColor(payload.data.accent_color).primary);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicMarketingSiteShell
      accentColor={accentColor}
      brandName="MultiTree"
      logo={MULTITREE_LOGO}
      navigationItems={MARKETING_NAVIGATION}
      primaryAction={{ label: "هەژمار دروست بکە", href: "/signup" }}
      primaryActionColor={MULTITREE_ACCENT_COLOR}
      primaryActionInk="#111827"
      secondaryAction={{ label: "چوونەژوورەوە", href: "/login" }}
      footer={<MultiTreeMarketingFooter accentColor={accentColor} />}
    >
      {children}
    </PublicMarketingSiteShell>
  );
}
