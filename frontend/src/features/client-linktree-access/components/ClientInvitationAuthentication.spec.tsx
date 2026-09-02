import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientInvitationAuthentication } from "./ClientInvitationAuthentication";

describe("ClientInvitationAuthentication", () => {
  it("uses the standard authentication code field and opens the dashboard", async () => {
    const onUnlock = vi.fn().mockResolvedValue(null);
    render(
      <ClientInvitationAuthentication
        theme={null}
        unavailable={false}
        onUnlock={onUnlock}
      />,
    );

    const input = screen.getByLabelText("پینی دەستگەیشتن");
    fireEvent.change(input, { target: { value: "12a3456" } });
    expect(input).toHaveValue("123456");
    fireEvent.click(screen.getByRole("button", { name: /چوونە ناو پانێڵ/ }));

    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith("123456"));
  });

  it("does not expose a PIN form for an unavailable invitation", () => {
    render(
      <ClientInvitationAuthentication
        theme={null}
        unavailable
        onUnlock={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("پینی دەستگەیشتن")).not.toBeInTheDocument();
    expect(screen.getByText("بانگهێشتنامە بەردەست نییە")).toBeInTheDocument();
  });
});
