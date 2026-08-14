import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationCreator } from "@/features/platform-admin/components/InvitationCreator";
import { apiRequest } from "@/lib/api/request";
import { copyToClipboard } from "@/lib/utils/clipboard";

vi.mock("@/lib/api/request", () => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/utils/clipboard", () => ({ copyToClipboard: vi.fn() }));

describe("InvitationCreator", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
    vi.mocked(copyToClipboard).mockReset();
  });

  it("uses the shared wizard and reports an invalid optional email inline", () => {
    render(<InvitationCreator showLabel />);

    fireEvent.click(screen.getByRole("button", { name: "Invite" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("modal-wizard-progress")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/ئیمەیڵی دیاریکراو/), {
      target: { value: "invalid" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "دروستکردنی بانگهێشتنامە" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "تکایە ئیمەیڵێکی دروست بنووسە.",
    );
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("creates an invitation, advances to the result, and copies its URL", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      signupUrl: "https://example.test/join?invite=test-token",
      expiresAt: "2026-08-20T10:00:00.000Z",
    });
    vi.mocked(copyToClipboard).mockResolvedValue(true);
    render(<InvitationCreator />);

    fireEvent.click(screen.getByRole("button", { name: "Invite" }));
    fireEvent.change(screen.getByLabelText(/ئیمەیڵی دیاریکراو/), {
      target: { value: "owner@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "دروستکردنی بانگهێشتنامە" }),
    );

    await waitFor(() =>
      expect(screen.getByText("بانگهێشتنامەکە ئامادەیە")).toBeInTheDocument(),
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/platform/signup/invitations",
      { method: "POST", json: { email: "owner@example.com" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "کۆپیکردنی بەستەر" }));
    await waitFor(() =>
      expect(copyToClipboard).toHaveBeenCalledWith(
        "https://example.test/join?invite=test-token",
      ),
    );
  });
});
