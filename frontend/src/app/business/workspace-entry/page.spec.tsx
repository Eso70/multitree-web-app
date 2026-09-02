import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as businessTheme from "@/lib/utils/business-error-theme";
import type { BusinessSubdomainTheme } from "@/lib/utils/business-error-theme";
import BusinessWorkspaceEntryPage from "./page";

describe("BusinessWorkspaceEntryPage", () => {
  beforeEach(() => {
    vi.spyOn(businessTheme, "loadBusinessSubdomainTheme").mockReturnValue(
      new Promise<BusinessSubdomainTheme>(() => undefined),
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("offers tenant-scoped Google and email authentication", () => {
    render(<BusinessWorkspaceEntryPage />);
    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", "/api/auth/google/start?remember=1");
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeVisible();
  });

  it("keeps the remembered-device choice on by default", () => {
    render(<BusinessWorkspaceEntryPage />);

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
    render(<BusinessWorkspaceEntryPage />);

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

  it("renders business tenant style and never MultiTree platform branding during loading", () => {
    render(<BusinessWorkspaceEntryPage />);

    expect(screen.getByText("پانێڵی بزنس")).toBeInTheDocument();
    expect(screen.getByText("بزنس")).toBeInTheDocument();
    expect(screen.queryByText("MultiTree")).not.toBeInTheDocument();
    expect(screen.queryByText("پانێڵی پلاتفۆڕم")).not.toBeInTheDocument();
  });

  it("updates to the loaded tenant business name once theme resolves", async () => {
    vi.spyOn(businessTheme, "loadBusinessSubdomainTheme").mockResolvedValue({
      name: "کۆمپانیای نموونە",
      websiteColor: {
        type: "solid",
        css: "#123456",
        primary: "#123456",
        raw: "#123456",
      },
      favicon: null,
      logo: null,
      subdomain: "example",
    });

    render(<BusinessWorkspaceEntryPage />);

    await waitFor(() => {
      expect(screen.getByText("کۆمپانیای نموونە")).toBeInTheDocument();
    });
    expect(screen.getByText("پانێڵی بزنس")).toBeInTheDocument();
    expect(screen.queryByText("MultiTree")).not.toBeInTheDocument();
    expect(screen.queryByText("پانێڵی پلاتفۆڕم")).not.toBeInTheDocument();
  });
});
