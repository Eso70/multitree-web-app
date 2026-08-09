import { describe, expect, it } from "vitest";
import { createMiniWebsiteTeamMember } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";

const validMember = {
  ...createMiniWebsiteTeamMember("team-1"),
  name: "ئارام",
  role: "پسپۆڕ",
};

function errorsFor(team: ReturnType<typeof createMiniWebsiteTeamMember>[]) {
  return validateMiniWebsiteStep(
    {
      ...createMiniWebsiteDraft(),
      sections: [{ key: "team", enabled: true }],
      team,
    },
    "socialLinks",
  );
}

describe("team section", () => {
  it("counts as a section without social links", () => {
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "team", enabled: true }],
        team: [validMember],
      },
      "platforms",
    );
    expect(errors.sections).toBeUndefined();
    expect(errors.platforms).toBeUndefined();
  });

  it("requires at least one member", () => {
    expect(errorsFor([]).team).toBeTruthy();
  });

  it("requires both a name and a role", () => {
    expect(errorsFor([{ ...validMember, name: "" }])["team.0"]).toBeTruthy();
    expect(errorsFor([{ ...validMember, role: "" }])["team.0"]).toBeTruthy();
  });

  it("accepts no action and validates configured actions", () => {
    expect(errorsFor([validMember])["team.0"]).toBeUndefined();
    expect(
      errorsFor([
        {
          ...validMember,
          actionType: "link",
          actionValue: "javascript:alert(1)",
        },
      ])["team.0"],
    ).toBeTruthy();
    expect(
      errorsFor([
        {
          ...validMember,
          actionType: "whatsapp",
          actionValue: "07501234567",
        },
      ])["team.0"],
    ).toBeUndefined();
  });
});
