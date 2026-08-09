import { describe, expect, it } from "vitest";
import { createMiniWebsiteDraft } from "./types";
import {
  validateCompleteMiniWebsite,
  validateMiniWebsiteStep,
} from "./validation";

function validDraft() {
  const draft = createMiniWebsiteDraft();
  draft.name = "Demo business";
  draft.slug = "demo-business";
  draft.headline = "A clear business title";
  draft.bio = "A short business description.";
  draft.avatar = "/images/DefaultAvatar.png";
  draft.professionTemplate = "custom";
  // Sections now drive validation: socials must be switched on for its links to
  // be required at all. It used to be hardcoded empty because nothing persisted.
  draft.sections = [{ key: "socials", enabled: true }];
  draft.content.heroBackgroundType = "color";
  draft.content.heroBackgroundColor = "#000000";
  draft.socialLinks = [
    {
      id: "whatsapp-1",
      platform: "whatsapp",
      url: "https://wa.me/9647501234567",
      value: "07501234567",
      countryCode: "964",
      displayName: "WhatsApp",
      enabled: true,
      order: 0,
    },
  ];
  return draft;
}

describe("mini website validation", () => {
  it("rejects an invalid page palette color", () => {
    const draft = validDraft();
    draft.accentColor = "red";

    expect(validateMiniWebsiteStep(draft, "identity").accentColor).toBeTruthy();
  });

  it.each([
    "to-r",
    "to-l",
    "to-b",
    "to-t",
    "to-br",
    "to-bl",
    "to-tr",
    "to-tl",
    "radial",
  ])("accepts the %s gradient for both mini website colors", (direction) => {
    const draft = validDraft();
    const gradient = `gradient:${direction}:#112233:#aabbcc`;
    draft.accentColor = gradient;
    draft.content.heroBackgroundColor = gradient;

    expect(validateMiniWebsiteStep(draft, "identity")).toEqual({});
  });

  it("starts new headline and about fields empty", () => {
    const draft = createMiniWebsiteDraft();

    expect(draft.headline).toBe("");
    expect(draft.bio).toBe("");
  });

  it("accepts a complete Mini Website with a social platform", () => {
    expect(validateCompleteMiniWebsite(validDraft())).toEqual({});
  });

  it("requires the basic identity fields", () => {
    const draft = validDraft();
    draft.name = "";
    draft.headline = "";
    draft.bio = "";
    draft.avatar = null;

    const errors = validateMiniWebsiteStep(draft, "identity");

    expect(errors.name).toBeTruthy();
    expect(errors.headline).toBeTruthy();
    expect(errors.bio).toBeTruthy();
    expect(errors.avatar).toBeTruthy();
  });

  it("requires a profession template before choosing website sections", () => {
    const draft = validDraft();
    draft.professionTemplate = "";

    expect(
      validateMiniWebsiteStep(draft, "template").professionTemplate,
    ).toBeTruthy();

    draft.professionTemplate = "doctor";
    expect(validateMiniWebsiteStep(draft, "template")).toEqual({});
  });

  it("requires the selected banner value", () => {
    const draft = validDraft();
    draft.content.heroBackgroundType = "image";
    draft.cover = null;

    expect(validateCompleteMiniWebsite(draft).heroBanner).toBeTruthy();
  });

  it("requires a platform before continuing to social links", () => {
    const draft = validDraft();
    draft.socialLinks = [];

    expect(validateMiniWebsiteStep(draft, "platforms").platforms).toBeTruthy();
  });

  it("validates the selected platform value", () => {
    const draft = validDraft();
    draft.socialLinks[0].value = "123";

    expect(
      validateMiniWebsiteStep(draft, "socialLinks")["social.whatsapp-1"],
    ).toBeTruthy();
  });
});
