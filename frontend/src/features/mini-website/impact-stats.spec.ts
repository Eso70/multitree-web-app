import { describe, expect, it } from "vitest";
import { createMiniWebsiteDraft } from "./types";
import { validateCompleteMiniWebsite } from "./validation";

describe("impact statistics section", () => {
  it("requires a number and label", () => {
    const draft = createMiniWebsiteDraft();
    draft.sections = [{ key: "impactStats", enabled: true }];
    draft.impactStats = [
      {
        id: "stat-1",
        value: "1000",
        label: "کڕیاری خزمەتکراو",
        suffix: "+",
        icon: "users",
      },
    ];

    expect(validateCompleteMiniWebsite(draft).impactStats).toBeUndefined();
    expect(validateCompleteMiniWebsite(draft)["impactStat.0"]).toBeUndefined();
  });
});
