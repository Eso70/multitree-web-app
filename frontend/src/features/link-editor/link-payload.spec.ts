import { describe, expect, it } from "vitest";
import {
  groupSocialLinksByPlatform,
  normalizeSelectedSocialLinks,
} from "./link-payload";
import type { SocialLink } from "./types";

function link(overrides: Partial<SocialLink>): SocialLink {
  return {
    id: "one",
    platform: "website",
    url: "",
    value: "https://example.com",
    enabled: true,
    ...overrides,
  };
}

describe("modal link payload normalization", () => {
  it("shares ordering and metadata transformation across modal scopes", () => {
    const links = normalizeSelectedSocialLinks([
      link({ id: "second", order: 2 }),
      link({ id: "first", platform: "whatsapp", value: "7501234567", countryCode: "964", order: 1 }),
    ], ["first", "second"]);

    expect(links.map((item) => item.id)).toEqual(["first", "second"]);
    expect(links[0].metadata).toMatchObject({ original_input: "7501234567", country_code: "964" });
  });

  it("groups normalized links without sharing permission or submission state", () => {
    const normalized = normalizeSelectedSocialLinks([
      link({ id: "one" }),
      link({ id: "two", value: "https://openai.com" }),
    ], ["one", "two"]);
    const grouped = groupSocialLinksByPlatform(normalized);

    expect(grouped.urls.website).toHaveLength(2);
    expect(grouped.metadata.website).toHaveLength(2);
  });

  it("disables custom color when an uploaded icon already has a background", () => {
    const [normalized] = normalizeSelectedSocialLinks(
      [
        link({
          customColor: "#ff0000",
          customIcon:
            "uploaded-image:opaque:/images/upload/businesses/acme/icon.png",
        }),
      ],
      ["one"],
    );

    expect(normalized.metadata.custom_icon).toContain(
      "uploaded-image:opaque:",
    );
    expect(normalized.metadata).not.toHaveProperty("custom_color");
  });

  it("keeps custom color behind transparent uploaded icons", () => {
    const [normalized] = normalizeSelectedSocialLinks(
      [
        link({
          customColor: "#ff0000",
          customIcon:
            "uploaded-image:transparent:/images/upload/businesses/acme/icon.png",
        }),
      ],
      ["one"],
    );

    expect(normalized.metadata.custom_color).toBe("#ff0000");
  });
});
