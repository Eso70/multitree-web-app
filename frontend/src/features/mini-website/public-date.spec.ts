import { describe, expect, it } from "vitest";
import {
  formatPublicEventDate,
  formatPublicMiniWebsiteDate,
} from "./public-date";

describe("public Mini Website dates", () => {
  it("formats a saved date identically without locale-dependent Intl output", () => {
    expect(formatPublicMiniWebsiteDate("2026-09-13")).toBe("13ی ئەیلوول 2026");
  });

  it("keeps local event time without converting through a timezone", () => {
    expect(formatPublicMiniWebsiteDate("2026-08-20T18:05", true)).toBe(
      "20ی ئاب 2026 · 18:05",
    );
  });

  it("leaves invalid input untouched", () => {
    expect(formatPublicMiniWebsiteDate("not-a-date")).toBe("not-a-date");
    expect(formatPublicMiniWebsiteDate("2026-19-40")).toBe("2026-19-40");
  });

  it("formats an event date as English metadata on the same saved value", () => {
    expect(formatPublicEventDate("2026-09-13")).toBe("Sep 13, 2026");
  });

  it("converts local time to 12-hour English without a timezone", () => {
    expect(formatPublicEventDate("2026-08-20T18:05")).toBe(
      "Aug 20, 2026 · 6:05 PM",
    );
    expect(formatPublicEventDate("2026-08-20T09:05")).toBe(
      "Aug 20, 2026 · 9:05 AM",
    );
    expect(formatPublicEventDate("2026-08-20T00:05")).toBe(
      "Aug 20, 2026 · 12:05 AM",
    );
  });

  it("leaves invalid event dates untouched", () => {
    expect(formatPublicEventDate("not-a-date")).toBe("not-a-date");
  });
});
