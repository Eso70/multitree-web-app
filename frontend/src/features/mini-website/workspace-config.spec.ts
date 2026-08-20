import { describe, expect, it } from "vitest";
import {
  BUSINESS_MINI_WEBSITE_WORKSPACE,
  PLATFORM_MINI_WEBSITE_WORKSPACE,
} from "./workspace-config";

describe("mini-website workspace configuration", () => {
  it("keeps business endpoints unchanged", () => {
    expect(BUSINESS_MINI_WEBSITE_WORKSPACE.api.collection).toBe(
      "/api/mini-websites",
    );
    expect(BUSINESS_MINI_WEBSITE_WORKSPACE.api.item("page id")).toBe(
      "/api/mini-websites/page%20id",
    );
  });

  it("routes platform behavior through guarded platform endpoints", () => {
    expect(PLATFORM_MINI_WEBSITE_WORKSPACE.api.collection).toBe(
      "/api/platform/mini-websites",
    );
    expect(PLATFORM_MINI_WEBSITE_WORKSPACE.analyticsDataSource).toBe(
      "platform-mini-website",
    );
    expect(PLATFORM_MINI_WEBSITE_WORKSPACE.api.clearAllAnalytics).toBe(
      "/api/platform/mini-websites/analytics",
    );
  });
});
