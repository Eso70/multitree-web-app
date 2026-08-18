import { describe, expect, it } from "vitest";
import { extractValueFromUrl, generateUrl } from "./modal-utils";
import { SOCIAL_PLATFORMS } from "./modal-constants";
import { COUNTRY_DIAL_CODES } from "@/lib/constants/country-codes";

/**
 * Editing a linktree must not change the stored URL of a button nobody touched.
 *
 * The editor does not send link ids. It loads each stored link, extracts a
 * display value, and rebuilds the URL from that value on save — so an unchanged
 * button is only recognisable to the backend if that round trip is byte-stable.
 * `LinksService.syncLinks` matches reuse on `lower(platform) + trim(url)` and
 * preserves the link row, and with it the `public_page_actions` row every click
 * is recorded against. A round trip that drifts by one character makes every
 * save look like a brand-new button and silently resets that page's click
 * history.
 *
 * Both branches matter and they are not the same code. Real links carry
 * `original_input` + `country_code` metadata and `extractValueFromUrl` prefers
 * it; only links saved without metadata fall back to parsing the URL.
 */

/** Stored URL and the metadata a real row of that kind carries. */
interface Fixture {
  platform: string;
  url: string;
  originalInput?: string;
  countryCode?: string;
}

const PHONE_PLATFORMS = ["whatsapp", "phone", "viber"] as const;

const NON_PHONE: Fixture[] = [
  { platform: "telegram", url: "https://t.me/example_user" },
  { platform: "instagram", url: "https://instagram.com/example" },
  { platform: "facebook", url: "https://facebook.com/example" },
  { platform: "twitter", url: "https://x.com/example" },
  { platform: "tiktok", url: "https://tiktok.com/@example" },
  { platform: "youtube", url: "https://youtube.com/@example" },
  { platform: "linkedin", url: "https://linkedin.com/in/example" },
  { platform: "snapchat", url: "https://snapchat.com/add/example" },
  { platform: "discord", url: "https://discord.gg/abc123" },
  {
    platform: "email",
    url: "mailto:someone@example.com",
    // What the owner typed, which is what a saved row stores.
    originalInput: "someone@example.com",
  },
  { platform: "custom", url: "https://example.com/a/b?c=d" },
  // A bare domain is what `website` used to be for; `custom` stores it the same
  // way, which is why retiring that platform does not move any destination.
  { platform: "custom", url: "https://example.com" },
  {
    platform: "gps",
    url: "https://www.google.com/maps?q=36.191,44.009",
    originalInput: "36.191,44.009",
  },
];

/**
 * Countries picked to be adversarial rather than representative.
 *
 * `964` with a `75x` number is the collision that mattered: the old formatter
 * scanned for any known dialling code and `7` is Russia/Kazakhstan, so it ate
 * the leading digit of every Iraqi mobile. `1` and `7` are the single-digit
 * codes; `55` is the other shape of the same trap, because a Brazilian national
 * number also begins 55.
 */
const COUNTRY_CASES: Array<[code: string, national: string]> = [
  ["964", "7501234567"],
  ["964", "7719876543"],
  ["964", "7801112222"],
  ["1", "5551234567"],
  ["7", "9161234567"],
  ["44", "7700900123"],
  ["49", "15112345678"],
  ["971", "501234567"],
  ["55", "5551234567"],
  ["98", "9121234567"],
  ["90", "5321234567"],
  ["966", "512345678"],
];

function phoneUrl(platform: string, e164: string): string {
  if (platform === "whatsapp") return `https://wa.me/${e164}?text=`;
  if (platform === "phone") return `tel:+${e164}`;
  return `viber://chat?number=+${e164}`;
}

function roundTrip(fixture: Fixture) {
  const metadata =
    fixture.originalInput === undefined
      ? null
      : {
          original_input: fixture.originalInput,
          country_code: fixture.countryCode,
        };
  const extracted = extractValueFromUrl(
    fixture.platform,
    fixture.url,
    metadata,
  );
  return generateUrl(fixture.platform, extracted.value, extracted.countryCode);
}

describe("link URL round trip", () => {
  describe("every platform the editor offers is covered by this spec", () => {
    it("has a fixture for each id", () => {
      const covered = new Set([
        ...PHONE_PLATFORMS,
        ...NON_PHONE.map((fixture) => fixture.platform),
      ]);
      const offered = SOCIAL_PLATFORMS.map((platform) => platform.id);
      expect(offered.filter((id) => !covered.has(id))).toEqual([]);
    });

    it("no longer offers the retired website platform", () => {
      expect(SOCIAL_PLATFORMS.map((platform) => platform.id)).not.toContain(
        "website",
      );
    });
  });

  describe("without metadata, parsing the stored URL", () => {
    it.each(NON_PHONE.map((f) => [f.platform, f.url] as const))(
      "%s keeps %s byte-identical",
      (platform, url) => {
        expect(roundTrip({ platform, url })).toBe(url);
      },
    );

    it.each(
      PHONE_PLATFORMS.flatMap((platform) =>
        COUNTRY_CASES.map(
          ([code, national]) =>
            [platform, code, phoneUrl(platform, code + national)] as const,
        ),
      ),
    )("%s +%s keeps %s byte-identical", (platform, _code, url) => {
      expect(roundTrip({ platform, url })).toBe(url);
    });
  });

  describe("with metadata, which is what real saved links carry", () => {
    it.each(
      NON_PHONE.map(
        (f) => [f.platform, f.url, f.originalInput ?? f.url] as const,
      ),
    )("%s keeps %s byte-identical", (platform, url, originalInput) => {
      expect(roundTrip({ platform, url, originalInput })).toBe(url);
    });

    it.each(
      PHONE_PLATFORMS.flatMap((platform) =>
        COUNTRY_CASES.map(
          ([code, national]) =>
            [
              platform,
              code,
              national,
              phoneUrl(platform, code + national),
            ] as const,
        ),
      ),
    )(
      "%s +%s %s keeps its stored URL byte-identical",
      (platform, code, national, url) => {
        expect(
          roundTrip({
            platform,
            url,
            originalInput: national,
            countryCode: code,
          }),
        ).toBe(url);
      },
    );

    /**
     * The regression that made this matrix necessary: a country outside the old
     * seven-entry list was rejected as invalid and silently replaced with Iraq,
     * rewriting the stored number on save.
     */
    it("keeps every dialling code the selector offers", () => {
      const rejected = COUNTRY_DIAL_CODES.filter((country) => {
        const url = phoneUrl("whatsapp", `${country.code}5551234`);
        return (
          roundTrip({
            platform: "whatsapp",
            url,
            originalInput: "5551234",
            countryCode: country.code,
          }) !== url
        );
      });
      expect(rejected.map((country) => country.code)).toEqual([]);
    });
  });

  describe("a number typed in international form is not double-prefixed", () => {
    it.each([
      ["+9647501234567", "964"],
      ["009647501234567", "964"],
      ["+15551234567", "1"],
    ])("%s resolves to its own country", (typed, code) => {
      expect(generateUrl("whatsapp", typed, code)).toBe(
        `https://wa.me/${typed.replace(/^\+|^00/, "")}?text=`,
      );
    });
  });
});
