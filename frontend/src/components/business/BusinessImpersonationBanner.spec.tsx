import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessImpersonationBanner } from "@/components/business/BusinessImpersonationBanner";

vi.mock("@/features/business/api", () => ({
  exitBusinessImpersonation: vi.fn(),
}));

describe("BusinessImpersonationBanner", () => {
  it("keeps the security context visible with explicit dark-mode contrast", () => {
    render(
      <BusinessImpersonationBanner
        businessName="Ismail"
        platformAdminName="Sponsor.krd"
      />,
    );

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Signed in as Ismail");
    expect(banner).toHaveTextContent("platform administrator Sponsor.krd");
    expect(banner).toHaveClass("dark:bg-[#211b10]/95");
    expect(
      screen.getByRole("button", { name: "Exit impersonation" }),
    ).toHaveClass("dark:bg-amber-200", "dark:text-amber-950");
  });
});
