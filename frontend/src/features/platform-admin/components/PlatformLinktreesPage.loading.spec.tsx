import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RootLinktreesPage } from "./PlatformLinktreesPage";

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/request", () => ({
  apiRequest: apiRequestMock,
}));

describe("RootLinktreesPage loading", () => {
  afterEach(() => apiRequestMock.mockReset());

  it("does not mount a modal skeleton until a modal is opened", () => {
    apiRequestMock.mockImplementation(() => new Promise(() => undefined));
    render(<RootLinktreesPage />);

    expect(screen.queryByLabelText("Loading dialog")).not.toBeInTheDocument();
  });

  it("loads the platform-wide totals used by the shared six-card manager", async () => {
    apiRequestMock.mockImplementation((url: string) => {
      if (url.endsWith("/context")) {
        return Promise.resolve({
          branding: {
            name: "MultiTree",
            logo: null,
            avatar: null,
            favicon: null,
            accentColor: "#b6f20d",
          },
          publicPathPrefix: "/linktree",
        });
      }
      if (url.endsWith("/analytics/summary")) {
        return Promise.resolve({
          total_views: 42,
          unique_views: 20,
          total_clicks: 10,
          unique_clicks: 7,
          conversions: 3,
          conversion_value: 0,
        });
      }
      return Promise.resolve([]);
    });

    render(<RootLinktreesPage />);

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/platform/linktrees/analytics/summary",
      ),
    );
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
