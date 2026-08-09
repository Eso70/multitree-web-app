import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessSidebarFooter } from "@/features/business/components/BusinessSidebarFooter";

describe("BusinessSidebarFooter", () => {
  it("shows the current plan and upgrade action for upgradeable plans", () => {
    const onUpgrade = vi.fn();

    render(
      <BusinessSidebarFooter
        collapsed={false}
        planCode="basic"
        planName="Basic"
        onSupport={vi.fn()}
        onUpgrade={onUpgrade}
      />,
    );

    expect(screen.getByText("Basic")).toBeInTheDocument();
    fireEvent.click(screen.getByText("پلانەکەت بەرز بکەرەوە"));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("does not offer an upgrade for the highest plan", () => {
    render(
      <BusinessSidebarFooter
        collapsed
        planCode="ultra"
        planName="Ultra"
        onSupport={vi.fn()}
        onUpgrade={vi.fn()}
      />,
    );

    expect(screen.getByText("Ultra")).toBeInTheDocument();
    expect(
      screen.queryByText("پلانەکەت بەرز بکەرەوە"),
    ).not.toBeInTheDocument();
  });
});
