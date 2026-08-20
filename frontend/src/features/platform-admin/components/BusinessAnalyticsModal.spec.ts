import { describe, expect, it } from "vitest";
import { sortBusinessLinktrees } from "@/features/platform-admin/components/BusinessAnalyticsModal";

function row(
  name: string,
  unique_views: number,
  total_clicks: number,
  is_default = false,
) {
  return { name, unique_views, total_clicks, unique_clicks: total_clicks, is_default };
}

describe("sortBusinessLinktrees", () => {
  it("puts the default page first whatever it scores", () => {
    const rows = [row("busy", 900, 900), row("quiet", 0, 0, true)];
    expect(sortBusinessLinktrees(rows, "most-views").map((r) => r.name)).toEqual([
      "quiet",
      "busy",
    ]);
  });

  /**
   * The old comparator returned -1 whenever `a` was default without looking at
   * `b`, so a pair of default rows contradicted itself depending on which way
   * round the sort handed them over.
   */
  it("stays consistent when two rows are both default", () => {
    const rows = [row("beta", 1, 1, true), row("alpha", 2, 2, true)];
    const forward = sortBusinessLinktrees(rows, "most-views").map((r) => r.name);
    const backward = sortBusinessLinktrees([...rows].reverse(), "most-views").map(
      (r) => r.name,
    );
    expect(forward).toEqual(backward);
  });

  it("orders by views, clicks or least activity per mode", () => {
    const rows = [row("a", 5, 1), row("b", 1, 9), row("c", 3, 3)];

    expect(sortBusinessLinktrees(rows, "most-views").map((r) => r.name)).toEqual(["a", "c", "b"]);
    expect(sortBusinessLinktrees(rows, "most-clicks").map((r) => r.name)).toEqual(["b", "c", "a"]);
    // a and c both total 6, so the name tie-break decides between them.
    expect(sortBusinessLinktrees(rows, "least").map((r) => r.name)).toEqual(["a", "c", "b"]);
  });

  /**
   * Without a tie-break, equally scoring rows come back in whatever order the
   * API happened to return them, so the list reshuffles on every refresh.
   */
  it("breaks ties on the name", () => {
    const rows = [row("zulu", 4, 4), row("alpha", 4, 4), row("mike", 4, 4)];
    expect(sortBusinessLinktrees(rows, "most-views").map((r) => r.name)).toEqual([
      "alpha",
      "mike",
      "zulu",
    ]);
  });

  it("does not mutate its input", () => {
    const rows = [row("b", 1, 1), row("a", 9, 9)];
    sortBusinessLinktrees(rows, "most-views");
    expect(rows.map((r) => r.name)).toEqual(["b", "a"]);
  });
});
