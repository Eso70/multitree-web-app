import { describe, expect, it } from "vitest";
import { templateBackgroundStyle } from "./template-background";

const IMAGE = "/images/upload/businesses/acme/background-image/photo-1.png";
const GRADIENT = "linear-gradient(to bottom right, #111111, #222222, #333333)";

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
