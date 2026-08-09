import { describe, expect, it } from "vitest";
import {
  MINI_WEBSITE_PROFESSION_TEMPLATE_KEYS,
  type MiniWebsiteSectionKey,
} from "@linktree/types";
import {
  PROFESSION_TEMPLATE_CATEGORIES,
  PROFESSION_TEMPLATES,
  applyProfessionTemplate,
  getProfessionTemplate,
} from "./profession-templates";
import { MINI_WEBSITE_SECTIONS, createMiniWebsiteDraft } from "./types";

describe("profession templates", () => {
  it("defines every supported template exactly once", () => {
    const keys = PROFESSION_TEMPLATES.map((template) => template.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual(
      [...MINI_WEBSITE_PROFESSION_TEMPLATE_KEYS].sort(),
    );
  });

  it("covers every category and the major requested roles", () => {
    const categories = new Set(
      PROFESSION_TEMPLATES.map((template) => template.category),
    );
    for (const category of PROFESSION_TEMPLATE_CATEGORIES) {
      expect(categories.has(category.key)).toBe(true);
    }

    for (const key of [
      "student",
      "craftsman",
      "entrepreneur",
      "doctor",
      "engineer",
      "universityLeader",
      "governmentLeader",
    ] as const) {
      expect(getProfessionTemplate(key)).toBeDefined();
    }
  });

  it("uses only known, non-duplicated sections in recommendations", () => {
    const knownSections = new Set<MiniWebsiteSectionKey>(
      MINI_WEBSITE_SECTIONS.map((section) => section.key),
    );

    for (const template of PROFESSION_TEMPLATES) {
      expect(new Set(template.recommendedSections).size).toBe(
        template.recommendedSections.length,
      );
      for (const section of template.recommendedSections) {
        expect(knownSections.has(section)).toBe(true);
      }
    }
  });

  it("seeds recommended sections while leaving later customization possible", () => {
    const draft = createMiniWebsiteDraft();
    draft.sections = [{ key: "audio", enabled: true }];

    const seeded = applyProfessionTemplate(draft, "doctor");
    expect(seeded.professionTemplate).toBe("doctor");
    expect(seeded.sections.map((section) => section.key)).toEqual(
      MINI_WEBSITE_SECTIONS.filter((section) =>
        getProfessionTemplate("doctor")?.recommendedSections.includes(
          section.key,
        ),
      ).map((section) => section.key),
    );

    seeded.sections.push({ key: "gallery", enabled: true });
    expect(seeded.sections.at(-1)).toEqual({
      key: "gallery",
      enabled: true,
    });
  });

  it("lets a custom profile begin with no preselected sections", () => {
    const seeded = applyProfessionTemplate(createMiniWebsiteDraft(), "custom");

    expect(seeded.professionTemplate).toBe("custom");
    expect(seeded.sections).toEqual([]);
  });
});
