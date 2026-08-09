import { describe, expect, it } from "vitest";
import { createMiniWebsiteExperience } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateCompleteMiniWebsite } from "./validation";

describe("experience section", () => {
  it("accepts a current position without an end date", () => {
    const entry = {
      ...createMiniWebsiteExperience("work-1"),
      title: "ئەندازیار",
      organization: "کۆمپانیا",
      startDate: "2024-01-01",
    };
    const draft = createMiniWebsiteDraft();
    draft.sections = [{ key: "experience", enabled: true }];
    draft.experience = [entry];

    expect(validateCompleteMiniWebsite(draft).experience).toBeUndefined();
    expect(validateCompleteMiniWebsite(draft)["experience.0"]).toBeUndefined();
  });

  it("requires a valid end date for completed work", () => {
    const entry = {
      ...createMiniWebsiteExperience("work-2"),
      title: "بەڕێوەبەر",
      organization: "دامەزراوە",
      startDate: "2025-01-01",
      endDate: "2024-01-01",
      status: "completed" as const,
    };
    const draft = createMiniWebsiteDraft();
    draft.sections = [{ key: "experience", enabled: true }];
    draft.experience = [entry];

    expect(validateCompleteMiniWebsite(draft)["experience.0"]).toBeTruthy();
  });
});
