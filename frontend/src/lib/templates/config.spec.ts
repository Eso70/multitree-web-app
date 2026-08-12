import { describe, expect, it } from "vitest";
import { TEMPLATE_OPTIONS } from "./config";

describe("Linktree template catalog", () => {
  it("uses unique stable identifiers and scalable product names", () => {
    const ids = TEMPLATE_OPTIONS.map((template) => template.id);
    const names = TEMPLATE_OPTIONS.map((template) => template.name);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    expect(ids).toEqual([
      "spectrum",
      "spotlight",
      "frost",
      "aurora",
      "serenity",
    ]);
    expect(names).toEqual([
      "Spectrum",
      "Spotlight",
      "Frost",
      "Aurora",
      "Serenity",
    ]);
  });
});
