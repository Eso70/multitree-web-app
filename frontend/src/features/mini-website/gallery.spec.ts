import { describe, expect, it } from "vitest";
import { createMiniWebsiteGalleryImage } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import type { MiniWebsiteDraft } from "./types";

function draftWith(overrides: Partial<MiniWebsiteDraft>): MiniWebsiteDraft {
  return { ...createMiniWebsiteDraft(), ...overrides };
}

describe("gallery section", () => {
  it("counts as a section on its own", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "gallery", enabled: true }],
        socialLinks: [],
        gallery: [createMiniWebsiteGalleryImage("/images/upload/a.png")],
      }),
      "platforms",
    );
    // Neither socials nor location is needed to publish a page of photos.
    expect(errors.sections).toBeUndefined();
    expect(errors.platforms).toBeUndefined();
  });

  it("demands at least one picture once it is switched on", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "gallery", enabled: true }],
        socialLinks: [],
        gallery: [],
      }),
      "socialLinks",
    );
    expect(errors.gallery).toBeTruthy();
  });

  it("ignores an entry that has a caption but no picture", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "gallery", enabled: true }],
        socialLinks: [],
        gallery: [{ ...createMiniWebsiteGalleryImage(""), caption: "ناونیشان" }],
      }),
      "socialLinks",
    );
    expect(errors.gallery).toBeTruthy();
  });

  it("says nothing while the section is off", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [
          { key: "gallery", enabled: false },
          { key: "socials", enabled: true },
        ],
        socialLinks: [
          {
            id: "website-1",
            platform: "website",
            url: "https://example.com",
            value: "https://example.com",
            enabled: true,
            order: 0,
          } as MiniWebsiteDraft["socialLinks"][number],
        ],
        gallery: [],
      }),
      "socialLinks",
    );
    expect(errors.gallery).toBeUndefined();
  });
});

describe("createMiniWebsiteGalleryImage", () => {
  it("gives every picture its own key", () => {
    const first = createMiniWebsiteGalleryImage("/images/upload/a.png");
    const second = createMiniWebsiteGalleryImage("/images/upload/b.png");
    expect(first.id).not.toBe(second.id);
    expect(first.caption).toBe("");
  });
});
