import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BusinessPageAnalyticsModal } from "@/components/business/BusinessPageAnalyticsModal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BusinessPageAnalyticsModal summary mode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses loading, refresh, and clear controls for a platform summary", async () => {
    const response = (_url?: string, _init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              total_views: 20,
              unique_views: 12,
              total_clicks: 8,
              unique_clicks: 3,
              conversions: 0,
              conversion_value: 0,
            },
          }),
      });
    const fetchMock = vi.fn(response);
    const onAnalyticsCleared = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BusinessPageAnalyticsModal
        isOpen
        onClose={vi.fn()}
        pageId="platform-page-id"
        pageName="پەڕەی تاقیکردنەوە"
        canClearAnalytics
        summaryOnly
        dataSource="platform-linktree"
        onAnalyticsCleared={onAnalyticsCleared}
      />,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("25.0%")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "ئاماری وردتر" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "نوێکردنەوە" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "پاککردنەوەی داتاکان" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/دوگمەکان/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/platform/linktrees/platform-page-id/analytics",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "نوێکردنەوە" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[0])).toMatch(
      /^\/api\/platform\/linktrees\/platform-page-id\/analytics\?_t=\d+$/,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "پاککردنەوەی داتاکان" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "بەڵێ، پاکی بکەوە" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/platform/linktrees/platform-page-id/analytics",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(onAnalyticsCleared).toHaveBeenCalledOnce();
  });
});
