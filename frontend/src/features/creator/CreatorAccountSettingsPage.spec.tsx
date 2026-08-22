import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { CreatorAccountSettingsPage } from "./CreatorAccountSettingsPage";
import type { CreatorAccountView } from "./creator-dashboard.types";

vi.mock(
  "@/features/analytics/components/BusinessTikTokPixelConfigPage",
  () => ({
    BusinessTikTokPixelConfigPage: ({ owner }: { owner?: string }) => (
      <div data-owner={owner}>Shared TikTok settings</div>
    ),
  }),
);

const account: CreatorAccountView = {
  display_name: "Creator Name",
  email: "creator@example.com",
  avatar_url: "https://lh3.googleusercontent.com/a/example=s96-c",
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
  last_login_at: "2026-08-21T00:00:00.000Z",
  created_at: "2026-08-20T00:00:00.000Z",
  billingStatus: "not_started",
  remainingTrialDays: 0,
  google: {
    provider: "google",
    email: "creator@example.com",
    emailVerified: true,
    lastAuthenticatedAt: "2026-08-21T00:00:00.000Z",
  },
};

describe("CreatorAccountSettingsPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { sessions: [], recent_activity: [] },
        }),
      }),
    );
  });

  it("shows account information first and reuses security and TikTok settings", () => {
    render(<CreatorAccountSettingsPage account={account} />);

    expect(screen.getByRole("tab", { name: "زانیاری هەژمار" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByDisplayValue("Creator Name")).toBeDisabled();
    expect(screen.getByDisplayValue("creator@example.com")).toBeDisabled();
    expect(screen.getByAltText("وێنەی Creator Name")).toHaveAttribute(
      "src",
      expect.stringContaining("lh3.googleusercontent.com"),
    );
    expect(screen.getByLabelText("ئیمەیڵ پشتڕاستکراوە")).toBeInTheDocument();
    expect(screen.queryByText("creator-page")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("tab", { name: "چوونەژوورەوە و دانیشتنەکان" }),
    );
    expect(screen.getByText("Active sessions")).toBeInTheDocument();
    expect(screen.getByText("Recent login activity")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "ڕێکخستنەکانی تیکتۆک" }));
    expect(screen.getByText("Shared TikTok settings")).toHaveAttribute(
      "data-owner",
      "creator",
    );
  });
});
