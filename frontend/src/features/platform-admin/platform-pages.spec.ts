import { describe, expect, it } from "vitest";
import { getPlatformPage, isPlatformPage } from "./platform-pages";

describe("platform pages", () => {
  it("resolves every supported console page", () => {
    expect(getPlatformPage("/secure-console/linktrees")).toBe("linktrees");
    expect(getPlatformPage("/secure-console/mini-websites")).toBe(
      "mini-websites",
    );
    expect(getPlatformPage("/secure-console")).toBe("businesses");
  });

  it("rejects unknown console page segments", () => {
    expect(isPlatformPage("unknown-page")).toBe(false);
    expect(isPlatformPage("settings")).toBe(true);
  });
});
