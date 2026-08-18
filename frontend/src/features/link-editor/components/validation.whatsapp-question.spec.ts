import { describe, expect, it } from "vitest";
import { validateWhatsappQuestion } from "./validation";

describe("validateWhatsappQuestion", () => {
  /**
   * A brand-new row starts empty. Flagging it the moment it appears would put
   * an error on the screen before the owner has typed anything.
   */
  it("accepts an untouched row", () => {
    expect(
      validateWhatsappQuestion({ text: "", message: "" }),
    ).toBeUndefined();
    expect(
      validateWhatsappQuestion({ text: "   ", message: "\n" }),
    ).toBeUndefined();
  });

  it("accepts a row with both halves filled in", () => {
    expect(
      validateWhatsappQuestion({ text: "داواکردن", message: "سڵاو" }),
    ).toBeUndefined();
  });

  /**
   * `createLinktree` drops a half-filled row with `if (!q.text || !q.message)
   * continue`, so the question silently vanishes on save without this.
   */
  it("flags the missing half of a half-filled row", () => {
    expect(validateWhatsappQuestion({ text: "داواکردن", message: " " })).toEqual({
      message: expect.any(String),
    });
    expect(validateWhatsappQuestion({ text: "", message: "سڵاو" })).toEqual({
      text: expect.any(String),
    });
  });
});
