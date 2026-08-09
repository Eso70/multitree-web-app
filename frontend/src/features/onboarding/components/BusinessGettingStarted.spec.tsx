import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessGettingStarted } from "./BusinessGettingStarted";

const { apiRequest, enqueueImageUpload } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  enqueueImageUpload: vi.fn((task: () => Promise<string | null>) => task()),
}));

vi.mock("@/lib/api/request", () => ({ apiRequest }));
vi.mock("@/lib/api/enqueue-image-upload", () => ({ enqueueImageUpload }));

const onboarding = {
  step: 1,
  completedAt: null,
  name: "Example Business",
  phone: "7501234567",
  subdomain: "example",
  ownerName: "Example Owner",
  ownerEmail: "owner@example.com",
  logo: "/images/Logo.jpg",
  favicon: "/favicon.ico",
  defaultAvatar: "/images/DefaultAvatar.png",
  websiteColor: "#b6f20d",
  footerText: null,
  footerPhone: null,
  tiktokConfigs: [],
};

describe("BusinessGettingStarted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:logo-preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  it("renders one locked setup form and completes onboarding", async () => {
    apiRequest
      .mockResolvedValueOnce(onboarding)
      .mockResolvedValueOnce({ ...onboarding, step: 2 })
      .mockResolvedValueOnce({ completed: true });

    render(<BusinessGettingStarted />);

    expect(await screen.findByRole("dialog")).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.queryByLabelText("داخستن")).not.toBeInTheDocument();

    expect(screen.queryByText("ڕێنمایی")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("owner@example.com")).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "پاشەکەوتکردن و چوونە داشبۆرد",
      }),
    );

    await waitFor(() =>
      expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/auth/onboarding", {
        method: "PATCH",
        json: expect.objectContaining({ step: 2 }),
      }),
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/auth/onboarding/complete",
      { method: "POST" },
    );
  });

  it("keeps a local logo preview while storing the uploaded URL", async () => {
    apiRequest
      .mockResolvedValueOnce(onboarding)
      .mockResolvedValueOnce({ ...onboarding, step: 2 })
      .mockResolvedValueOnce({ completed: true });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          url: "/images/upload/businesses/example/branding/logo/logo.jpg",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<BusinessGettingStarted />);
    const logoInput = await screen.findByLabelText("Upload logo");
    fireEvent.change(logoInput, {
      target: {
        files: [
          new File([new Uint8Array([0xff, 0xd8, 0xff])], "logo.jpg", {
            type: "image/jpeg",
          }),
        ],
      },
    });

    expect(screen.getByAltText("Logo")).toHaveAttribute(
      "src",
      "blob:logo-preview",
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const completeButton = screen
      .getByRole("contentinfo")
      .querySelector("button")!;
    await waitFor(() => expect(completeButton).toBeEnabled());
    fireEvent.click(completeButton);

    await waitFor(() =>
      expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/auth/onboarding", {
        method: "PATCH",
        json: expect.objectContaining({
          logo: "/images/upload/businesses/example/branding/logo/logo.jpg",
        }),
      }),
    );
  });
});
