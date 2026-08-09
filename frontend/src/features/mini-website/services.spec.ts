import { describe, expect, it } from "vitest";
import { createMiniWebsiteService } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import { buildActionHref, serviceActionHref } from "./service-action";
import type { MiniWebsiteDraft } from "./types";

function draftWith(overrides: Partial<MiniWebsiteDraft>): MiniWebsiteDraft {
  return { ...createMiniWebsiteDraft(), ...overrides };
}

const offer = {
  ...createMiniWebsiteService("service-1"),
  title: "چاککردنەوەی مۆبایل",
  price: "٢٥,٠٠٠ د.ع",
  actionType: "whatsapp" as const,
  actionValue: "7501234567",
  actionCountryCode: "964",
};

function errorsFor(services: MiniWebsiteDraft["services"]) {
  return validateMiniWebsiteStep(
    draftWith({
      sections: [{ key: "services", enabled: true }],
      socialLinks: [],
      services,
    }),
    "socialLinks",
  );
}

describe("buildActionHref", () => {
  it("builds a WhatsApp address from a national number", () => {
    expect(buildActionHref("whatsapp", "07501234567", "964")).toBe(
      "https://wa.me/9647501234567",
    );
  });

  it("builds a dialable number", () => {
    expect(buildActionHref("phone", "7501234567", "964")).toBe(
      "tel:+9647501234567",
    );
  });

  it("takes a link only when it is one", () => {
    expect(buildActionHref("link", "https://example.com", "964")).toBe(
      "https://example.com",
    );
    // Anything that is not http(s) yields nothing, so the button is hidden
    // rather than published as a dead or dangerous destination.
    expect(buildActionHref("link", "javascript:alert(1)", "964")).toBe("");
    expect(buildActionHref("link", "example.com", "964")).toBe("");
  });

  it("has no destination when the button is switched off", () => {
    expect(buildActionHref("none", "7501234567", "964")).toBe("");
  });

  it("prefers the destination the server already built", () => {
    expect(
      serviceActionHref({ ...offer, url: "https://wa.me/9647777777777" }),
    ).toBe("https://wa.me/9647777777777");
  });
});

describe("services section", () => {
  it("counts as a section on its own", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "services", enabled: true }],
        socialLinks: [],
        services: [offer],
      }),
      "platforms",
    );
    expect(errors.sections).toBeUndefined();
    expect(errors.platforms).toBeUndefined();
  });

  it("demands at least one offer once it is switched on", () => {
    expect(errorsFor([]).services).toBeTruthy();
  });

  it("accepts an offer with only a name and no button", () => {
    expect(
      errorsFor([
        { ...createMiniWebsiteService("s"), title: "خزمەت", actionType: "none" },
      ])["service.0"],
    ).toBeUndefined();
  });

  it("rejects an offer with no name", () => {
    expect(errorsFor([{ ...offer, title: "" }])["service.0"]).toBeTruthy();
  });

  it("rejects a button asked for but left empty", () => {
    expect(errorsFor([{ ...offer, actionValue: "" }])["service.0"]).toBeTruthy();
  });

  it("rejects a link that is not a web address", () => {
    expect(
      errorsFor([
        { ...offer, actionType: "link", actionValue: "javascript:alert(1)" },
      ])["service.0"],
    ).toBeTruthy();
  });

  it("points at the row that is wrong", () => {
    const errors = errorsFor([offer, { ...offer, id: "s2", title: "" }]);
    expect(errors["service.1"]).toBeTruthy();
    expect(errors["service.0"]).toBeUndefined();
  });

  it("says nothing while the section is off", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [
          { key: "services", enabled: false },
          { key: "faq", enabled: true },
        ],
        socialLinks: [],
        faq: [{ id: "f", question: "پرسیار", answer: "وەڵام" }],
        services: [],
      }),
      "socialLinks",
    );
    expect(errors.services).toBeUndefined();
  });
});
