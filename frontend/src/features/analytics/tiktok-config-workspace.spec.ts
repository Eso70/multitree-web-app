import { describe, expect, it } from "vitest";
import { TIKTOK_CONFIG_WORKSPACES } from "./tiktok-config-workspace";

describe("TikTok configuration workspaces", () => {
  it("keeps Creator configuration on Creator-scoped endpoints", () => {
    expect(TIKTOK_CONFIG_WORKSPACES.creator).toMatchObject({
      settingsEndpoint: "/api/creator/settings/tiktok",
      healthEndpoint: "/api/creator/settings/tiktok/health",
      errorsEndpoint: "/api/creator/settings/tiktok/errors",
      saveMethod: "PUT",
      accessEndpoint: null,
      pixelLimit: 1,
    });
  });

  it("preserves the existing Business and Platform authorization boundaries", () => {
    expect(TIKTOK_CONFIG_WORKSPACES.business.accessEndpoint).toBe(
      "/api/auth/effective-access",
    );
    expect(TIKTOK_CONFIG_WORKSPACES.platform.settingsEndpoint).toBe(
      "/api/platform/settings/tiktok",
    );
  });
});
