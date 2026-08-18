import { describe, expect, it } from "vitest";
import { createMiniWebsiteSavePayload } from "./save-payload";
import { createMiniWebsiteDraft } from "./types";

describe("createMiniWebsiteSavePayload", () => {
  it("removes derived and unexpected list-response fields before saving", () => {
    const draft = Object.assign(createMiniWebsiteDraft(), {
      businessId: "server-only-business-id",
      businessWebsiteColor: "#123456",
      views: 25,
    });

    const payload = createMiniWebsiteSavePayload(draft);

    expect(payload).not.toHaveProperty("businessId");
    expect(payload).not.toHaveProperty("businessWebsiteColor");
    expect(payload).not.toHaveProperty("views");
    expect(payload).toMatchObject({
      name: draft.name,
      slug: draft.slug,
      templateKey: draft.templateKey,
      content: draft.content,
    });
  });
});
