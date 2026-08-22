import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorGradientModal } from "./ColorGradientModal";

/** The modal seeds its state inside `requestAnimationFrame`. */
async function flush() {
  for (let index = 0; index < 2; index += 1) {
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
  }
}

function open(value: string, onChange = vi.fn()) {
  const view = render(
    <ColorGradientModal
      isOpen
      value={value}
      onChange={onChange}
      onClose={vi.fn()}
    />,
  );
  return { view, onChange };
}

function hexField(base: HTMLElement) {
  return base.querySelector<HTMLInputElement>('input[placeholder="#000000"]')!;
}

function swatch(base: HTMLElement, rgb: string) {
  return Array.from(
    base.querySelectorAll<HTMLButtonElement>("button[style]"),
  ).find(
    (button) =>
      button.className.startsWith("h-9 w-9") &&
      button.style.backgroundColor.replace(/\s/g, "") === rgb,
  )!;
}

const APPLY = "جێبەجێکردن";

describe("ColorGradientModal hex entry", () => {
  it("lets a colour be typed one character at a time", async () => {
    const { view, onChange } = open("gradient:to-br:#ffffff:#0000ff");
    await flush();
    const field = hexField(view.baseElement);

    // Committing on every keystroke used to snap the field back to the old
    // colour, so a colour could only be replaced by pasting it whole.
    for (const step of ["", "#", "#0", "#00", "#000", "#0000", "#00000"]) {
      fireEvent.change(field, { target: { value: step } });
      expect(field.value).toBe(step);
    }

    fireEvent.change(field, { target: { value: "#000000" } });
    expect(field.value).toBe("#000000");

    fireEvent.click(screen.getByText(APPLY));
    expect(onChange).toHaveBeenCalledWith("gradient:to-br:#000000:#0000ff");
  });

  /**
   * `#abc` is valid CSS but the mini-website and onboarding validators accept
   * `#rrggbb` only, so a shorthand colour used to save straight into a 400.
   */
  it("expands a shorthand colour to the six digits the API accepts", async () => {
    const { view, onChange } = open("gradient:to-br:#ffffff:#0000ff");
    await flush();

    fireEvent.change(hexField(view.baseElement), { target: { value: "#abc" } });
    fireEvent.click(screen.getByText(APPLY));

    expect(onChange).toHaveBeenCalledWith("gradient:to-br:#aabbcc:#0000ff");
  });

  it("keeps the last whole colour when the draft is left incomplete", async () => {
    const { view, onChange } = open("gradient:to-br:#ffffff:#0000ff");
    await flush();
    const field = hexField(view.baseElement);

    fireEvent.change(field, { target: { value: "#0000" } });
    fireEvent.click(screen.getByText(APPLY));

    expect(onChange).toHaveBeenCalledWith("gradient:to-br:#ffffff:#0000ff");
  });

  it("restores the committed colour when the field is left", async () => {
    const { view } = open("gradient:to-br:#ffffff:#0000ff");
    await flush();
    const field = hexField(view.baseElement);

    fireEvent.change(field, { target: { value: "#00" } });
    fireEvent.blur(field);

    expect(field.value).toBe("#ffffff");
  });

  it("edits the second colour without disturbing the first", async () => {
    const { view, onChange } = open("gradient:to-br:#ffffff:#0000ff");
    await flush();

    fireEvent.click(screen.getByText("ڕەنگی دووەم"));
    fireEvent.change(hexField(view.baseElement), {
      target: { value: "#123456" },
    });
    fireEvent.click(screen.getByText(APPLY));

    expect(onChange).toHaveBeenCalledWith("gradient:to-br:#ffffff:#123456");
  });

  it("drops a half-typed draft when the other colour is selected", async () => {
    const { view } = open("gradient:to-br:#ffffff:#0000ff");
    await flush();

    fireEvent.change(hexField(view.baseElement), { target: { value: "#12" } });
    fireEvent.click(screen.getByText("ڕەنگی دووەم"));

    expect(hexField(view.baseElement).value).toBe("#0000ff");
  });

  it("still applies a colour chosen from the presets", async () => {
    const { view, onChange } = open("gradient:to-br:#ffffff:#0000ff");
    await flush();

    fireEvent.click(swatch(view.baseElement, "rgb(0,0,0)"));
    fireEvent.click(screen.getByText(APPLY));

    expect(onChange).toHaveBeenCalledWith("gradient:to-br:#000000:#0000ff");
  });

  it("reseeds from the stored value when reopened after a save", async () => {
    const onChange = vi.fn();
    const view = render(
      <ColorGradientModal
        isOpen={false}
        value="gradient:to-br:#ffffff:#0000ff"
        onChange={onChange}
        onClose={vi.fn()}
      />,
    );
    await flush();

    view.rerender(
      <ColorGradientModal
        isOpen
        value="gradient:to-br:#000000:#0000ff"
        onChange={onChange}
        onClose={vi.fn()}
      />,
    );
    await flush();

    expect(hexField(view.baseElement).value).toBe("#000000");
  });
});
