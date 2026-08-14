import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvatarMenu } from "./AvatarMenu";

function renderMenu(props?: Partial<Parameters<typeof AvatarMenu>[0]>) {
  return render(
    <AvatarMenu
      name="Ismail"
      ariaLabel="Menu"
      items={[
        {
          id: "logout",
          label: "چوونەدەرەوە",
          icon: null,
          onClick: vi.fn(),
        },
      ]}
      {...props}
    />,
  );
}

describe("AvatarMenu", () => {
  it("shows the real sign-in address", () => {
    renderMenu({ email: "owner@business.krd" });
    fireEvent.click(screen.getByLabelText("Menu"));

    expect(screen.getByText("owner@business.krd")).toBeInTheDocument();
  });

  it("shows no address rather than inventing one from the name", () => {
    // This used to render `ismail@example.com` — a plausible address the
    // account does not own, indistinguishable from real data.
    renderMenu({ email: undefined });
    fireEvent.click(screen.getByLabelText("Menu"));

    expect(screen.getByText("Ismail")).toBeInTheDocument();
    expect(screen.queryByText(/@example\.com$/)).not.toBeInTheDocument();
  });

  it("treats a blank address as absent", () => {
    renderMenu({ email: "   " });
    fireEvent.click(screen.getByLabelText("Menu"));

    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});
