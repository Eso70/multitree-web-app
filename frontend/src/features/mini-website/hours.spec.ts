import { describe, expect, it } from "vitest";
import {
  MINI_WEBSITE_DAY_KEYS,
  createMiniWebsiteWeekHours,
  type MiniWebsiteDayKey,
  type MiniWebsiteWeekHours,
} from "@linktree/types";
import {
  applyToOpenDays,
  createAllWeekHours,
  formatDayRange,
  hasOpenDay,
  isOpenAllWeek,
  latinDigits,
  normalizeWeek,
  openState,
  parseTime,
  sharesOneSchedule,
} from "./hours";

function week(
  overrides: Partial<
    Record<
      MiniWebsiteDayKey,
      { open?: string; close?: string; closed?: boolean }
    >
  >,
): MiniWebsiteWeekHours {
  return createMiniWebsiteWeekHours().map((entry) => ({
    ...entry,
    ...(overrides[entry.day] ?? {}),
  }));
}

/** 2026-07-27 is a Monday, so weekday maths reads plainly in the tests. */
const monday = (time: string) => new Date(`2026-07-27T${time}:00`);

describe("parseTime", () => {
  it("rejects values that are not a real clock time", () => {
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("09:60")).toBeNull();
    expect(parseTime("nine")).toBeNull();
    expect(parseTime("9:05")).toBe(545);
  });
});

describe("openState", () => {
  const business = week({
    mon: { open: "09:00", close: "17:00" },
    fri: { closed: true },
  });

  it("is open inside the day's span", () => {
    expect(openState(business, monday("12:00"))).toMatchObject({
      open: true,
      closesAt: "17:00",
    });
  });

  it("is closed at the closing minute itself", () => {
    expect(openState(business, monday("17:00")).open).toBe(false);
  });

  it("reports when it opens later the same day", () => {
    expect(openState(business, monday("07:30"))).toMatchObject({
      open: false,
      opensAt: "09:00",
    });
  });

  it("names the next open day once today is over", () => {
    const state = openState(business, monday("22:00"));
    expect(state.open).toBe(false);
    expect(state.opensDay).toBe("tue");
  });

  it("stays open after midnight for a span that crosses it", () => {
    const late = week({ sun: { open: "18:00", close: "02:00" } });
    // Monday 01:00 falls inside Sunday's 18:00 → 02:00 span.
    expect(openState(late, monday("01:00"))).toMatchObject({
      open: true,
      closesAt: "02:00",
    });
  });

  it("treats equal open and close as around the clock", () => {
    const always = week({ mon: { open: "00:00", close: "00:00" } });
    expect(openState(always, monday("03:00")).open).toBe(true);
  });

  it("skips a closed day when looking ahead", () => {
    const friOnly = week({
      sat: { closed: true },
      sun: { closed: true },
      mon: { closed: true },
      tue: { closed: true },
      wed: { closed: true },
      thu: { closed: true },
      fri: { closed: false, open: "10:00", close: "14:00" },
    });
    expect(openState(friOnly, monday("12:00"))).toMatchObject({
      open: false,
      opensDay: "fri",
      opensAt: "10:00",
    });
  });

  it("reports neither open nor next opening when nothing is scheduled", () => {
    const shut = createMiniWebsiteWeekHours().map((entry) => ({
      ...entry,
      closed: true,
    }));
    expect(openState(shut, monday("12:00"))).toEqual({ open: false });
    expect(hasOpenDay(shut)).toBe(false);
  });
});

describe("normalizeWeek", () => {
  it("fills in missing and malformed days", () => {
    const restored = normalizeWeek([
      { day: "mon", closed: false, open: "08:00", close: "20:00" },
      { day: "tue", closed: false, open: "oops", close: "20:00" },
      { day: "nope", closed: false, open: "01:00", close: "02:00" },
    ]);
    expect(restored).toHaveLength(7);
    expect(restored.map((entry) => entry.day)).toEqual([
      ...MINI_WEBSITE_DAY_KEYS,
    ]);
    expect(restored.find((entry) => entry.day === "mon")?.close).toBe("20:00");
    // A broken opening time falls back rather than silently reading as midnight.
    expect(restored.find((entry) => entry.day === "tue")?.open).toBe("09:00");
  });

  it("returns a full default week for a record that has none", () => {
    expect(normalizeWeek(undefined)).toEqual(createMiniWebsiteWeekHours());
  });

  it("treats a day a saved week left out as closed", () => {
    // Matches the server: once a week is recorded, an omitted day is not open.
    const restored = normalizeWeek([
      { day: "mon", closed: false, open: "08:00", close: "20:00" },
    ]);
    expect(restored.find((entry) => entry.day === "sat")?.closed).toBe(true);
    expect(restored.find((entry) => entry.day === "mon")?.closed).toBe(false);
  });
});

describe("24/7", () => {
  it("recognises a week that never closes", () => {
    expect(isOpenAllWeek(createAllWeekHours())).toBe(true);
    expect(isOpenAllWeek(createMiniWebsiteWeekHours())).toBe(false);
    // One closed day is enough to stop being 24/7.
    expect(
      isOpenAllWeek(
        createAllWeekHours().map((entry) =>
          entry.day === "fri" ? { ...entry, closed: true } : entry,
        ),
      ),
    ).toBe(false);
  });

  it("reads as open at any hour", () => {
    expect(openState(createAllWeekHours(), monday("03:00")).open).toBe(true);
    expect(openState(createAllWeekHours(), monday("23:59")).open).toBe(true);
  });
});

describe("linked days", () => {
  it("spots a week where every open day keeps the same times", () => {
    expect(sharesOneSchedule(createMiniWebsiteWeekHours())).toBe(true);
    expect(
      sharesOneSchedule(week({ mon: { open: "07:00", close: "12:00" } })),
    ).toBe(false);
    // A week with nothing open describes no schedule at all.
    expect(
      sharesOneSchedule(
        createMiniWebsiteWeekHours().map((entry) => ({
          ...entry,
          closed: true,
        })),
      ),
    ).toBe(false);
  });

  it("applies one pair of times without reopening closed days", () => {
    const applied = applyToOpenDays(
      week({ fri: { closed: true } }),
      "07:30",
      "23:00",
    );
    expect(applied.find((entry) => entry.day === "mon")).toMatchObject({
      open: "07:30",
      close: "23:00",
    });
    const friday = applied.find((entry) => entry.day === "fri")!;
    expect(friday.closed).toBe(true);
    expect(friday.open).toBe("09:00");
  });
});

describe("formatDayRange", () => {
  it("labels closed days and full days", () => {
    const [saturday] = week({ sat: { closed: true } });
    expect(formatDayRange(saturday, "closed")).toBe("closed");
    const [open247] = week({ sat: { open: "00:00", close: "00:00" } });
    expect(formatDayRange(open247)).toBe("24 کاتژمێر");
  });
});

describe("latinDigits", () => {
  it("normalizes both Arabic digit sets while preserving Latin digits", () => {
    expect(latinDigits("٠١٢٣٤٥٦٧٨٩ / ۰۱۲۳۴۵۶۷۸۹ / 0123456789")).toBe(
      "0123456789 / 0123456789 / 0123456789",
    );
  });
});
