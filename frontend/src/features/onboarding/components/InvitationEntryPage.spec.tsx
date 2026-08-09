import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationEntryPage } from "./InvitationEntryPage";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

describe("InvitationEntryPage", () => {
  beforeEach(() => {
    window.history.replaceState(
      {},
      "",
      "/join?token=valid-invitation-token-1234567890",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          expiresAt: "2026-08-10T06:00:00.000Z",
        }),
      }),
    );
  });

  it("keeps the validated token for Google signup after hiding it from the URL", async () => {
    const view = render(<InvitationEntryPage />);

    const continueLink = await screen.findByRole("link", {
      name: "Continue with Google",
    });
    await waitFor(() => expect(window.location.search).toBe(""));

    view.rerender(<InvitationEntryPage />);

    expect(continueLink).toHaveAttribute(
      "href",
      "/api/signup/google/start?invite=valid-invitation-token-1234567890",
    );
  });

  it("shows the email-code signup option after the invitation validates", async () => {
    render(<InvitationEntryPage />);

    expect(
      await screen.findByRole("textbox", { name: "Email address" }),
    ).toBeInTheDocument();
  });

  it("uses the shared expired error page for an expired invitation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 410,
        json: vi.fn().mockResolvedValue({ message: "Invitation expired" }),
      }),
    );

    render(<InvitationEntryPage />);

    expect(
      await screen.findByRole("heading", {
        name: "بانگهێشتنامەکە بەسەرچووە",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("410")).toBeInTheDocument();
  });
});
