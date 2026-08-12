import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  TemplateBackdropDecorations,
  type TemplateDecorationVariant,
} from "./TemplateBackdropDecorations";

describe("TemplateBackdropDecorations", () => {
  it.each<TemplateDecorationVariant>([
    "spectrum",
    "spotlight",
    "frost",
    "aurora",
    "serenity",
  ])("renders the %s decoration without interactive content", (variant) => {
    const { container } = render(
      <TemplateBackdropDecorations
        variant={variant}
        accentColor="#b6f20d"
        secondaryColor="#8b5cf6"
      />,
    );

    const decoration = container.querySelector(
      `[data-template-decoration="${variant}"]`,
    );
    expect(decoration).toHaveAttribute("aria-hidden", "true");
    expect(decoration).toHaveClass("pointer-events-none");
  });
});
