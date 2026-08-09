import { describe, expect, it } from "vitest";
import { createMiniWebsiteProcessStep } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateCompleteMiniWebsite } from "./validation";

describe("process section", () => {
  it("accepts a titled step with an optional secure action", () => {
    const draft = createMiniWebsiteDraft();
    draft.sections = [{ key: "process", enabled: true }];
    draft.processSteps = [
      {
        ...createMiniWebsiteProcessStep("step-1"),
        title: "داواکاری بنێرە",
        actionLabel: "دەستپێکردن",
        actionUrl: "https://example.com/start",
      },
    ];

    expect(validateCompleteMiniWebsite(draft).processSteps).toBeUndefined();
    expect(validateCompleteMiniWebsite(draft)["processStep.0"]).toBeUndefined();
  });
});
