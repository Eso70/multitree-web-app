import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBusinessAnalyticsTotals } from "./useBusinessAnalyticsTotals";

describe("useBusinessAnalyticsTotals", () => {
  afterEach(() => vi.restoreAllMocks());

  it("normalizes the summary response and can reset it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { total_views: 10, unique_views: 4, unique_clicks: 2 },
        }),
      }),
    );
    const { result } = renderHook(() =>
      useBusinessAnalyticsTotals("linktree"),
    );

    await waitFor(() => expect(result.current.totals.total_views).toBe(10));
    expect(fetch).toHaveBeenCalledWith(
      "/api/analytics/v2/summary?pageType=linktree",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result.current.totals).toMatchObject({
      unique_views: 4,
      unique_clicks: 2,
      conversions: 0,
    });
    expect(result.current.hasData).toBe(true);
    expect(result.current.isLoading).toBe(false);

    act(() => result.current.reset());
    expect(result.current.hasData).toBe(false);
    expect(result.current.totals.total_views).toBe(0);
  });

  it("keeps mini-website totals on the mini-website query boundary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      }),
    );

    renderHook(() => useBusinessAnalyticsTotals("mini_website"));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/analytics/v2/summary?pageType=mini_website",
        expect.objectContaining({ credentials: "include" }),
      ),
    );
  });

  it("does not load Linktree totals while another dashboard page is active", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useBusinessAnalyticsTotals("linktree", false));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
