import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessSignupWizard } from "./BusinessSignupWizard";

const { apiRequest, toast } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/api/request", () => ({ apiRequest }));
vi.mock("sonner", () => ({ toast }));

describe("BusinessSignupWizard application status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes a pending application and displays its approved state", async () => {
    apiRequest
      .mockResolvedValueOnce({
        status: "pending",
        ownerEmail: "owner@example.com",
        businessName: "MultiTree",
        phone: "7501234567",
        requestedSubdomain: null,
      })
      .mockResolvedValueOnce({
        status: "approved",
        ownerEmail: "owner@example.com",
        businessName: "MultiTree",
        phone: "7501234567",
        requestedSubdomain: "multitree",
      });

    render(<BusinessSignupWizard />);

    const refresh = await screen.findByRole("button", {
      name: "Refresh application status",
    });
    fireEvent.click(refresh);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: "Refresh application status",
        }),
      ).not.toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalledWith("Application status updated.");
  });
});
