import { describe, expect, it } from "vitest";
import { TIKTOK_CONFIG_WORKSPACES } from "./tiktok-config-workspace";

describe("TikTok configuration workspaces", () => {
  it("preserves the existing Business and Platform authorization boundaries", () => {
    expect(TIKTOK_CONFIG_WORKSPACES.business.accessEndpoint).toBe(
      "/api/auth/effective-access",
    );
    expect(TIKTOK_CONFIG_WORKSPACES.platform.settingsEndpoint).toBe(
      "/api/platform/settings/tiktok",
    );
  });
});
