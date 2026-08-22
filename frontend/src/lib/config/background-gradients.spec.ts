import { describe, expect, it } from "vitest";
import {
  DEFAULT_BACKGROUND_COLOR,
  getBackgroundGradient,
} from "./background-gradients";

/**
 * `gradient:direction:from:to` has one reader, `parseWebsiteGradient`. These
 * cases exist because this module used to carry a second, looser copy of that
 * format: it accepted 4- and 5-digit hex the canonical parser rejects, and it
 * kept the stops of a value whose direction the canonical parser refused. Both
 * produced CSS the browser drops, so the surface rendered with no background.
 */
describe("getBackgroundGradient custom gradient values", () => {
  it("keeps the owner's direction on the finished CSS", () => {
    expect(getBackgroundGradient("gradient:to-r:#ff0000:#0000ff")).toEqual({
      from: "#ff0000",
      via: "#ff0000",
      to: "#0000ff",
      backgroundCss: "linear-gradient(to right, #ff0000 0%, #0000ff 100%)",
    });
  });

  it("reads a radial gradient through the same parser", () => {
    expect(
      getBackgroundGradient("gradient:radial:#fff:#000")?.backgroundCss,
    ).toBe("radial-gradient(circle, #fff 0%, #000 100%)");
  });

  it.each(["#abcd", "#abcde"])(
    "refuses %s, a hex length the canonical parser rejects",
    (hex) => {
      const result = getBackgroundGradient(`gradient:to-r:${hex}:#000000`);

      expect(result.backgroundCss).toBeUndefined();
      expect(result.from).not.toBe(hex);
      expect(result).toEqual(getBackgroundGradient(DEFAULT_BACKGROUND_COLOR));
    },
  );

  it("refuses a direction that is not in the direction table", () => {
    const result = getBackgroundGradient("gradient:sideways:#ff0000:#0000ff");

    expect(result.backgroundCss).toBeUndefined();
    expect(result).toEqual(getBackgroundGradient(DEFAULT_BACKGROUND_COLOR));
  });

  it("still resolves preset and solid colours", () => {
    expect(getBackgroundGradient("#123456")).toEqual({
      from: "#123456",
      via: "#123456",
      to: "#123456",
      isSolid: true,
    });
    expect(getBackgroundGradient(null)).toEqual(
      getBackgroundGradient(DEFAULT_BACKGROUND_COLOR),
    );
  });
});
