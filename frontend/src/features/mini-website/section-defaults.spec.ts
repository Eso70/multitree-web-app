import { describe, expect, it } from "vitest";
import { createMiniWebsiteService } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { ensureEnabledSectionDefaults } from "./section-defaults";

const repeatableSections = [
  "location",
  "faq",
  "services",
  "booking",
  "team",
  "credentials",
  "shortVideos",
  "youtubeVideos",
  "stories",
  "partners",
  "reviews",
  "beforeAfter",
  "serviceAreas",
  "payments",
  "offers",
  "events",
  "audio",
  "whyChooseUs",
  "impactStats",
  "process",
  "documents",
  "ownedProperties",
  "education",
  "experience",
] as const;

describe("ensureEnabledSectionDefaults", () => {
  it("adds one editable item to every enabled repeatable section", () => {
    const draft = createMiniWebsiteDraft();
    draft.sections = repeatableSections.map((key) => ({
      key,
      enabled: true,
    }));

    const result = ensureEnabledSectionDefaults(draft);

    expect(result.locations).toHaveLength(1);
    expect(result.faq).toHaveLength(1);
    expect(result.services).toHaveLength(1);
    expect(result.bookings).toHaveLength(1);
    expect(result.team).toHaveLength(1);
    expect(result.certificates).toHaveLength(1);
    expect(result.videos).toHaveLength(1);
    expect(result.youtubeVideos).toHaveLength(1);
    expect(result.stories).toHaveLength(1);
    expect(result.partners).toHaveLength(1);
    expect(result.reviews).toHaveLength(1);
    expect(result.beforeAfter).toHaveLength(1);
    expect(result.coverage).toHaveLength(1);
    expect(result.paymentMethods).toHaveLength(1);
    expect(result.paymentMethods[0].name).toBeTruthy();
    expect(result.specialOffers).toHaveLength(1);
    expect(result.events).toHaveLength(1);
    expect(result.audio).toHaveLength(1);
    expect(result.advantages).toHaveLength(1);
    expect(result.impactStats).toHaveLength(1);
    expect(result.processSteps).toHaveLength(1);
    expect(result.documents).toHaveLength(1);
    expect(result.ownedProperties).toHaveLength(1);
    expect(result.education).toHaveLength(1);
    expect(result.experience).toHaveLength(1);
  });

  it("preserves existing items and leaves disabled sections empty", () => {
    const draft = createMiniWebsiteDraft();
    const existingService = createMiniWebsiteService("existing-service");
    draft.sections = [
      { key: "services", enabled: true },
      { key: "booking", enabled: false },
    ];
    draft.services = [existingService];

    const result = ensureEnabledSectionDefaults(draft);
    const repeated = ensureEnabledSectionDefaults(result);

    expect(result.services).toEqual([existingService]);
    expect(result.bookings).toEqual([]);
    expect(repeated.services).toEqual([existingService]);
  });
});
