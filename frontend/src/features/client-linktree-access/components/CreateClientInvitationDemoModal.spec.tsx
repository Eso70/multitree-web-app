import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateClientInvitationDemoModal } from "./CreateClientInvitationDemoModal";

const allowedTemplates = new Set(["spectrum", "aurora"]);

vi.mock("@/hooks/useTemplateAccess", () => ({
  useTemplateAccess: () => ({
    isLoading: false,
    isTemplateAllowed: (key: string) => allowedTemplates.has(key),
  }),
}));

describe("CreateClientInvitationDemoModal", () => {
  it("captures every Linktree template available to the current business", () => {
    const onCreate = vi.fn();
    render(
      <CreateClientInvitationDemoModal
        isOpen
        onClose={vi.fn()}
        onCreate={onCreate}
      />,
    );

    expect(screen.getByText("Spectrum")).toBeInTheDocument();
    expect(screen.getByText("Aurora")).toBeInTheDocument();
    expect(screen.queryByText("Frost")).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("نموونە: کەمپینی تیکتۆکی ئاب"),
      { target: { value: "کەمپینی هاوین" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "دروستکردنی بانگهێشتنامەی تاقیکردنەوە",
      }),
    );

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: "Spectrum",
        allowedTemplateNames: ["Spectrum", "Aurora"],
      }),
    );
  });
});
