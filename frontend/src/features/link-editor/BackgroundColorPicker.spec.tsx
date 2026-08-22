import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WEBSITE_GRADIENT_DIRECTIONS } from "@/lib/utils/parse-website-color";
import { BackgroundColorPicker } from "./BackgroundColorPicker";

describe("BackgroundColorPicker", () => {
  it("paints the custom swatch for every gradient direction", () => {
    // A local direction table here listed only four of the nine and emitted
    // `linear-gradient(, …)` for the rest — invalid CSS, so the swatch went
    // blank and the direction read as ignored.
    for (const direction of WEBSITE_GRADIENT_DIRECTIONS) {
      const view = render(
        <BackgroundColorPicker
          value={`gradient:${direction}:#ff0000:#0000ff`}
          onChange={vi.fn()}
        />,
      );

      const swatch = view.container.querySelector<HTMLElement>(
        'button[title="ئارەزوومەندانەیە"] span',
      );
      const background = swatch?.style.background || "";

      // jsdom drops a declaration it cannot parse, so a non-empty value is
      // itself the proof that the emitted CSS is valid. It also normalizes hex
      // to rgb().
      expect(background, `direction ${direction}`).not.toContain("(,");
      expect(background, `direction ${direction}`).toContain(
        direction === "radial" ? "radial-gradient" : "linear-gradient",
      );
      expect(background, `direction ${direction}`).toContain("rgb(255, 0, 0)");
      view.unmount();
    }
  });

  it("shows only common solid colors and keeps the custom picker", () => {
    render(
      <BackgroundColorPicker value="#ffffff" onChange={vi.fn()} />,
    );

    expect(screen.getByTitle("ئارەزوومەندانەیە")).toBeInTheDocument();
    expect(screen.getByTitle("White")).toBeInTheDocument();
    expect(screen.getByTitle("Black")).toBeInTheDocument();
    expect(screen.getByTitle("Green")).toBeInTheDocument();
    expect(screen.getByTitle("Yellow")).toBeInTheDocument();

    expect(screen.queryByTitle("Aurora")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Coral Sunset")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Midnight")).not.toBeInTheDocument();
  });

  it("omits the background image tile on surfaces that take no upload", () => {
    render(<BackgroundColorPicker value="#ffffff" onChange={vi.fn()} />);

    expect(screen.queryByLabelText("وێنەی باکگڕاوند")).not.toBeInTheDocument();
  });

  it("offers the background image tile when an upload handler is given", () => {
    render(
      <BackgroundColorPicker
        value="#ffffff"
        onChange={vi.fn()}
        onImageChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("وێنەی باکگڕاوند")).toBeInTheDocument();
    // Removal belongs to a background that exists.
    expect(screen.queryByLabelText("لابردنی وێنەی باکگڕاوند")).not.toBeInTheDocument();
  });

  it("drops the background image when a color is chosen instead", () => {
    const onChange = vi.fn();
    const onImageRemove = vi.fn();
    render(
      <BackgroundColorPicker
        value="#ffffff"
        onChange={onChange}
        imagePreview="/images/upload/businesses/acme/bg.png"
        onImageChange={vi.fn()}
        onImageRemove={onImageRemove}
      />,
    );

    expect(screen.getByLabelText("لابردنی وێنەی باکگڕاوند")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Green"));

    expect(onImageRemove).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("#22c55e");
  });
});
