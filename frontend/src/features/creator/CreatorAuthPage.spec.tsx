import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreatorAuthPage } from "@/features/creator/CreatorAuthPage";

describe("CreatorAuthPage", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("uses the shared authentication design for Creator signup", () => {
    render(<CreatorAuthPage mode="signup" />);

    expect(
      screen.getByRole("heading", { name: "هەژماری خۆت دروست بکە" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("بچۆ ژوورەوە بۆ دروستکردن و بەڕێوەبردنی پەڕەکانت"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "پانێڵی بەکارهێنەر" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change theme" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "بچۆ ژوورەوە" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.getByRole("link", { name: "بە گوگڵ هەژمار دروست بکە" }),
    ).toHaveAttribute(
      "href",
      "/api/creator/auth/google/start?intent=signup",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/ئیمەیڵ و مۆبایل پشتڕاست دەکرێنەوە/),
    ).not.toBeInTheDocument();
  });

  it("customizes the same Google control for Creator sign in", () => {
    render(<CreatorAuthPage mode="login" />);

    expect(
      screen.getByRole("heading", { name: "بچۆ ژوورەوە بۆ هەژمارەکەت" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "بە Google بچۆ ژوورەوە" }),
    ).toHaveAttribute("href", "/api/creator/auth/google/start?intent=login");
  });
});
