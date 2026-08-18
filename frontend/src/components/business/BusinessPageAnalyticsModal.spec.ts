import { describe, expect, it } from "vitest";
import {
  miniActionSection,
  sortAnalyticsActions,
} from "@/components/business/BusinessPageAnalyticsModal";

function action(
  label: string,
  totalClicks: number,
  conversions = 0,
): { label: string; totalClicks: number; conversions: number } {
  return { label, totalClicks, conversions };
}

describe("sortAnalyticsActions", () => {
  it("drops rows nobody touched", () => {
    const rows = [action("used", 3), action("untouched", 0)];
    expect(sortAnalyticsActions(rows, "most-clicks").map((r) => r.label)).toEqual([
      "used",
    ]);
  });

  /** A converted row matters even when the click never registered. */
  it("keeps a row that converted without a recorded click", () => {
    const rows = [action("converted", 0, 2)];
    expect(sortAnalyticsActions(rows, "most-clicks")).toHaveLength(1);
  });

  it("orders by clicks, conversions or ascending clicks per mode", () => {
    const rows = [action("a", 1, 5), action("b", 9, 0), action("c", 4, 2)];

    expect(sortAnalyticsActions(rows, "most-clicks").map((r) => r.label)).toEqual(["b", "c", "a"]);
    expect(sortAnalyticsActions(rows, "most-conversions").map((r) => r.label)).toEqual(["a", "c", "b"]);
    expect(sortAnalyticsActions(rows, "least").map((r) => r.label)).toEqual(["a", "c", "b"]);
  });

  /**
   * Without a tie-break the order of equal rows follows the order the API
   * happened to return them in, so the list reshuffles on every refresh.
   */
  it("breaks ties on the label instead of leaving them to input order", () => {
    const rows = [action("zulu", 4), action("alpha", 4), action("mike", 4)];
    expect(sortAnalyticsActions(rows, "most-clicks").map((r) => r.label)).toEqual([
      "alpha",
      "mike",
      "zulu",
    ]);
  });

  it("does not mutate the array it was given", () => {
    const rows = [action("b", 1), action("a", 9)];
    sortAnalyticsActions(rows, "most-clicks");
    expect(rows.map((r) => r.label)).toEqual(["b", "a"]);
  });
});

describe("miniActionSection", () => {
  it("names the section a mini-website action belongs to", () => {
    expect(miniActionSection("mini:offer:17")).toBe("ئۆفەر");
  });

  it("returns null for a linktree action or an unknown kind", () => {
    expect(miniActionSection("link:42")).toBeNull();
    expect(miniActionSection("mini:unknown:1")).toBeNull();
  });
});
