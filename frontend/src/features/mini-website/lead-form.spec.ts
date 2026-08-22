import { describe, expect, it } from "vitest";
import {
  MINI_WEBSITE_MAX_LEAD_FIELD_OPTIONS,
  createMiniWebsiteLeadField,
  createMiniWebsiteLeadForm,
  createMiniWebsitePlan,
  miniWebsitePlanFeatureRows,
} from "@linktree/types";
import { ensureEnabledSectionDefaults } from "./section-defaults";
import {
  claimLeadFieldMapping,
  parseLeadFieldOptions,
} from "./lead-form-options";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import type { MiniWebsiteDraft, MiniWebsiteLeadForm } from "./types";

function draftWith(overrides: Partial<MiniWebsiteDraft>): MiniWebsiteDraft {
  return { ...createMiniWebsiteDraft(), ...overrides };
}

function formWith(
  overrides: Partial<MiniWebsiteLeadForm>,
): MiniWebsiteLeadForm {
  return { ...createMiniWebsiteLeadForm(), ...overrides };
}

const phone = {
  ...createMiniWebsiteLeadField("phone", "field-phone"),
  label: "ژمارەی مۆبایل",
  required: true,
};

describe("lead form section", () => {
  it("starts already asking for a name and a way to reply", () => {
    const form = createMiniWebsiteLeadForm();
    expect(form.fields.some((field) => field.mapping === "name")).toBe(true);
    expect(
      form.fields.some((field) => field.mapping === "phone" && field.required),
    ).toBe(true);
  });

  it("demands a required email or phone question", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "leadForm", enabled: true }],
        socialLinks: [],
        leadForm: formWith({
          fields: [
            {
              ...createMiniWebsiteLeadField("text", "field-name"),
              label: "ناو",
              mapping: "name",
              required: true,
            },
          ],
        }),
      }),
      "socialLinks",
    );
    expect(errors.leadForm).toBeTruthy();
  });

  it("accepts a form that can be replied to", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "leadForm", enabled: true }],
        socialLinks: [],
        leadForm: formWith({ fields: [phone] }),
      }),
      "socialLinks",
    );
    expect(errors.leadForm).toBeUndefined();
  });

  it("points at the question whose type and CRM mapping disagree", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "leadForm", enabled: true }],
        socialLinks: [],
        leadForm: formWith({
          fields: [
            phone,
            {
              ...createMiniWebsiteLeadField("select", "field-city"),
              label: "شار",
              mapping: "email",
              options: ["هەولێر"],
            },
          ],
        }),
      }),
      "socialLinks",
    );
    expect(errors["leadField.1"]).toBeTruthy();
  });

  it("rejects a second question claiming the same CRM slot", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "leadForm", enabled: true }],
        socialLinks: [],
        leadForm: formWith({
          fields: [
            phone,
            {
              ...createMiniWebsiteLeadField("phone", "field-landline"),
              label: "تەلەفۆنی ماڵ",
              mapping: "phone",
            },
          ],
        }),
      }),
      "socialLinks",
    );
    expect(errors["leadField.1"]).toBeTruthy();
  });

  it("rejects a dropdown with no choices", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "leadForm", enabled: true }],
        socialLinks: [],
        leadForm: formWith({
          fields: [
            phone,
            {
              ...createMiniWebsiteLeadField("select", "field-city"),
              label: "شار",
            },
          ],
        }),
      }),
      "socialLinks",
    );
    expect(errors["leadField.1"]).toBeTruthy();
  });

  it("will not demand consent to a sentence that was never written", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "leadForm", enabled: true }],
        socialLinks: [],
        leadForm: formWith({
          fields: [phone],
          consentText: "   ",
          consentRequired: true,
        }),
      }),
      "socialLinks",
    );
    expect(errors.leadFormConsent).toBeTruthy();
  });

  it("reads a dropdown's choices one to a line, without repeats", () => {
    expect(
      parseLeadFieldOptions(
        " هەولێر \n\nسلێمانی\nهەولێر\n",
        MINI_WEBSITE_MAX_LEAD_FIELD_OPTIONS,
      ),
    ).toEqual(["هەولێر", "سلێمانی"]);
  });
});

describe("pricing section", () => {
  const basic = {
    ...createMiniWebsitePlan("plan-basic"),
    name: "سادە",
    price: "50,000",
    features: ["پشتیوانی ئیمەیل"],
    actionType: "none" as const,
  };
  const pro = {
    ...createMiniWebsitePlan("plan-pro"),
    name: "باش",
    price: "120,000",
    features: ["پشتیوانی ئیمەیل", "پشتیوانی ٢٤/٧"],
    actionType: "none" as const,
  };

  it("seeds two tiers, because one card is a price not a choice", () => {
    const draft = ensureEnabledSectionDefaults(
      draftWith({ sections: [{ key: "pricing", enabled: true }] }),
    );
    expect(draft.plans).toHaveLength(2);
  });

  it("rejects a table with a single tier", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "pricing", enabled: true }],
        socialLinks: [],
        plans: [basic],
      }),
      "socialLinks",
    );
    expect(errors.plans).toBeTruthy();
  });

  it("accepts two complete tiers", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "pricing", enabled: true }],
        socialLinks: [],
        plans: [basic, pro],
      }),
      "socialLinks",
    );
    expect(errors.plans).toBeUndefined();
    expect(errors["plan.0"]).toBeUndefined();
    expect(errors["plan.1"]).toBeUndefined();
  });

  it("points at the tier that lists nothing", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "pricing", enabled: true }],
        socialLinks: [],
        plans: [basic, { ...pro, features: [] }],
      }),
      "socialLinks",
    );
    expect(errors["plan.1"]).toBeTruthy();
  });

  it("allows only one recommended tier", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "pricing", enabled: true }],
        socialLinks: [],
        plans: [
          { ...basic, featured: true },
          { ...pro, featured: true },
        ],
      }),
      "socialLinks",
    );
    expect(errors.plans).toBeTruthy();
  });

  it("builds the comparison rows from every tier's features", () => {
    // A feature only the top tier lists still becomes a row, so the cheaper
    // tier renders it as a gap rather than leaving it out entirely.
    expect(miniWebsitePlanFeatureRows([basic, pro])).toEqual([
      "پشتیوانی ئیمەیل",
      "پشتیوانی ٢٤/٧",
    ]);
  });

  it("rejects a tier whose button points nowhere", () => {
    const errors = validateMiniWebsiteStep(
      draftWith({
        sections: [{ key: "pricing", enabled: true }],
        socialLinks: [],
        plans: [basic, { ...pro, actionType: "link", actionValue: "nope" }],
      }),
      "socialLinks",
    );
    expect(errors["plan.1"]).toBeTruthy();
  });
});

/**
 * The server gives each CRM slot to one question and demotes every later claim,
 * so the editor moves the claim instead of letting two questions hold it and
 * saying nothing.
 */
describe("claimLeadFieldMapping", () => {
  const fields = [
    { ...createMiniWebsiteLeadField("email"), id: "a", mapping: "email" },
    { ...createMiniWebsiteLeadField("phone"), id: "b", mapping: "phone" },
    { ...createMiniWebsiteLeadField("email"), id: "c", mapping: "none" },
  ] as MiniWebsiteLeadForm["fields"];

  it("takes a slot off the question that was holding it", () => {
    const next = claimLeadFieldMapping(fields, 2, "email");
    expect(next.map((field) => field.mapping)).toEqual([
      "none",
      "phone",
      "email",
    ]);
  });

  it("leaves the other questions alone", () => {
    const next = claimLeadFieldMapping(fields, 2, "email");
    expect(next[1]).toBe(fields[1]);
  });

  it("lets any number of questions hold no slot at all", () => {
    const next = claimLeadFieldMapping(fields, 0, "none");
    expect(next.map((field) => field.mapping)).toEqual([
      "none",
      "phone",
      "none",
    ]);
  });

  it("is a no-op when the question already holds the slot", () => {
    expect(
      claimLeadFieldMapping(fields, 0, "email").map((field) => field.mapping),
    ).toEqual(["email", "phone", "none"]);
  });
});
