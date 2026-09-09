import { describe, expect, it } from "vitest";
import { deriveSubtitleColor } from "./theme-colors";

describe("deriveSubtitleColor", () => {
  it("uses the tenant color on every background", () => {
    expect(deriveSubtitleColor("#25F4EE")).toBe("#25f4ee");
    expect(deriveSubtitleColor("#111111")).toBe("#111111");
  });

  it("uses the primary tenant color from a gradient", () => {
    expect(deriveSubtitleColor("gradient:to-r:#123456:#abcdef")).toBe(
      "#123456",
    );
  });

  it("falls back to the Sponsor.krd accent without a valid tenant color", () => {
    expect(deriveSubtitleColor(null)).toBe("#25F4EE");
  });
});
