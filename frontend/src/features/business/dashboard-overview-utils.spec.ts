import { describe, expect, it } from "vitest";
import type { EffectiveAccessManifest } from "@linktree/types";
import {
  buildDashboardAttentionItems,
  dashboardDateRanges,
  percentageChange,
} from "@/features/business/dashboard-overview-utils";

const access = {
  usage: {},
} as EffectiveAccessManifest;

describe("business dashboard overview calculations", () => {
  it("builds exact current and previous seven-day ranges", () => {
    expect(dashboardDateRanges("7d", new Date(2026, 7, 9, 12))).toEqual({
      current: { from: "2026-08-03", to: "2026-08-09" },
      previous: { from: "2026-07-27", to: "2026-08-02" },
    });
  });

  it("supports longer periods and lifetime totals without fake comparison", () => {
    expect(
      dashboardDateRanges("30d", new Date(2026, 7, 9, 12)),
    ).toEqual({
      current: { from: "2026-07-11", to: "2026-08-09" },
      previous: { from: "2026-06-11", to: "2026-07-10" },
    });
    expect(dashboardDateRanges("lifetime")).toEqual({
      current: {},
      previous: null,
    });
  });

  it("does not invent a percentage when the previous period was zero", () => {
    expect(percentageChange(5, 0)).toBeNull();
    expect(percentageChange(0, 0)).toBe(0);
    expect(percentageChange(15, 10)).toBe(50);
  });

  it("reports only actionable conditions backed by system data", () => {
    const items = buildDashboardAttentionItems({
      crmNewLeads: 3,
      tikTok: null,
      access: {
        ...access,
        usage: {
          "limit.linktrees": { limit: 5, used: 4, remaining: 1 },
          "limit.profile_changes_monthly": {
            limit: 3,
            used: 3,
            remaining: 0,
          },
        },
      },
    });

    expect(items.map((item) => item.id)).toEqual([
      "new-leads",
      "usage-limit.linktrees",
    ]);
  });
});
