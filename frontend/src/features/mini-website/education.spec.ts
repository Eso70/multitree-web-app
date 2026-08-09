import { describe, expect, it } from "vitest";
import { createMiniWebsiteEducation } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";

describe("education history", () => {
  it("accepts current study without an end year", () => {
    const entry = {
      ...createMiniWebsiteEducation("education-1"),
      institution: "University of Example",
      degree: "Bachelor of Science",
      fieldOfStudy: "Engineering",
      startYear: "2022",
      status: "studying" as const,
    };
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "education", enabled: true }],
        education: [entry],
      },
      "socialLinks",
    );

    expect(errors["education.0"]).toBeUndefined();
  });

  it("requires an end year for a graduate", () => {
    const entry = {
      ...createMiniWebsiteEducation("education-1"),
      institution: "University of Example",
      degree: "Bachelor of Science",
      startYear: "2020",
      status: "graduated" as const,
      endYear: "",
    };
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "education", enabled: true }],
        education: [entry],
      },
      "socialLinks",
    );

    expect(errors["education.0"]).toBeTruthy();
  });
});
