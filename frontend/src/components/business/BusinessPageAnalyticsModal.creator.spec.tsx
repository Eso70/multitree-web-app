import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BusinessPageAnalyticsModal } from "@/components/business/BusinessPageAnalyticsModal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const totals = {
  total_views: 40,
  unique_views: 25,
  total_clicks: 10,
  unique_clicks: 6,
  conversions: 2,
  conversion_value: 30,
};

const actions = [
  {
    id: "action-1",
    actionKey: "link:1",
    label: "ئینستاگرام",
    actionType: "custom",
    destination: "https://example.com",
    totalClicks: 7,
    uniqueClickers: 5,
    conversions: 1,
    conversionValue: 15,
    ctr: 28,
  },
];

function stubFetch() {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          data: String(url).includes("/actions") ? actions : totals,
        }),
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("BusinessPageAnalyticsModal for a Creator workspace", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * A Creator owns the page it is inspecting, so it reads the same full report
   * a business does — the same stat cards, conversion tiles and button list —
   * through the Creator endpoints rather than the business-guarded ones.
   */
  it("loads the full report from the Creator linktree endpoints", async () => {
    const fetchMock = stubFetch();

    render(
      <BusinessPageAnalyticsModal
        isOpen
        onClose={vi.fn()}
        pageId="creator-page-id"
        pageName="پەڕەی من"
        pageKind="linktree"
        dataSource="creator-linktree"
      />,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("ئینستاگرام")).toBeInTheDocument();
    });

    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested).toContain(
      "/api/creator/linktrees/creator-page-id/analytics",
    );
    expect(requested).toContain(
      "/api/creator/linktrees/creator-page-id/analytics/actions",
    );
    expect(
      requested.some((url) => url.startsWith("/api/analytics/v2")),
    ).toBe(false);

    // The business stat cards, not the summary four.
    expect(screen.getByText("کۆی بینینەکان")).toBeInTheDocument();
    expect(screen.getByText("کرتەکەری تاک")).toBeInTheDocument();
    expect(screen.getByText("گۆڕانەکان")).toBeInTheDocument();
    expect(screen.getByText(/دوگمەکان/)).toBeInTheDocument();
    expect(screen.getByText("هەموو داتاکان")).toBeInTheDocument();
  });

  /** `/business/analytics` is a business-only route. */
  it("hides advanced analytics, which a Creator has no route for", async () => {
    stubFetch();

    render(
      <BusinessPageAnalyticsModal
        isOpen
        onClose={vi.fn()}
        pageId="creator-page-id"
        pageName="پەڕەی من"
        pageKind="mini_website"
        dataSource="creator-mini-website"
      />,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ئاماری وردتر" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "نوێکردنەوە" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "پاککردنەوەی داتاکان" }),
    ).toBeInTheDocument();
  });

  it("reads the Creator mini-website endpoints for a mini website", async () => {
    const fetchMock = stubFetch();

    render(
      <BusinessPageAnalyticsModal
        isOpen
        onClose={vi.fn()}
        pageId="creator-mini-id"
        pageName="مینی وێبسایتی من"
        pageKind="mini_website"
        dataSource="creator-mini-website"
      />,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => {
      const requested = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(requested).toContain(
        "/api/creator/mini-websites/creator-mini-id/analytics",
      );
      expect(requested).toContain(
        "/api/creator/mini-websites/creator-mini-id/analytics/actions",
      );
    });
  });
});
