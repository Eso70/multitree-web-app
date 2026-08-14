import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MINI_WEBSITE_BACKGROUND_STYLES } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import {
  BACKGROUND_STYLE_OPTIONS,
  MiniWebsiteBackgroundPattern,
} from "./mini-website-background-styles";
import { MiniWebsiteBackgroundStyleField } from "./MiniWebsiteBackgroundStyleField";

afterEach(cleanup);

describe("Mini Website background styles", () => {
  it("starts a new draft with no pattern", () => {
    expect(createMiniWebsiteDraft().backgroundStyle).toBe("none");
  });

  it("offers every supported style exactly once", () => {
    const values = BACKGROUND_STYLE_OPTIONS.map((option) => option.value);

    expect(values).toEqual([...MINI_WEBSITE_BACKGROUND_STYLES]);
    expect(new Set(values).size).toBe(values.length);
  });

  it("opens the picker modal and reports the style selected there", async () => {
    const onChange = vi.fn();
    render(
      createElement(MiniWebsiteBackgroundStyleField, {
        value: "grid",
        onChange,
      }),
    );

    // The field itself is a single trigger; the options live in the modal.
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveTextContent("تۆڕ");

    fireEvent.click(trigger);

    // The portal gates on a mount frame before it renders.
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(
      MINI_WEBSITE_BACKGROUND_STYLES.length,
    );

    fireEvent.click(screen.getByRole("radio", { name: "شەپۆل" }));

    expect(onChange).toHaveBeenCalledWith("waves");
    // Selecting closes the modal.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
