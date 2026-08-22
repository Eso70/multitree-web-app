import { describe, expect, it } from "vitest";
import { getBackgroundGradient } from "@/lib/config/background-gradients";
import { WEBSITE_GRADIENT_DIRECTIONS } from "@/lib/utils/parse-website-color";
import { templateBackgroundStyle } from "./template-background";

const IMAGE = "/images/upload/businesses/acme/background-image/photo-1.png";
const GRADIENT = "linear-gradient(to bottom right, #111111, #222222, #333333)";

describe("custom gradient direction", () => {
  // Every template composes its own `to bottom right` recipe from from/via/to,
  // which cannot carry a direction. Saving a new direction therefore repainted
  // nothing until the parsed CSS started travelling with the theme.
  it("renders each direction the owner picked instead of the template recipe", () => {
    const rendered = WEBSITE_GRADIENT_DIRECTIONS.map((direction) => {
      const theme = getBackgroundGradient(
        `gradient:${direction}:#ff0000:#0000ff`,
      );
      return templateBackgroundStyle(theme, GRADIENT).background as string;
    });

    for (const [index, background] of rendered.entries()) {
      const direction = WEBSITE_GRADIENT_DIRECTIONS[index];
      expect(background, `direction ${direction}`).not.toBe(GRADIENT);
      expect(background, `direction ${direction}`).toContain(
        direction === "radial" ? "radial-gradient" : "linear-gradient",
      );
    }

    // Nine directions must produce nine distinct surfaces; collapsing any two
    // is the bug returning.
    expect(new Set(rendered).size).toBe(WEBSITE_GRADIENT_DIRECTIONS.length);
  });

  it("still uses the template recipe for a named preset colour", () => {
    const style = templateBackgroundStyle(
      getBackgroundGradient("#1e40af"),
      GRADIENT,
    );

    expect(style.background).toBe(GRADIENT);
  });

  it("keeps a plain hex solid rather than gradient CSS", () => {
    const style = templateBackgroundStyle(
      getBackgroundGradient("#22c55e"),
      GRADIENT,
    );

    expect(style.background).toBe("#22c55e");
  });
});

describe("templateBackgroundStyle", () => {
  it("keeps the template's own gradient when no image is set", () => {
    const style = templateBackgroundStyle(
      { from: "#111111", via: "#222222", to: "#333333" },
      GRADIENT,
    );

    expect(style.background).toBe(GRADIENT);
  });

  it("keeps a solid colour flat", () => {
    const style = templateBackgroundStyle(
      { from: "#eab308", via: "#eab308", to: "#eab308", isSolid: true },
      GRADIENT,
    );

    expect(style.background).toBe("#eab308");
  });

  it("replaces the gradient with the uploaded image", () => {
    const style = templateBackgroundStyle(
      { from: "#111111", via: "#222222", to: "#333333", backgroundImage: IMAGE },
      GRADIENT,
    );

    expect(style.background).toContain(`url("${IMAGE}")`);
    expect(style.background).not.toContain(GRADIENT);
  });

  it("veils a photo darkly when the palette produced light text", () => {
    const style = templateBackgroundStyle(
      { from: "#000000", via: "#000000", to: "#000000", backgroundImage: IMAGE },
      GRADIENT,
    );

    expect(style.background).toContain("rgba(0, 0, 0, 0.45)");
  });

  it("veils a photo lightly when the palette produced dark text", () => {
    const style = templateBackgroundStyle(
      { from: "#ffffff", via: "#ffffff", to: "#ffffff", backgroundImage: IMAGE },
      GRADIENT,
    );

    expect(style.background).toContain("rgba(255, 255, 255, 0.45)");
  });
});
