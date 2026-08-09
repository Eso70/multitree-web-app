import { describe, expect, it } from "vitest";
import { shouldAdvanceModalWizardOnEnter } from "./modal-wizard-keyboard";

describe("modal wizard keyboard behavior", () => {
  it("advances from regular inputs with Enter", () => {
    expect(
      shouldAdvanceModalWizardOnEnter({
        key: "Enter",
        shiftKey: false,
        target: document.createElement("input"),
      }),
    ).toBe(true);
  });

  it("advances from textareas with Enter and preserves Shift+Enter", () => {
    const textarea = document.createElement("textarea");

    expect(
      shouldAdvanceModalWizardOnEnter({
        key: "Enter",
        shiftKey: false,
        target: textarea,
      }),
    ).toBe(true);
    expect(
      shouldAdvanceModalWizardOnEnter({
        key: "Enter",
        shiftKey: true,
        target: textarea,
      }),
    ).toBe(false);
  });

  it("leaves focused button activation to the button", () => {
    expect(
      shouldAdvanceModalWizardOnEnter({
        key: "Enter",
        shiftKey: false,
        target: document.createElement("button"),
      }),
    ).toBe(false);
  });
});
