import { describe, expect, it } from "vitest";
import { createMiniWebsiteFaqEntry } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import type { MiniWebsiteDraft } from "./types";

function draftWith(overrides: Partial<MiniWebsiteDraft>): MiniWebsiteDraft {
  return { ...createMiniWebsiteDraft(), ...overrides };
}

const answered = {
  ...createMiniWebsiteFaqEntry("faq-1"),
  question: "چۆن داواکاری بنێرم؟",
  answer: "لە ڕێگەی واتساپەوە.",
};

describe("faq section", () => {
  it("counts as a section on its own", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "faq", enabled: true }],
        socialLinks: [],
        faq: [answered],
      }),
      "platforms",
    );
    expect(errors.sections).toBeUndefined();
    expect(errors.platforms).toBeUndefined();
  });

  it("demands at least one question once it is switched on", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "faq", enabled: true }],
        socialLinks: [],
        faq: [],
      }),
      "socialLinks",
    );
    expect(errors.faq).toBeTruthy();
  });

  it("points at the row that is half filled in", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "faq", enabled: true }],
        socialLinks: [],
        faq: [answered, { ...createMiniWebsiteFaqEntry("faq-2"), question: "نرخ چەندە؟" }],
      }),
      "socialLinks",
    );
    // Keyed by index, so the second card shows the message rather than the first.
    expect(errors["faq.1"]).toBeTruthy();
    expect(errors["faq.0"]).toBeUndefined();
  });

  it("says nothing while the section is off", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [
          { key: "faq", enabled: false },
          { key: "gallery", enabled: true },
        ],
        socialLinks: [],
        gallery: [{ id: "g-1", image: "/images/upload/a.png", caption: "" }],
        faq: [],
      }),
      "socialLinks",
    );
    expect(errors.faq).toBeUndefined();
  });
});
