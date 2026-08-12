import { describe, expect, it } from "vitest";
import { deriveSubtitleColor } from "./theme-colors";

describe("deriveSubtitleColor", () => {
  it("uses the tenant color on every background", () => {
    expect(deriveSubtitleColor("#b6f20d")).toBe("#b6f20d");
    expect(deriveSubtitleColor("#111111")).toBe("#111111");
  });

  it("uses the primary tenant color from a gradient", () => {
    expect(deriveSubtitleColor("gradient:to-r:#123456:#abcdef")).toBe(
      "#123456",
    );
  });

  it("falls back to the MultiTree accent without a valid tenant color", () => {
    expect(deriveSubtitleColor(null)).toBe("#b6f20d");
  });
});
