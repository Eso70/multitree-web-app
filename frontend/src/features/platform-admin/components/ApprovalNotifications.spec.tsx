import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalNotifications } from "./ApprovalNotifications";

const mocks = vi.hoisted(() => ({
  load: vi.fn().mockResolvedValue(undefined),
  read: vi.fn().mockResolvedValue(undefined),
  dismiss: vi.fn().mockResolvedValue(undefined),
  markAllRead: vi.fn().mockResolvedValue(undefined),
  deleteAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/communications/useNotificationInbox", () => ({
  useNotificationInbox: () => ({
    inbox: {
      items: [
        {
          id: "platform-notification-1",
          kind: "business_message",
          priority: "important",
          title: "پەیامی بزنس",
          body: "ناوەڕۆکی پەیامەکە",
          sourceType: "conversation",
          sourceId: "conversation-1",
          actionUrl:
            "/communication-center?tab=messages&conversation=conversation-1",
          readAt: null,
          createdAt: "2026-08-19T12:00:00.000Z",
        },
      ],
      unreadCount: 1,
    },
    loading: false,
    ...mocks,
  }),
}));

describe("ApprovalNotifications", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("opens the shared notification detail modal instead of navigating immediately", async () => {
    const user = userEvent.setup();
    render(<ApprovalNotifications />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "ئاگادارییەکان" }));
    await user.click(await screen.findByText("پەیامی بزنس"));

    expect(mocks.read).toHaveBeenCalledWith("platform-notification-1");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("ناوەڕۆکی پەیامەکە")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "وەڵامدانەوە" }),
    ).toBeInTheDocument();
  });
});
