import { describe, expect, it } from "vitest";
import {
  BUSINESS_MINI_WEBSITE_WORKSPACE,
  CREATOR_MINI_WEBSITE_WORKSPACE,
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

  /**
   * Analytics depth follows page ownership, not surface. A workspace that owns
   * the page reads the full report through its own endpoints; platform
   * administration reviews other tenants' pages and stays on the summary. A
   * platform workspace flipped to `true` here would send the modal at the
   * business `/api/analytics/v2` routes, which are behind `BusinessGuard`.
   */
  it("gives the full analytics report only to workspaces that own the page", () => {
    expect(BUSINESS_MINI_WEBSITE_WORKSPACE.detailedAnalytics).toBe(true);
    expect(CREATOR_MINI_WEBSITE_WORKSPACE.detailedAnalytics).toBe(true);
    expect(PLATFORM_MINI_WEBSITE_WORKSPACE.detailedAnalytics).toBe(false);
    expect(CREATOR_MINI_WEBSITE_WORKSPACE.analyticsDataSource).toBe(
      "creator-mini-website",
    );
  });
});
