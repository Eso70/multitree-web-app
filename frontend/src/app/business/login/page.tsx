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
      brandLogo={theme?.logo}
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
