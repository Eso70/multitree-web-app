import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TikTokPixelGroupCard } from "./TikTokPixelGroupCard";

const copyToClipboardMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("@/lib/utils/clipboard", () => ({
  copyToClipboard: copyToClipboardMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TikTokPixelGroupCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies Pixel ID to clipboard", async () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    render(
      <TikTokPixelGroupCard
        index={0}
        config={{
          id: "pixel-1",
          pixel_id: "C9ABC123456789",
          events_token: "",
          token_last_four: "5678",
          has_events_token: true,
          keep_events_token: true,
        }}
        testEndpoint="/api/analytics/v2/tiktok/test"
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

    const copyPixelBtn = screen.getByRole("button", {
      name: "کۆپیکردنی Pixel ID",
    });
    await act(async () => {
      fireEvent.click(copyPixelBtn);
    });

    expect(copyToClipboardMock).toHaveBeenCalledWith("C9ABC123456789");
  });

  it("reveals Events API token by fetching secret from server", async () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          events_token: "secret_access_token_12345",
          token_last_four: "1234",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TikTokPixelGroupCard
        index={0}
        config={{
          id: "pixel-1",
          pixel_id: "C9ABC123456789",
          events_token: "",
          token_last_four: "1234",
          has_events_token: true,
          keep_events_token: true,
        }}
        testEndpoint="/api/analytics/v2/tiktok/test"
        secretEndpoint={(id) => `/api/auth/tiktok/${id}/secret`}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

    const showTokenBtn = screen.getByRole("button", {
      name: "پیشاندانی Token",
    });
    fireEvent.click(showTokenBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/tiktok/pixel-1/secret", {
        credentials: "include",
        cache: "no-store",
      });
    });

    expect(onUpdate).toHaveBeenCalledWith({
      events_token: "secret_access_token_12345",
    });

    vi.unstubAllGlobals();
  });

  it("copies Events API token to clipboard by fetching secret if not yet in state", async () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          events_token: "secret_access_token_9999",
          token_last_four: "9999",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TikTokPixelGroupCard
        index={0}
        config={{
          id: "pixel-2",
          pixel_id: "C9ABC999999999",
          events_token: "",
          token_last_four: "9999",
          has_events_token: true,
          keep_events_token: true,
        }}
        testEndpoint="/api/analytics/v2/tiktok/test"
        secretEndpoint={(id) => `/api/auth/tiktok/${id}/secret`}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    );

    const copyTokenBtn = screen.getByRole("button", {
      name: "کۆپیکردنی Events API Token",
    });
    fireEvent.click(copyTokenBtn);

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledWith(
        "secret_access_token_9999",
      );
    });

    expect(onUpdate).toHaveBeenCalledWith({
      events_token: "secret_access_token_9999",
    });

    vi.unstubAllGlobals();
  });
});
