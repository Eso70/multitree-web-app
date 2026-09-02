"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SkeletonPageManagement } from "@/components/shared/SkeletonPageLayouts";
import { MiniWebsitesPage } from "@/features/mini-website/MiniWebsitesPage";
import { PLATFORM_MINI_WEBSITE_WORKSPACE } from "@/features/mini-website/workspace-config";
import { apiRequest } from "@/lib/api/request";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";

interface PlatformMiniWebsiteContext {
  branding: {
    name: string;
    logo: string | null;
    avatar: string | null;
    favicon: string | null;
    accentColor: string;
  };
  publicPathPrefix: string;
}

export function PlatformMiniWebsitesPage() {
  const [context, setContext] = useState<PlatformMiniWebsiteContext | null>(
    null,
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void apiRequest<PlatformMiniWebsiteContext>(
        "/api/platform/mini-websites/context",
      )
        .then(setContext)
        .catch((error: unknown) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "بارکردنی ڕێکخستنەکانی مینی وێبسایت سەرکەوتوو نەبوو",
          );
        });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!context) {
    return <SkeletonPageManagement />;
  }

  return (
    <ThemeProvider websiteColor={context.branding.accentColor}>
      <MiniWebsitesPage
        businessLogo={context.branding.logo}
        businessDefaultAvatar={context.branding.avatar}
        websiteColor={context.branding.accentColor}
        workspaceConfig={PLATFORM_MINI_WEBSITE_WORKSPACE}
      />
    </ThemeProvider>
  );
}
