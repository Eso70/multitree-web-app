import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import { CreateClientInvitationModal } from "./CreateClientInvitationModal";
import { InvitationCredentialsModal } from "./InvitationCredentialsModal";

function renderWithTenant(children: React.ReactNode) {
  return render(
    <ThemeProvider websiteColor="#2563eb" documentTheme="business">
      {children}
    </ThemeProvider>,
  );
}

describe("client invitation modals", () => {
  it("uses the tenant colour and the shared input conventions", async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    renderWithTenant(
      <CreateClientInvitationModal
        isOpen
        isCreating={false}
        onClose={vi.fn()}
        onCreate={onCreate}
      />,
    );

    const modal = document.querySelector<HTMLElement>(".modal-ltr");
    expect(modal?.style.getPropertyValue("--theme-primary")).toBe("#2563eb");
    expect(modal?.dataset.multitreeTheme).toBeUndefined();

    const input = screen.getByPlaceholderText("ناوی کڕیار بنووسە...");
    fireEvent.change(input, { target: { value: "Ismail" } });
    fireEvent.click(
      screen.getByRole("button", { name: "دروستکردنی بانگهێشتنامە" }),
    );

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Ismail"));
  });

  it("uses reusable copy fields and one consistent completion action", () => {
    renderWithTenant(
      <InvitationCredentialsModal
        invitation={{
          id: "invitation-id",
          clientLabel: "Ismail",
          token: "a".repeat(48),
          pin: "123456",
          createdAt: "2026-08-29T00:00:00.000Z",
        }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("بەستەری بانگهێشتنامە")).toHaveValue(
      `${window.location.origin}/client-linktree#${"a".repeat(48)}`,
    );
    expect(screen.getByLabelText("پینی ٦ ژمارەیی")).toHaveValue("123456");
    expect(screen.getByRole("button", { name: "تەواو" })).toBeEnabled();
  });
});
