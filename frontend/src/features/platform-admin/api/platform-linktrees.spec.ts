import { describe, expect, it } from "vitest";
import { buildPlatformLinktreePayload } from "./platform-linktrees";

describe("buildPlatformLinktreePayload", () => {
  it("sends only fields accepted by CreateLinktreeDto", () => {
    const payload = buildPlatformLinktreePayload({
      name: " Campaign ",
      slug: "campaign",
      image: null,
      background_color: "#ffffff",
      templateKey: "spectrum",
      templateConfig: {},
      platforms: ["website"],
      links: { website: ["https://example.com"] },
    });

    expect(payload).toMatchObject({
      name: "Campaign",
      seo_name: "campaign",
      background_color: "#ffffff",
      platforms: ["website"],
      links: { website: ["https://example.com"] },
    });
    expect(payload).not.toHaveProperty("templateKey");
    expect(payload).not.toHaveProperty("templateConfig");
    expect(payload).not.toHaveProperty("slug");
    expect(payload.image).toBeUndefined();
    expect(payload).toHaveProperty("template_config");
  });
});
