import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EffectiveAccessManifest } from "@linktree/types";
import {
  getDashboardAnalyticsSummary,
  getDashboardCrmSummary,
  getDashboardPages,
  getDashboardTikTokHealth,
} from "@/features/business/dashboard-overview-api";
import { useBusinessDashboardOverview } from "@/features/business/hooks/useBusinessDashboardOverview";
import type { DashboardPeriod } from "@/features/business/dashboard-overview-utils";

vi.mock("@/features/business/dashboard-overview-api", () => ({
  getDashboardAnalyticsSummary: vi.fn(),
  getDashboardCrmSummary: vi.fn(),
  getDashboardPages: vi.fn(),
  getDashboardTikTokHealth: vi.fn(),
}));

const access = {
  subscription: {
    id: "subscription",
    status: "active",
    planId: "plan",
    planCode: "ultra",
    planName: "Ultra",
    currentPeriodEnd: null,
  },
  navigation: {},
  permissions: {
    "business:analytics:details-read": {
      key: "business:analytics:details-read",
      outcome: "allow",
      accessMode: "direct",
      source: "plan",
      fieldModes: {},
      resourceScope: {},
    },
    "business:analytics:tiktok-health-read": {
      key: "business:analytics:tiktok-health-read",
      outcome: "allow",
      accessMode: "direct",
      source: "plan",
      fieldModes: {},
      resourceScope: {},
    },
  },
  entitlements: {},
  usage: {},
  templateKeys: [],
  pendingApprovals: [],
} satisfies EffectiveAccessManifest;

const summary = {
  total_views: 10,
  unique_views: 5,
  total_clicks: 3,
  unique_clicks: 2,
  conversions: 1,
  conversion_value: 0,
};

describe("useBusinessDashboardOverview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getDashboardAnalyticsSummary)
      .mockResolvedValueOnce(summary)
      .mockResolvedValueOnce({ ...summary, total_views: 5 });
    vi.mocked(getDashboardPages).mockResolvedValue([]);
    vi.mocked(getDashboardCrmSummary).mockResolvedValue({
      statuses: { new: 2, contacted: 0, qualified: 0, won: 0, lost: 0 },
      total: 2,
      totalValue: 0,
    });
    vi.mocked(getDashboardTikTokHealth).mockResolvedValue({
      connections: 1,
      browserEvents: 0,
      serverEvents: 0,
      delivered: 0,
      retrying: 0,
      failed: 0,
      deliveryRate: 0,
      lastDeliveredAt: null,
      reconciliation: {
        internalConversions: 0,
        serverAcceptedConversions: 0,
      },
    });
  });

  it("loads core and permitted operational data", async () => {
    const { result } = renderHook(() =>
      useBusinessDashboardOverview(access, "7d"),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.current.total_views).toBe(10);
    expect(result.current.previous.total_views).toBe(5);
    expect(result.current.crm?.statuses.new).toBe(2);
    expect(result.current.tikTok?.connections).toBe(1);
    expect(getDashboardAnalyticsSummary).toHaveBeenCalledTimes(2);
    expect(getDashboardPages).toHaveBeenCalledWith({
      from: expect.any(String),
      to: expect.any(String),
    });
    expect(getDashboardCrmSummary).toHaveBeenCalledWith({
      from: expect.any(String),
      to: expect.any(String),
    });
    expect(getDashboardTikTokHealth).toHaveBeenCalledWith({
      from: expect.any(String),
      to: expect.any(String),
    });
  });

  it("does not call paid operational endpoints without access", async () => {
    const basicAccess = {
      ...access,
      subscription: { ...access.subscription, planCode: "basic" },
      permissions: {},
    } satisfies EffectiveAccessManifest;

    const { result } = renderHook(() =>
      useBusinessDashboardOverview(basicAccess, "7d"),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getDashboardCrmSummary).not.toHaveBeenCalled();
    expect(getDashboardTikTokHealth).not.toHaveBeenCalled();
  });

  it("loads lifetime totals without inventing a previous lifetime", async () => {
    const { result } = renderHook(() =>
      useBusinessDashboardOverview(access, "lifetime"),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getDashboardAnalyticsSummary).toHaveBeenCalledTimes(1);
    expect(getDashboardAnalyticsSummary).toHaveBeenCalledWith({});
    expect(getDashboardPages).toHaveBeenCalledWith({});
    expect(getDashboardCrmSummary).toHaveBeenCalledWith({});
    expect(getDashboardTikTokHealth).toHaveBeenCalledWith({});
  });

  it("dynamically reloads every time-based section when the period changes", async () => {
    vi.mocked(getDashboardAnalyticsSummary).mockReset().mockResolvedValue(summary);
    vi.mocked(getDashboardPages).mockResolvedValue([]);
    vi.mocked(getDashboardCrmSummary).mockResolvedValue({
      statuses: { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 },
      total: 0,
      totalValue: 0,
    });
    vi.mocked(getDashboardTikTokHealth).mockResolvedValue({
      connections: 0,
      browserEvents: 0,
      serverEvents: 0,
      delivered: 0,
      retrying: 0,
      failed: 0,
      deliveryRate: 0,
      lastDeliveredAt: null,
      reconciliation: {
        internalConversions: 0,
        serverAcceptedConversions: 0,
      },
    });

    const { rerender } = renderHook(
      ({ period }: { period: DashboardPeriod }) =>
        useBusinessDashboardOverview(access, period),
      { initialProps: { period: "7d" } },
    );

    await waitFor(() => expect(getDashboardPages).toHaveBeenCalledTimes(1));
    const firstRange = vi.mocked(getDashboardPages).mock.calls[0][0];

    rerender({ period: "30d" });

    await waitFor(() => expect(getDashboardPages).toHaveBeenCalledTimes(2));
    const nextRange = vi.mocked(getDashboardPages).mock.calls[1][0];
    expect(nextRange).not.toEqual(firstRange);
    expect(getDashboardCrmSummary).toHaveBeenLastCalledWith(nextRange);
    expect(getDashboardTikTokHealth).toHaveBeenLastCalledWith(nextRange);
  });

  it("keeps visible data when a background refresh fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useBusinessDashboardOverview(access, "7d"),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(getDashboardAnalyticsSummary).mockRejectedValue(
      new Error("offline"),
    );
    await act(() => result.current.refresh());

    expect(result.current.current.total_views).toBe(10);
    expect(result.current.error).toBe(false);
    expect(result.current.partialError).toBe(true);
  });
});
