import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PLATFORM_MINI_WEBSITE_WORKSPACE } from "@/features/mini-website/workspace-config";
import { PlatformMiniWebsitesPage } from "./PlatformMiniWebsitesPage";

const mocks = vi.hoisted(() => ({
  managerProps: vi.fn(),
  apiRequest: vi.fn(),
}));

vi.mock("@/lib/api/request", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("@/features/mini-website/MiniWebsitesPage", () => ({
  MiniWebsitesPage: (props: Record<string, unknown>) => {
    mocks.managerProps(props);
    return <div>shared-mini-website-manager</div>;
  },
}));
vi.mock("@/lib/contexts/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("PlatformMiniWebsitesPage", () => {
  it("renders the business manager with platform configuration", async () => {
    mocks.apiRequest.mockResolvedValue({
      branding: {
        name: "MultiTree",
        logo: "/logo.png",
        avatar: "/avatar.png",
        favicon: "/favicon.ico",
        accentColor: "#b6f20d",
      },
      publicPathPrefix: "/bio",
    });

    render(<PlatformMiniWebsitesPage />);

    expect(
      await screen.findByText("shared-mini-website-manager"),
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.managerProps).toHaveBeenCalled());
    expect(mocks.managerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        businessLogo: "/logo.png",
        businessDefaultAvatar: "/avatar.png",
        websiteColor: "#b6f20d",
        workspaceConfig: PLATFORM_MINI_WEBSITE_WORKSPACE,
      }),
    );
  });
});
