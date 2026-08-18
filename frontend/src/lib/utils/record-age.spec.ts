import { describe, expect, it } from "vitest";
import {
  getRecordAgeBadge,
  getRecordAgeTier,
  RECORD_AGE_BADGES,
  RECORD_AGE_TIER_DAYS,
} from "@/lib/utils/record-age";

const NOW = new Date("2026-08-18T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("getRecordAgeTier", () => {
  it("marks records younger than the new threshold as new", () => {
    expect(getRecordAgeTier(daysAgo(0), NOW)).toBe("new");
    expect(getRecordAgeTier(daysAgo(RECORD_AGE_TIER_DAYS.new - 0.1), NOW)).toBe("new");
  });

  it("marks records between the thresholds as growing", () => {
    expect(getRecordAgeTier(daysAgo(RECORD_AGE_TIER_DAYS.new), NOW)).toBe("growing");
    expect(getRecordAgeTier(daysAgo(RECORD_AGE_TIER_DAYS.growing - 0.1), NOW)).toBe("growing");
  });

  it("marks records past the growing threshold as old", () => {
    expect(getRecordAgeTier(daysAgo(RECORD_AGE_TIER_DAYS.growing), NOW)).toBe("old");
    expect(getRecordAgeTier(daysAgo(400), NOW)).toBe("old");
  });

  it("returns null for missing or unparseable dates", () => {
    expect(getRecordAgeTier(null, NOW)).toBeNull();
    expect(getRecordAgeTier(undefined, NOW)).toBeNull();
    expect(getRecordAgeTier("not-a-date", NOW)).toBeNull();
  });

  it("accepts Date inputs", () => {
    expect(getRecordAgeTier(new Date(daysAgo(1)), NOW)).toBe("new");
  });
});

describe("getRecordAgeBadge", () => {
  it("returns the descriptor matching the tier", () => {
    expect(getRecordAgeBadge(daysAgo(1), NOW)).toBe(RECORD_AGE_BADGES.new);
    expect(getRecordAgeBadge(daysAgo(90), NOW)).toBe(RECORD_AGE_BADGES.old);
  });

  it("returns null when the tier cannot be resolved", () => {
    expect(getRecordAgeBadge("", NOW)).toBeNull();
  });
});
