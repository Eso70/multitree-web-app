import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/request";
import { SignupApplicationsPanel } from "./SignupApplicationsPanel";

vi.mock("@/lib/api/request", () => ({ apiRequest: vi.fn() }));

const apiRequestMock = vi.mocked(apiRequest);

describe("SignupApplicationsPanel", () => {
  beforeEach(() => {
    apiRequestMock.mockImplementation(async (path, options) => {
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
      if (
        path === "/api/platform/signup/applications/application-1" &&
        options?.method === "PATCH"
      ) {
        return {} as never;
      }
      throw new Error(`Unexpected request: ${String(path)}`);
    });
  });

  it("uses the edit-business plan selector and needs no phone verification", async () => {
    render(<SignupApplicationsPanel onApproved={vi.fn()} />);

    expect(await screen.findByText("owner@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ultra" })).toHaveClass(
      "rounded-lg",
    );
    expect(screen.getByRole("button", { name: /پەسەندکردن/ })).toBeEnabled();
  });

  it("shows only rejection review and requires its reason", async () => {
    render(<SignupApplicationsPanel onApproved={vi.fn()} />);

    await screen.findByText("owner@example.com");
    expect(screen.queryByLabelText("هۆکار")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "گۆڕانکاری" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ڕەتکردنەوە" }));
    const dialog = screen.getByRole("dialog");
    const reason = screen.getByLabelText("هۆکار");
    fireEvent.change(reason, { target: { value: "Phone needs correction" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "ڕەتکردنەوە" }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/platform/signup/applications/application-1",
        expect.objectContaining({
          method: "PATCH",
          json: expect.objectContaining({
            action: "reject",
            reason: "Phone needs correction",
          }),
        }),
      ),
    );
  });
});
