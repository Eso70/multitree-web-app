import { describe, expect, it } from "vitest";
import {
  createMiniWebsiteBeforeAfter,
  createMiniWebsiteCoverageItem,
} from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";

describe("before/after and languages", () => {
  it("requires a complete image pair", () => {
    const comparison = {
      ...createMiniWebsiteBeforeAfter("comparison-1"),
      title: "Renovation",
      beforeImage: "/images/upload/before.png",
      afterImage: "/images/upload/after.png",
    };
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "beforeAfter", enabled: true }],
        beforeAfter: [comparison],
      },
      "socialLinks",
    );
    expect(errors["beforeAfter.0"]).toBeUndefined();

    const incomplete = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "beforeAfter", enabled: true }],
        beforeAfter: [{ ...comparison, afterImage: "" }],
      },
      "socialLinks",
    );
    expect(incomplete["beforeAfter.0"]).toBeTruthy();
  });

  it("accepts languages with names", () => {
    const language = {
      ...createMiniWebsiteCoverageItem("language", "language-1"),
      name: "Kurdish",
      detail: "Native",
    };
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "serviceAreas", enabled: true }],
        coverage: [language],
      },
      "socialLinks",
    );
    expect(errors["coverage.0"]).toBeUndefined();
  });
});
