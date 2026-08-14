import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LayoutDashboard, LogOut } from "lucide-react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";

describe("shared dashboard chrome", () => {
  it("renders active navigation and closes the mobile sidebar after navigation", () => {
    const navigate = vi.fn();
    const close = vi.fn();

    render(
      <DashboardSidebar
        brandName="MultiTree"
        brandSubtitle="Dashboard"
        brandImage="/images/Logo.jpg"
        items={[
          {
            id: "dashboard",
            label: "Dashboard",
            icon: <LayoutDashboard className="h-4 w-4" />,
            active: true,
            onClick: navigate,
          },
        ]}
        collapsed={false}
        mobileOpen
        onCloseMobile={close}
      />,
    );

    const item = screen.getByRole("button", { name: "Dashboard" });
    expect(item).toHaveAttribute("aria-current", "page");
    fireEvent.click(item);
    expect(navigate).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("shares refresh, notification, theme, and profile controls", () => {
    const refresh = vi.fn();
    const toggleSidebar = vi.fn();
    const toggleTheme = vi.fn();
    const logout = vi.fn();

    render(
      <DashboardHeader
        title="Dashboard"
        theme="light"
        mounted
        refreshing={false}
        onToggleSidebar={toggleSidebar}
        onToggleTheme={toggleTheme}
        onRefresh={refresh}
        notifications={<button type="button">Notifications</button>}
        profile={{
          name: "Administrator",
          email: "admin@example.com",
          badge: "Platform Admin",
          items: [
            {
              id: "logout",
              label: "Log out",
              icon: <LogOut className="h-4 w-4" />,
              onClick: logout,
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh dashboard data" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(toggleSidebar).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
    expect(toggleTheme).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
