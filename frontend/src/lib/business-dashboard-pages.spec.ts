import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Business dashboard page boundaries", () => {
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
