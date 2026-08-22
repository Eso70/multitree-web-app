"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PageAnalyticsDataSource } from "@/components/business/BusinessPageAnalyticsModal";

export interface MiniWebsiteApiEndpoints {
  collection: string;
  item: (id: string) => string;
  analytics: (id: string) => string;
  analyticsSummary: string;
  checkSlug: string;
  resolveMapLink: string;
  uploadImage: string;
  clearAllAnalytics?: string;
}

export interface MiniWebsiteWorkspaceConfig {
  api: MiniWebsiteApiEndpoints;
  publicPathPrefix: string;
  analyticsDataSource: PageAnalyticsDataSource;
  /**
   * Whether the analytics modal shows the full page report — the business stat
   * cards, the conversion tiles and the per-button list — or only the
   * all-time summary. A workspace that owns the page it is inspecting gets the
   * full report; platform administration reviews other tenants' pages and gets
   * the summary.
   */
  detailedAnalytics: boolean;
  allowAllTemplates: boolean;
}

export const BUSINESS_MINI_WEBSITE_WORKSPACE: MiniWebsiteWorkspaceConfig = {
  api: {
    collection: "/api/mini-websites",
    item: (id) => `/api/mini-websites/${encodeURIComponent(id)}`,
    analytics: (id) => `/api/mini-websites/${encodeURIComponent(id)}/analytics`,
    analyticsSummary: "/api/analytics/v2/summary?pageType=mini_website",
    checkSlug: "/api/mini-websites/check-slug",
    resolveMapLink: "/api/mini-websites/resolve-map-link",
    uploadImage: "/api/mini-websites/upload/image",
  },
  publicPathPrefix: "/bio",
  analyticsDataSource: "business",
  detailedAnalytics: true,
  allowAllTemplates: false,
};

export const PLATFORM_MINI_WEBSITE_WORKSPACE: MiniWebsiteWorkspaceConfig = {
  api: {
    collection: "/api/platform/mini-websites",
    item: (id) => `/api/platform/mini-websites/${encodeURIComponent(id)}`,
    analytics: (id) =>
      `/api/platform/mini-websites/${encodeURIComponent(id)}/analytics`,
    analyticsSummary: "/api/platform/mini-websites/analytics/summary",
    checkSlug: "/api/platform/mini-websites/check-slug",
    resolveMapLink: "/api/platform/mini-websites/resolve-map-link",
    uploadImage: "/api/platform/mini-websites/upload/image",
    clearAllAnalytics: "/api/platform/mini-websites/analytics",
  },
  publicPathPrefix: "/bio",
  analyticsDataSource: "platform-mini-website",
  detailedAnalytics: false,
  allowAllTemplates: true,
};

export const CREATOR_MINI_WEBSITE_WORKSPACE: MiniWebsiteWorkspaceConfig = {
  api: {
    collection: "/api/creator/mini-websites",
    item: (id) => `/api/creator/mini-websites/${encodeURIComponent(id)}`,
    analytics: (id) =>
      `/api/creator/mini-websites/${encodeURIComponent(id)}/analytics`,
    analyticsSummary: "/api/creator/mini-websites/analytics/summary",
    checkSlug: "/api/creator/mini-websites/check-slug",
    resolveMapLink: "/api/creator/mini-websites/resolve-map-link",
    uploadImage: "/api/creator/mini-websites/upload/image",
    clearAllAnalytics: "/api/creator/mini-websites/analytics",
  },
  publicPathPrefix: "/bio",
  analyticsDataSource: "creator-mini-website",
  detailedAnalytics: true,
  allowAllTemplates: true,
};

const MiniWebsiteWorkspaceContext = createContext<MiniWebsiteWorkspaceConfig>(
  BUSINESS_MINI_WEBSITE_WORKSPACE,
);

export function MiniWebsiteWorkspaceProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: MiniWebsiteWorkspaceConfig;
}) {
  return (
    <MiniWebsiteWorkspaceContext.Provider value={config}>
      {children}
    </MiniWebsiteWorkspaceContext.Provider>
  );
}

export function useMiniWebsiteWorkspace(): MiniWebsiteWorkspaceConfig {
  return useContext(MiniWebsiteWorkspaceContext);
}
