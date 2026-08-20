import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";
import type { CommunicationNotification } from "./types";

const notification: CommunicationNotification = {
  id: "notification-1",
  kind: "business_message",
  priority: "important",
  title: "پەیامێکی نوێ",
  body: "ناوەڕۆکی تەواوی ئاگادارییەکە",
  sourceType: "conversation",
  sourceId: "conversation-1",
  actionUrl: "/communication-center?conversation=conversation-1",
  readAt: null,
  createdAt: "2026-08-19T12:00:00.000Z",
};

describe("NotificationBell", () => {
  it("opens the same detail modal after reading an inbox item", async () => {
    const user = userEvent.setup();
    const onRead = vi.fn().mockResolvedValue(undefined);

    render(
      <NotificationBell
        inbox={{ items: [notification], unreadCount: 1 }}
        loading={false}
        onRefresh={vi.fn()}
        onRead={onRead}
        onDismiss={vi.fn().mockResolvedValue(undefined)}
        onMarkAllRead={vi.fn().mockResolvedValue(undefined)}
        onDeleteAll={vi.fn().mockResolvedValue(undefined)}
        modalDescription="ئاگادارییەکانی پلاتفۆرم"
        canOpenAction={() => true}
        onOpenAction={vi.fn()}
        actionLabel={() => "وەڵامدانەوە"}
      />,
    );

    await user.click(screen.getByRole("button", { name: "ئاگادارییەکان" }));
    await user.click(screen.getByText(notification.title));

    await waitFor(() => expect(onRead).toHaveBeenCalledWith(notification.id));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(notification.title)).toBeInTheDocument();
    expect(within(dialog).getByText(notification.body)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "وەڵامدانەوە" }),
    ).toBeInTheDocument();
  });

  it("includes platform-only unread content without changing inbox actions", async () => {
    const user = userEvent.setup();
    const markAllRead = vi.fn().mockResolvedValue(undefined);

    render(
      <NotificationBell
        inbox={{ items: [], unreadCount: 0 }}
        loading={false}
        onRefresh={vi.fn()}
        onRead={vi.fn().mockResolvedValue(undefined)}
        onDismiss={vi.fn().mockResolvedValue(undefined)}
        onMarkAllRead={markAllRead}
        onDeleteAll={vi.fn().mockResolvedValue(undefined)}
        additionalUnreadCount={2}
        additionalContent={<div>پەسەندکردنە چاوەڕوانەکان</div>}
        modalDescription="ئاگادارییەکانی پلاتفۆرم"
      />,
    );

    await user.click(screen.getByRole("button", { name: "ئاگادارییەکان" }));
    expect(screen.getByText("2 بابەتی نەخوێندراو")).toBeInTheDocument();
    expect(screen.getByText("پەسەندکردنە چاوەڕوانەکان")).toBeInTheDocument();
    expect(screen.getByTitle("هەمووی خوێندراوەتەوە")).toBeDisabled();
  });
});
