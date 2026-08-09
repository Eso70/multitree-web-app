import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/request";
import { SignupApplicationsPanel } from "./SignupApplicationsPanel";

vi.mock("@/lib/api/request", () => ({ apiRequest: vi.fn() }));

const apiRequestMock = vi.mocked(apiRequest);

describe("SignupApplicationsPanel", () => {
  beforeEach(() => {
    apiRequestMock.mockImplementation(async (path) => {
      if (path === "/api/platform/signup/applications") {
        return [
          {
            id: "application-1",
            status: "pending",
            ownerName: "Ismail",
            ownerEmail: "owner@example.com",
            businessName: "Ismail",
            phone: "7501234567",
            requestedSubdomain: "ismail",
          },
        ] as never;
      }
      if (path === "/api/platform/billing") {
        return {
          plans: [
            {
              id: "ultra-plan",
              name: "Ultra",
              status: "active",
              isDefault: false,
            },
          ],
        } as never;
      }
      throw new Error(`Unexpected request: ${String(path)}`);
    });
  });

  it("shows phone verification control and enables labeled approval", async () => {
    render(<SignupApplicationsPanel onApproved={vi.fn()} />);

    const checkbox = await screen.findByRole("checkbox", {
      name: /ژمارەی مۆبایل پشتڕاستکراوەتەوە/,
    });
    const approve = screen.getByRole("button", { name: /پەسەندکردن/ });

    expect(approve).toBeDisabled();
    fireEvent.click(checkbox);
    await waitFor(() => expect(approve).toBeEnabled());
  });
});
