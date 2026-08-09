import { describe, expect, it } from "vitest";
import { createMiniWebsiteReview } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import type { MiniWebsiteDraft } from "./types";

function draftWith(overrides: Partial<MiniWebsiteDraft>): MiniWebsiteDraft {
  return { ...createMiniWebsiteDraft(), ...overrides };
}

const review = {
  ...createMiniWebsiteReview("review-1"),
  author: "ئارام",
  text: "خزمەتگوزارییەکە زۆر باش بوو.",
  rating: 5,
};

function errorsFor(reviews: MiniWebsiteDraft["reviews"]) {
  return validateMiniWebsiteStep(
    draftWith({
      sections: [{ key: "reviews", enabled: true }],
      socialLinks: [],
      reviews,
    }),
    "socialLinks",
  );
}

describe("reviews section", () => {
  it("counts as a section on its own", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "reviews", enabled: true }],
        socialLinks: [],
        reviews: [review],
      }),
      "platforms",
    );
    expect(errors.sections).toBeUndefined();
    expect(errors.platforms).toBeUndefined();
  });

  it("demands at least one review once it is switched on", () => {
    expect(errorsFor([]).reviews).toBeTruthy();
  });

  it("rejects a review missing either half", () => {
    // Stars on their own are not a review.
    expect(errorsFor([{ ...review, text: "" }])["review.0"]).toBeTruthy();
    expect(errorsFor([{ ...review, author: "" }])["review.0"]).toBeTruthy();
  });

  it("points at the row that is wrong", () => {
    const errors = errorsFor([review, { ...review, id: "r2", text: "" }]);
    expect(errors["review.1"]).toBeTruthy();
    expect(errors["review.0"]).toBeUndefined();
  });

  it("starts a new review at five stars", () => {
    expect(createMiniWebsiteReview().rating).toBe(5);
  });

  it("says nothing while the section is off", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [
          { key: "reviews", enabled: false },
          { key: "faq", enabled: true },
        ],
        socialLinks: [],
        faq: [{ id: "f", question: "پرسیار", answer: "وەڵام" }],
        reviews: [],
      }),
      "socialLinks",
    );
    expect(errors.reviews).toBeUndefined();
  });
});
