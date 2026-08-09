import { describe, expect, it } from "vitest";
import {
  buildSlugFromName,
  transliterateKurdishToLatin,
} from "./modal-utils";

describe("Kurdish bio-link generation", () => {
  it.each([
    ["د. احمد", "dr-ahmed"],
    ["احمد کایە", "ahmed-kaya"],
    ["اسماعیل", "ismail"],
    ["وەفایی", "wafaye"],
    ["نازدار", "nazdar"],
    ["کورد", "kurd"],
    ["نادری مام ڕەسولی", "nadry-mam-rasuly"],
    ["سلێمانی ٢٠٢٦", "slemany-2026"],
  ])("turns %s into the stable Latin slug %s", (name, expected) => {
    expect(buildSlugFromName(name)).toBe(expected);
  });

  it("keeps the transliteration readable before slug formatting", () => {
    expect(transliterateKurdishToLatin("د. احمد")).toBe("dr ahmed");
  });

  it("keeps existing Latin names working", () => {
    expect(buildSlugFromName("Dr. Ahmed Kaya")).toBe("dr-ahmed-kaya");
  });
});
