import { describe, expect, it } from "vitest";
import { FaFacebookF, FaTelegramPlane } from "react-icons/fa";
import { TikTokMark, YouTubeMark } from "./marks";
import {
  getPlatformBrand,
  platformAccentColor,
  platformBackground,
  platformBorder,
  platformForeground,
  isSelfColored,
  markFillsChip,
  platformIconClass,
  platformIconStyle,
  platformOutline,
  platformTextStyle,
  PLATFORM_BRANDS,
} from "./platform-brands";

describe("platform brand registry", () => {
  it("uses the official brand color for solid-fill platforms", () => {
    expect(platformBackground("whatsapp")).toBe("#25D366");
    expect(platformBackground("snapchat")).toBe("#FFFC00");
    expect(platformBackground("youtube")).toBe("transparent");
  });

  it("uses a gradient for the brands that ship one", () => {
    expect(platformBackground("telegram")).toContain("linear-gradient");
    expect(platformBackground("telegram")).toContain("#2AABEE");
    expect(platformBackground("instagram")).toContain("linear-gradient");
    // Facebook's app icon fades into #0866FF, its current brand blue.
    expect(platformBackground("facebook")).toContain("linear-gradient");
    expect(platformBackground("facebook")).toContain("#0866FF");
  });

  it("fills glyphs white on every single-color brand background", () => {
    for (const id of Object.keys(PLATFORM_BRANDS)) {
      // Full-color marks sit on a light surface instead, so they are excluded.
      if (isSelfColored(id)) continue;
      expect(platformForeground(id)).toBe("#FFFFFF");
    }
  });

  it("outlines only Snapchat, whose white ghost sits on yellow", () => {
    expect(platformOutline("snapchat")).toBe("#000000");
    const outlined = Object.keys(PLATFORM_BRANDS).filter((id) => platformOutline(id));
    expect(outlined).toEqual(["snapchat"]);
  });

  it("gives Snapchat's label a black keyline so white text stays readable", () => {
    const snapchat = platformTextStyle("snapchat");
    expect(snapchat.color).toBe("#FFFFFF");
    expect(snapchat.WebkitTextStrokeColor).toBe("#000000");
    expect(snapchat.paintOrder).toBe("stroke fill");

    // A brand with enough contrast gets no keyline.
    expect(platformTextStyle("facebook").WebkitTextStrokeColor).toBeUndefined();
  });

  it("lets the keyline paint outside the viewBox so it is not clipped", () => {
    // Simple Icons glyphs touch the edges of their 24-unit viewBox, so the outer
    // half of the stroke is cut off unless the svg is allowed to overflow.
    expect(platformIconClass("snapchat")).toContain("overflow-visible");
    expect(platformIconClass("facebook")).toBe("");
  });

  it("keeps the keyline but drops the fill when the glyph inherits its color", () => {
    expect(platformIconStyle("snapchat", undefined, "inherit")).toEqual({
      stroke: "#000000",
    });
    expect(platformIconStyle("snapchat", undefined, "brand")).toEqual({
      color: "#FFFFFF",
      stroke: "#000000",
    });
  });

  it("lets a business-supplied color override brand paint", () => {
    expect(platformBackground("snapchat", "#123456")).toBe("#123456");
    expect(platformForeground("snapchat", "#123456")).toBe("#FFFFFF");
    // The custom background is unknown to us, so the brand keyline no longer applies.
    expect(platformOutline("snapchat", "#123456")).toBeUndefined();
  });

  it("ignores a blank custom color rather than painting nothing", () => {
    expect(platformBackground("whatsapp", "   ")).toBe("#25D366");
  });

  it("uses bare glyphs, never a mark that encloses itself in a filled shape", () => {
    // An enclosing disc or square inverts on the brand fill: a white blob with
    // the glyph cut out of it, instead of a white glyph on brand color. Simple
    // Icons ships both Facebook and Telegram that way.
    expect(getPlatformBrand("facebook").icon).toBe(FaFacebookF);
    expect(getPlatformBrand("telegram").icon).toBe(FaTelegramPlane);
  });

  it("gives pure-black brands a rim so they read on dark pages", () => {
    // X and TikTok are #000000 — with no edge they vanish into a dark template.
    expect(platformBorder("tiktok")).toBe("rgba(255, 255, 255, 0.35)");
    expect(platformBorder("twitter")).toBe("rgba(255, 255, 255, 0.35)");
    expect(platformBorder("x")).toBe("rgba(255, 255, 255, 0.35)");

    // Brands with their own contrast get none.
    expect(platformBorder("whatsapp")).toBeUndefined();
    expect(platformBorder("facebook")).toBeUndefined();
    // A custom color is the business's call, so we stop adding chrome to it.
    expect(platformBorder("tiktok", "#123456")).toBeUndefined();
  });

  it("resolves a flat accent even for gradient brands", () => {
    expect(platformAccentColor("instagram")).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(platformAccentColor("telegram")).toBe("#2AABEE");
  });

  describe("full-color marks", () => {
    it("draws YouTube as its own two-tone logo on a transparent chip", () => {
      expect(getPlatformBrand("youtube").icon).toBe(YouTubeMark);
      expect(isSelfColored("youtube")).toBe(true);
      // No brand fill behind it — the mark supplies its own red badge.
      expect(platformBackground("youtube")).toBe("transparent");
    });

    it("never recolors a full-color mark", () => {
      expect(platformIconStyle("youtube")).toEqual({});
      expect(platformIconStyle("youtube", undefined, "inherit")).toEqual({});
    });

    it("gives public-page buttons a white fill so the red badge stays visible", () => {
      // Templates build the button from `stops`. A red button would swallow the
      // red badge, so the surface is white and the label goes near-black.
      expect(getPlatformBrand("youtube").stops).toEqual(["#FFFFFF", "#FFFFFF", "#FFFFFF"]);
      expect(platformTextStyle("youtube").color).toBe("#0F0F0F");
    });

    it("hands control back when the business picks its own color", () => {
      expect(isSelfColored("youtube", "#123456")).toBe(false);
      expect(platformIconStyle("youtube", "#123456")).toEqual({ color: "#FFFFFF" });
    });

    it("treats single-color brands as recolorable", () => {
      expect(isSelfColored("facebook")).toBe(false);
      expect(isSelfColored("snapchat")).toBe(false);
    });

    it("keeps TikTok's split-channel note on its own black chip", () => {
      expect(getPlatformBrand("tiktok").icon).toBe(TikTokMark);
      expect(isSelfColored("tiktok")).toBe(true);
      expect(platformIconStyle("tiktok")).toEqual({});
      // The note is inset on the black fill, unlike YouTube's badge which is
      // the chip itself.
      expect(platformBackground("tiktok")).toBe("#000000");
      expect(markFillsChip("tiktok")).toBe(false);
      expect(markFillsChip("youtube")).toBe(true);
    });
  });

  it("falls back to the neutral custom brand for unknown platforms", () => {
    expect(getPlatformBrand("myspace")).toBe(PLATFORM_BRANDS.custom);
  });
});
