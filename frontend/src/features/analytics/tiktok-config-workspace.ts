export type TikTokConfigOwner = "business" | "platform" | "creator";

export interface TikTokConfigWorkspace {
  settingsEndpoint: string;
  saveMethod: "PATCH" | "PUT";
  accessEndpoint: string | null;
  healthEndpoint?: string;
  errorsEndpoint?: string;
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
    pixelLimit: 3,
    description:
      "Pixel و Events APIی تایبەت بە پەڕە گشتییەکانی MultiTree. هیچ کاتێک بۆ پەڕەی بزنسەکان بەکار نایەت.",
  },
  creator: {
    settingsEndpoint: "/api/creator/settings/tiktok",
    saveMethod: "PUT",
    accessEndpoint: null,
    healthEndpoint: "/api/creator/settings/tiktok/health",
    errorsEndpoint: "/api/creator/settings/tiktok/errors",
    pixelLimit: 1,
    description:
      "Pixel و Events API بۆ پەیجە گشتییەکەت بەکاربهێنە. نهێنیی Events API بە شێوەی پارێزراو هەڵدەگیرێت.",
  },
};
