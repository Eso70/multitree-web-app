import { describe, expect, it } from "vitest";
import { createMiniWebsiteLocation } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import type { MiniWebsiteDraft } from "./types";

function draftWith(overrides: Partial<MiniWebsiteDraft>): MiniWebsiteDraft {
  return { ...createMiniWebsiteDraft(), ...overrides };
}

const placedPin = { ...createMiniWebsiteLocation(), lat: 36.19, lng: 44.0 };

describe("mini website section selection", () => {
  it("requires at least one section", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [
          { key: "socials", enabled: false },
          { key: "location", enabled: false },
        ],
      }),
      "platforms",
    );
    expect(errors.sections).toBeTruthy();
  });

  it("does not demand platforms when only location is on", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [
          { key: "socials", enabled: false },
          { key: "location", enabled: true },
        ],
        socialLinks: [],
        locations: [{ ...placedPin, city: "Erbil" }],
      }),
      "platforms",
    );
    // Socials being off must not block a location-only page.
    expect(errors.platforms).toBeUndefined();
    expect(errors.sections).toBeUndefined();
  });

  it("still demands platforms when socials is on", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "socials", enabled: true }],
        socialLinks: [],
      }),
      "platforms",
    );
    expect(errors.platforms).toBeTruthy();
  });
});

describe("mini website location validation", () => {
  const locationOn = [{ key: "location" as const, enabled: true }];

  // Location details are filled in on the third step, alongside the platform
  // links, so that is where they are checked. Step two only picks sections.
  it("does not block the section-picking step on missing details", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({ sections: locationOn, locations: [createMiniWebsiteLocation()] }),
      "platforms",
    );
    expect(errors["location.0.pin"]).toBeUndefined();
    expect(errors["location.0.address"]).toBeUndefined();
  });

  it("requires an address, area or city", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({ sections: locationOn, locations: [placedPin] }),
      "socialLinks",
    );
    expect(errors["location.0.address"]).toBeTruthy();
  });

  it("requires the pin to be placed", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: locationOn,
        locations: [{ ...createMiniWebsiteLocation(), city: "Erbil" }],
      }),
      "socialLinks",
    );
    expect(errors["location.0.pin"]).toBeTruthy();
  });

  it("accepts a complete location", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: locationOn,
        locations: [{ ...placedPin, address: "100m Road", city: "Erbil" }],
      }),
      "socialLinks",
    );
    expect(errors["location.0.pin"]).toBeUndefined();
    expect(errors["location.0.address"]).toBeUndefined();
  });

  it("rejects a map link that is not a URL", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: locationOn,
        locations: [{ ...placedPin, city: "Erbil", mapUrl: "not-a-url" }],
      }),
      "socialLinks",
    );
    expect(errors["location.0.mapUrl"]).toBeTruthy();
  });

  it("requires at least one location when the section is on", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({ sections: locationOn, locations: [] }),
      "socialLinks",
    );
    expect(errors.locations).toBeTruthy();
  });

  it("reports which branch is incomplete, not just that one is", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: locationOn,
        locations: [
          { ...placedPin, address: "100m Road" },
          { ...createMiniWebsiteLocation(), address: "Second branch" },
        ],
      }),
      "socialLinks",
    );
    // The first is complete; only the second is missing its pin.
    expect(errors["location.0.pin"]).toBeUndefined();
    expect(errors["location.1.pin"]).toBeTruthy();
  });

  it("defaults to an exact pin with a sane radius", () => {
    const location = createMiniWebsiteLocation();
    expect(location.precision).toBe("exact");
    expect(location.radiusMeters).toBeGreaterThan(0);
    expect(location.lat).toBeNull();
  });

  it("starts a new mini website with no section preselected", () => {
    const draft = createMiniWebsiteDraft();
    expect(draft.sections).toEqual([]);
    // The wizard cannot continue until the business picks one.
    expect(validateMiniWebsiteStep(draft, "platforms").sections).toBeTruthy();
  });
});
