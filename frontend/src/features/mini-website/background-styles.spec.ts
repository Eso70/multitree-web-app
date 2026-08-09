import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINI_WEBSITE_BACKGROUND_STYLES } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import {
  BACKGROUND_STYLE_OPTIONS,
  MiniWebsiteBackgroundPattern,
  MiniWebsiteBackgroundStyleField,
} from "./MiniWebsiteBackgroundStyleField";

afterEach(cleanup);

describe("Mini Website background styles", () => {
  it("keeps the existing grid as the backward-compatible default", () => {
    expect(createMiniWebsiteDraft().backgroundStyle).toBe("grid");
  });

  it("offers every supported style exactly once", () => {
    const values = BACKGROUND_STYLE_OPTIONS.map((option) => option.value);

    expect(values).toEqual([...MINI_WEBSITE_BACKGROUND_STYLES]);
    expect(new Set(values).size).toBe(values.length);
  });

  it("reports the style selected in the first-step field", () => {
    const onChange = vi.fn();
    render(
      createElement(MiniWebsiteBackgroundStyleField, {
        value: "grid",
        accent: "#2563eb",
        onChange,
      }),
    );

    fireEvent.click(screen.getByRole("radio", { name: "شەپۆل" }));

    expect(onChange).toHaveBeenCalledWith("waves");
    expect(screen.getAllByRole("radio")).toHaveLength(
      MINI_WEBSITE_BACKGROUND_STYLES.length,
    );
  });

  it.each([
    ["grid", "path"],
    ["grid45", "path"],
    ["dots", "circle"],
    ["diagonal", "path"],
    ["cross", "path"],
    ["circles", "circle"],
    ["waves", "path"],
    ["zigzag", "path"],
  ] as const)("renders the %s public pattern", (style, shape) => {
    const { container } = render(
      createElement(MiniWebsiteBackgroundPattern, {
        style,
        accent: "#2563eb",
      }),
    );

    expect(container.querySelector("pattern")).toBeInTheDocument();
    expect(container.querySelector(shape)).toBeInTheDocument();
  });

  it("renders no pattern when the saved style is none", () => {
    const { container } = render(
      createElement(MiniWebsiteBackgroundPattern, {
        style: "none",
        accent: "#2563eb",
      }),
    );

    expect(container).toBeEmptyDOMElement();
  });
});
