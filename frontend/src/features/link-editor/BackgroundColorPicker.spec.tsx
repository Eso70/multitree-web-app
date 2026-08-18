import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BackgroundColorPicker } from "./BackgroundColorPicker";

describe("BackgroundColorPicker", () => {
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
