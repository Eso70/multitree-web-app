import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BusinessLoginPage from "./page";

describe("BusinessLoginPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("offers tenant-scoped Google and email authentication", () => {
    render(<BusinessLoginPage />);
    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", "/api/auth/google/start?remember=1");
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeVisible();
  });

  it("keeps the remembered-device choice on by default", () => {
    render(<BusinessLoginPage />);

    expect(
      screen.getByRole("checkbox", {
        name: /Keep me signed in on this device/i,
      }),
    ).toBeChecked();

    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", "/api/auth/google/start?remember=1");

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Keep me signed in on this device/i,
      }),
    );

    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", "/api/auth/google/start");
  });

  it("requests a one-time code for the entered business email", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            challengeId: "a".repeat(43),
            expiresInSeconds: 600,
            resendAfterSeconds: 60,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<BusinessLoginPage />);

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "owner@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with email" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Login code" })).toBeVisible(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/email/request",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "owner@example.com" }),
      }),
    );
  });
});
