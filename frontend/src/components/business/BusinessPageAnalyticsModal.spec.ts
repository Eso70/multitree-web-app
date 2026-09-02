import { describe, expect, it } from "vitest";
import { miniActionSection } from "@/components/business/BusinessPageAnalyticsModal";

describe("miniActionSection", () => {
  it("names the section a mini-website action belongs to", () => {
    expect(miniActionSection("mini:offer:17")).toBe("ئۆفەر");
  });

  it("returns null for a linktree action or an unknown kind", () => {
    expect(miniActionSection("link:42")).toBeNull();
    expect(miniActionSection("mini:unknown:1")).toBeNull();
  });
});
