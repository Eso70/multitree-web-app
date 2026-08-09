import { describe, expect, it } from "vitest";
import {
  getMiniWebsiteTemplateComponent,
  MINI_WEBSITE_TEMPLATE_COMPONENTS,
  MINI_WEBSITE_TEMPLATE_DEFAULT_ID,
  MINI_WEBSITE_TEMPLATE_OPTIONS,
} from "./index";
import { MULTITREE_MINI_WEBSITE_PREVIEW } from "./preview-data";

describe("mini website template catalog", () => {
  it("registers every template exactly once", () => {
    const ids = MINI_WEBSITE_TEMPLATE_OPTIONS.map((template) => template.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(MINI_WEBSITE_TEMPLATE_COMPONENTS)).toEqual(ids);
    expect(ids).toContain(MINI_WEBSITE_TEMPLATE_DEFAULT_ID);
  });

  it("falls back to the current liquid-glass template", () => {
    expect(getMiniWebsiteTemplateComponent("not-a-template")).toBe(
      MINI_WEBSITE_TEMPLATE_COMPONENTS[MINI_WEBSITE_TEMPLATE_DEFAULT_ID],
    );
  });

  it("uses complete MultiTree data for every template preview", () => {
    expect(MULTITREE_MINI_WEBSITE_PREVIEW).toMatchObject({
      name: "MultiTree",
      slug: "multitree",
      status: "published",
      backgroundStyle: "grid",
    });
    expect(MULTITREE_MINI_WEBSITE_PREVIEW.sections.length).toBeGreaterThan(0);
    expect(MULTITREE_MINI_WEBSITE_PREVIEW.services.length).toBeGreaterThan(0);
    expect(MULTITREE_MINI_WEBSITE_PREVIEW.socialLinks.length).toBeGreaterThan(
      0,
    );
  });
});
