import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateViewportLayout } from "./TemplateViewportLayout";

describe("TemplateViewportLayout", () => {
  it("keeps the header, main region, and footer in natural flow", () => {
    const { container } = render(
      <TemplateViewportLayout
        isPreview
        header={<header>Profile</header>}
        main={<button type="button">Contact</button>}
        footer={<footer>Footer</footer>}
      />,
    );

    const layout = container.querySelector("[data-template-viewport-layout]");
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    const footer = screen.getByRole("contentinfo");

    expect(layout).toHaveClass("min-h-full");
    expect(layout).not.toHaveClass("flex");
    expect(main).not.toHaveClass("flex-1", "items-center");
    expect(
      header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses the small viewport height for public pages", () => {
    const { container } = render(
      <TemplateViewportLayout
        isPreview={false}
        header={<header>Profile</header>}
        main={<div>Actions</div>}
        footer={<footer>Footer</footer>}
      />,
    );

    expect(
      container.querySelector("[data-template-viewport-layout]"),
    ).toHaveClass("min-h-[100svh]");
  });
});
