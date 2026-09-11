export type TikTokConfigOwner = "business" | "platform";

export interface TikTokConfigWorkspace {
  settingsEndpoint: string;
  saveMethod: "PATCH" | "PUT";
  accessEndpoint: string | null;
  healthEndpoint?: string;
  errorsEndpoint?: string;
  testEndpoint: string;
  secretEndpoint?: (id: string) => string;
  pixelLimit: number | null;
  description: string;
}

export const TIKTOK_CONFIG_WORKSPACES: Record<
  TikTokConfigOwner,
  TikTokConfigWorkspace
> = {
  business: {
    settingsEndpoint: "/api/auth/settings",
    saveMethod: "PATCH",
    accessEndpoint: "/api/auth/effective-access",
    healthEndpoint: "/api/analytics/v2/tiktok/health",
    errorsEndpoint: "/api/analytics/v2/tiktok/errors",
    testEndpoint: "/api/analytics/v2/tiktok/test",
    secretEndpoint: (id: string) => `/api/auth/tiktok/${id}/secret`,
    pixelLimit: null,
    description:
      "Pixel ID بۆ شوێنکەوتنی وێبگەڕ پێویستە. Events API token ئارەزوومەندانەیەە و تەنها کاتێک بەکار دەکەوێت کە دابنرێت.",
  },
  platform: {
    settingsEndpoint: "/api/platform/settings/tiktok",
    saveMethod: "PUT",
    accessEndpoint: null,
    healthEndpoint: "/api/platform/settings/tiktok/health",
    errorsEndpoint: "/api/platform/settings/tiktok/errors",
    testEndpoint: "/api/platform/settings/tiktok/test",
    pixelLimit: 3,
    description:
      "Pixel و Events APIی تایبەت بە پەڕە گشتییەکانی Sponsor.krd. هیچ کاتێک بۆ پەڕەی بزنسەکان بەکار نایەت.",
  },
};
