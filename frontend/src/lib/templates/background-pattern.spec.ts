import { describe, expect, it } from "vitest";
import {
  BACKGROUND_PATTERN_OPTIONS,
  backgroundPatternLabel,
  isBackgroundPatternStyle,
  readBackgroundPattern,
} from "@/lib/templates/background-pattern";
import {
  BACKGROUND_PATTERN_CONFIG_KEY,
  BACKGROUND_PATTERN_DEFAULT,
  BACKGROUND_PATTERN_STYLES,
} from "@linktree/types";

describe("background pattern catalogue", () => {
  /**
   * The picker renders one card per option and the renderer draws one SVG per
   * value; a value in one list and not the other is a blank card or an
   * unreachable pattern.
   */
  it("offers a labelled option for exactly the shared catalogue", () => {
    expect(BACKGROUND_PATTERN_OPTIONS.map((option) => option.value).sort()).toEqual(
      [...BACKGROUND_PATTERN_STYLES].sort(),
    );
    for (const option of BACKGROUND_PATTERN_OPTIONS) {
      expect(option.label.trim()).not.toBe("");
    }
  });

  it("names a pattern, falling back to the first option", () => {
    expect(backgroundPatternLabel("dots")).toBe(
      BACKGROUND_PATTERN_OPTIONS.find((o) => o.value === "dots")?.label,
    );
    expect(
      backgroundPatternLabel("hexagons" as never),
    ).toBe(BACKGROUND_PATTERN_OPTIONS[0].label);
  });

  it("recognises catalogue values only", () => {
    expect(isBackgroundPatternStyle("waves")).toBe(true);
    expect(isBackgroundPatternStyle("hexagons")).toBe(false);
    expect(isBackgroundPatternStyle(3)).toBe(false);
  });
});

describe("readBackgroundPattern", () => {
  it("reads the stored pattern out of a template config", () => {
    expect(
      readBackgroundPattern({ [BACKGROUND_PATTERN_CONFIG_KEY]: "zigzag" }),
    ).toBe("zigzag");
  });

  /**
   * Pages saved before the picker existed carry no key at all, and the server
   * strips an unrecognised one, so both have to land on the default rather
   * than on `undefined`.
   */
  it("falls back to the default for absent, unknown or malformed input", () => {
    expect(readBackgroundPattern({})).toBe(BACKGROUND_PATTERN_DEFAULT);
    expect(
      readBackgroundPattern({ [BACKGROUND_PATTERN_CONFIG_KEY]: "hexagons" }),
    ).toBe(BACKGROUND_PATTERN_DEFAULT);
    expect(readBackgroundPattern(null)).toBe(BACKGROUND_PATTERN_DEFAULT);
    expect(readBackgroundPattern("grid")).toBe(BACKGROUND_PATTERN_DEFAULT);
    expect(readBackgroundPattern(["grid"])).toBe(BACKGROUND_PATTERN_DEFAULT);
  });
});
