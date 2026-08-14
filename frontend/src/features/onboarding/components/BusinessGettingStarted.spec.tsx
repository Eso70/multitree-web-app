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

  // Setup cannot complete without a logo, so the happy path starts from a
  // business that already has one.
  const onboardingWithLogo = {
    ...onboarding,
    logo: "/images/upload/businesses/example/branding/logo/logo.png",
  };

  it("blocks completion until a logo is uploaded", async () => {
    apiRequest.mockResolvedValueOnce(onboarding);

    render(<BusinessGettingStarted />);

    await screen.findByLabelText("Upload logo");
    const completeButton = screen
      .getByRole("contentinfo")
      .querySelector("button")!;
    expect(completeButton).toBeDisabled();
  });

  it("renders one locked setup form and completes onboarding", async () => {
    apiRequest
      .mockResolvedValueOnce(onboardingWithLogo)
      .mockResolvedValueOnce({ ...onboardingWithLogo, step: 2 })
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

  it("locks the favicon and avatar tiles until their lock is opened", async () => {
    apiRequest.mockResolvedValueOnce(onboarding);

    render(<BusinessGettingStarted />);

    // The logo is the only upload offered while the other two stay derived.
    expect(await screen.findByLabelText("Upload logo")).toBeInTheDocument();
    expect(screen.queryByLabelText("Upload favicon")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Upload default avatar"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Unlock favicon" }));

    expect(screen.getByLabelText("Upload favicon")).toBeInTheDocument();
    // Opening one lock leaves the other closed.
    expect(
      screen.queryByLabelText("Upload default avatar"),
    ).not.toBeInTheDocument();
  });

  it("derives the favicon from an uploaded logo", async () => {
    const uploadedLogo =
      "/images/upload/businesses/example/branding/logo/logo.png";
    apiRequest
      .mockResolvedValueOnce(onboarding)
      .mockResolvedValueOnce({ ...onboarding, step: 2 })
      .mockResolvedValueOnce({ completed: true });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ url: uploadedLogo }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<BusinessGettingStarted />);
    fireEvent.change(await screen.findByLabelText("Upload logo"), {
      target: {
        files: [
          new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "logo.png", {
            type: "image/png",
          }),
        ],
      },
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const completeButton = screen
      .getByRole("contentinfo")
      .querySelector("button")!;
    await waitFor(() => expect(completeButton).toBeEnabled());
    fireEvent.click(completeButton);

    // One upload request, and the favicon points at it. The default avatar is
    // left on the platform default.
    expect(fetch).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/auth/onboarding", {
        method: "PATCH",
        json: expect.objectContaining({
          logo: uploadedLogo,
          favicon: uploadedLogo,
        }),
      }),
    );
    expect(screen.getByAltText("Default avatar")).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("/images/DefaultAvatar.png")),
    );
  });

  it("repoints the favicon again on a second logo upload", async () => {
    const firstLogo = "/images/upload/businesses/example/branding/logo/a.png";
    const secondLogo = "/images/upload/businesses/example/branding/logo/b.png";
    apiRequest.mockResolvedValueOnce(onboarding);
    for (const url of [firstLogo, secondLogo]) {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ url }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    render(<BusinessGettingStarted />);
    const logoInput = await screen.findByLabelText("Upload logo");
    const pick = (name: string) =>
      fireEvent.change(logoInput, {
        target: {
          files: [
            new File([new Uint8Array([0x89, 0x50])], name, {
              type: "image/png",
            }),
          ],
        },
      });

    pick("a.png");
    await waitFor(() =>
      expect(screen.getByAltText("Favicon")).toHaveAttribute(
        "src",
        expect.stringContaining(encodeURIComponent(firstLogo)),
      ),
    );

    // Not just the first upload: a later logo must move the favicon too.
    pick("b.png");
    await waitFor(() =>
      expect(screen.getByAltText("Favicon")).toHaveAttribute(
        "src",
        expect.stringContaining(encodeURIComponent(secondLogo)),
      ),
    );
    // The avatar never follows the logo.
    expect(screen.getByAltText("Default avatar")).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("/images/DefaultAvatar.png")),
    );
  });
});
