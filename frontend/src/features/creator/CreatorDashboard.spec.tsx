import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreatorDashboard } from "./CreatorDashboard";

const navigation = vi.hoisted(() => ({
  pathname: "/account",
  push: vi.fn(),
  replace: vi.fn(),
}));
const apiRequest = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));
vi.mock("@/lib/api/request", () => ({ apiRequest }));
vi.mock("@/features/platform-admin/components/PlatformLinktreesPage", () => ({
  RootLinktreesPage: ({ canDelete }: { canDelete?: boolean }) => (
    <div data-can-delete={String(canDelete)}>Shared Linktree workspace</div>
  ),
}));
vi.mock("@/features/mini-website/MiniWebsitesPage", () => ({
  MiniWebsitesPage: ({ canDelete }: { canDelete?: boolean }) => (
    <div data-can-delete={String(canDelete)}>Shared mini website workspace</div>
  ),
}));
vi.mock("@/features/templates/components/TemplatesPage", () => ({
  TemplatesPage: ({
    canCreate,
    accessMode,
  }: {
    canCreate?: boolean;
    accessMode?: string;
  }) => (
    <div data-can-create={String(canCreate)} data-access-mode={accessMode}>
      Shared templates workspace
    </div>
  ),
}));

describe("CreatorDashboard", () => {
  beforeEach(() => {
    navigation.pathname = "/account";
    navigation.push.mockReset();
    navigation.replace.mockReset();
    apiRequest.mockReset().mockResolvedValue({
      account: {
        display_name: "Creator Name",
        email: "creator@example.com",
        avatar_url: null,
        status: "active",
        phone_last_four: null,
        phone_verified_at: null,
        page_type: "linktree",
        page_slug: "creator-page",
        trial_days: 7,
        trial_started_at: null,
        trial_ends_at: null,
        grace_ends_at: null,
        paid_started_at: null,
        last_login_at: null,
        created_at: "2026-08-21T00:00:00.000Z",
        billingStatus: "not_started",
        remainingTrialDays: 0,
        google: {
          provider: "google",
          email: "creator@example.com",
          emailVerified: true,
          lastAuthenticatedAt: null,
        },
      },
      branding: {
        name: "Creator Name",
        logo: null,
        avatar: null,
        favicon: null,
        accentColor: "#b6f20d",
      },
      publicPathPrefixes: { linktree: "/linktree", miniWebsite: "/bio" },
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("uses the shared dashboard sidebar, header, and page workspace", async () => {
    navigation.pathname = "/account/linktree";
    render(<CreatorDashboard />);

    const workspace = await screen.findByText("Shared Linktree workspace");
    expect(workspace).toHaveAttribute("data-can-delete", "false");
    expect(screen.getByText("داشبۆردی بەکارهێنەر")).toBeInTheDocument();
    expect(screen.getAllByText("پەیجەکان").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Refresh dashboard data" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ڕێکخستنەکان")).toBeInTheDocument();
  });

  it("locks the opposite shared workspace after a page type is committed", async () => {
    navigation.pathname = "/account/mini-website";
    render(<CreatorDashboard />);

    expect(
      await screen.findByText("ئەم جۆرە پەڕەیە قوفڵە"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Shared mini website workspace"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "مینی وێبسایت" })).toBeDisabled();
  });

  it("uses the shared view-only templates workspace for Creator users", async () => {
    navigation.pathname = "/account/templates";
    render(<CreatorDashboard />);

    const workspace = await screen.findByText("Shared templates workspace");
    expect(workspace).toHaveAttribute("data-can-create", "false");
    expect(workspace).toHaveAttribute("data-access-mode", "all");
    expect(screen.getByRole("button", { name: "قاڵبەکان" })).toBeEnabled();
  });
});
