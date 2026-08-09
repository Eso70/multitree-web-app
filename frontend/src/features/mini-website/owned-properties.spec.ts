import { describe, expect, it } from "vitest";
import { createMiniWebsiteOwnedProperty } from "@linktree/types";
import {
  detectOwnedPropertyType,
  ownedPropertyButtonLabel,
} from "./owned-property-links";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";

describe("owned brands and pages", () => {
  it("detects supported platforms and their public button labels", () => {
    expect(detectOwnedPropertyType("https://facebook.com/example")).toBe(
      "facebook",
    );
    expect(detectOwnedPropertyType("https://instagram.com/example")).toBe(
      "instagram",
    );
    expect(detectOwnedPropertyType("https://youtube.com/@example")).toBe(
      "youtube",
    );
    expect(detectOwnedPropertyType("https://example.com")).toBe("website");
    expect(ownedPropertyButtonLabel("youtube")).toBe("سەردانی کەناڵی YouTube");
  });

  it("requires a name, relationship, and secure official link", () => {
    const property = {
      ...createMiniWebsiteOwnedProperty("property-1"),
      name: "Example Media",
      relationship: "Founder",
      propertyType: "youtube" as const,
      url: "https://youtube.com/@example",
    };
    const valid = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "ownedProperties", enabled: true }],
        ownedProperties: [property],
      },
      "socialLinks",
    );
    expect(valid["ownedProperty.0"]).toBeUndefined();

    const invalid = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "ownedProperties", enabled: true }],
        ownedProperties: [{ ...property, url: "http://example.com" }],
      },
      "socialLinks",
    );
    expect(invalid["ownedProperty.0"]).toBeTruthy();
  });
});
