"use client";

import { useEffect, useState } from "react";
import { AuthenticationCard } from "@/components/shared/AuthenticationCard";
import { AuthenticationMethods } from "@/components/shared/AuthenticationMethods";
import { AuthenticationShell } from "@/components/shared/AuthenticationShell";
import {
  applyBusinessTabBranding,
  loadBusinessSubdomainTheme,
  type BusinessSubdomainTheme,
} from "@/lib/utils/business-error-theme";
import { BUSINESS_LOGO_PLACEHOLDER } from "@/lib/brand/brand-assets";

export default function BusinessLoginPage() {
  const [theme, setTheme] = useState<BusinessSubdomainTheme | null>(null);

  useEffect(() => {
    void loadBusinessSubdomainTheme().then((loadedTheme) => {
      setTheme(loadedTheme);
      applyBusinessTabBranding(loadedTheme.favicon, loadedTheme.name);
    });
  }, []);

  return (
    <AuthenticationShell
      brandDescription="بڕۆ ژوورەوە بۆ بەڕێوەبردنی بزنس"
      brandName={theme?.name || "MultiTree"}
      // Explicit, never the shell's MultiTree default: a tenant page shows the
      // business logo or the neutral placeholder, never the platform's mark.
      brandLogo={theme?.logo ?? BUSINESS_LOGO_PLACEHOLDER}
      accentColor={theme?.websiteColor.raw}
    >
      <AuthenticationCard
        title="چوونەژوورەوەی بزنس"
        description="بە گوگڵ یان ئیمێڵ بڕۆ ژوورەوە"
      >
        <AuthenticationMethods
          rememberDevice
          googleHref="/api/auth/google/start"
          requestEndpoint="/api/auth/email/request"
          verifyEndpoint="/api/auth/email/verify"
          emailPlaceholder="Enter your business email"
        />
      </AuthenticationCard>
    </AuthenticationShell>
  );
}
