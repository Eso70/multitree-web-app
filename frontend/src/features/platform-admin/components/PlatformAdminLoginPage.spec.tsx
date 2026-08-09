import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlatformAdminLoginPage from "./PlatformAdminLoginPage";

describe("PlatformAdminLoginPage", () => {
  it("offers Google and email-code platform administrator authentication", () => {
    render(<PlatformAdminLoginPage />);
    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", "/api/platform/auth/google/start?remember=1");
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeInTheDocument();
  });
});
