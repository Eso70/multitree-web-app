import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Business dashboard page boundaries", () => {
  it("reserves campaigns and TikTok Ads account configuration for Platform", () => {
    const source = (path: string) =>
      readFileSync(resolve(process.cwd(), "src", path), "utf8");
    const business = source("components/business/BusinessDashboard.tsx");
    expect(business).not.toContain("features/campaigns");
    for (const route of ["campaigns", "campains"]) {
      expect(business).not.toContain(`/business/${route}`);
      expect(existsSync(resolve(process.cwd(), `src/app/business/(dashboard)/${route}/page.tsx`))).toBe(false);
    }
    const tracking = source("features/analytics/components/BusinessTikTokConfigPage.tsx");
    expect(tracking).not.toContain("AdAccountTab");
    expect(tracking).toContain("BusinessTikTokPixelConfigPage");
    expect(source("features/platform-admin/components/PlatformAdminDashboard.tsx"))
      .toContain("<PlatformCampaignsPage />");
    expect(source("features/platform-admin/components/PlatformSettingsPage.tsx"))
      .toContain("<PlatformTikTokAdAccountTab />");
  });

  it("does not expose the Mini Website dashboard page", () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), "src/components/business/BusinessDashboard.tsx"),
      "utf8",
    );

    expect(dashboardSource).not.toContain("/business/mini-website");
    expect(dashboardSource).not.toContain("MiniWebsitesPage");
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "src/app/business/(dashboard)/mini-website/page.tsx",
        ),
      ),
    ).toBe(false);
  });
});
