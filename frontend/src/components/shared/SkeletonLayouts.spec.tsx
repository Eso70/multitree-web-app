import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  SkeletonAdvertisingEditor,
  SkeletonBusinessDirectoryPage,
  SkeletonClientAccessPage,
  SkeletonLinktreeGrid,
  SkeletonPageManagement,
  SkeletonSettingsPage,
  SkeletonTikTokDelivery,
  SkeletonTikTokPage,
} from "@/components/shared/SkeletonPageLayouts";
import {
  SkeletonBusinessAnalyticsContent,
  SkeletonBusinessInfoForm,
  SkeletonLinktreeBasicInfo,
  SkeletonPageAnalyticsContent,
} from "@/components/shared/SkeletonModalLayouts";
import {
  SkeletonActivityList,
  SkeletonChatThread,
  SkeletonConversationList,
  SkeletonNotificationList,
  SkeletonSearchResultList,
  SkeletonSessionList,
} from "@/components/shared/SkeletonCommunicationLayouts";
import { ClientInvitationSkeleton } from "@/features/client-linktree-access/components/ClientInvitationSkeleton";

describe("layout-matched skeletons", () => {
  it.each([
    [
      <SkeletonPageManagement key="management" showTabs />,
      "Loading page management",
    ],
    [
      <SkeletonBusinessDirectoryPage key="businesses" />,
      "Loading business directory",
    ],
    [<SkeletonSettingsPage key="settings" tabCount={4} />, "Loading settings"],
    [
      <SkeletonAdvertisingEditor key="advertising" />,
      "Loading advertising editor",
    ],
    [<SkeletonTikTokPage key="tiktok" />, "Loading TikTok settings"],
    [<SkeletonTikTokDelivery key="delivery" />, "Loading TikTok delivery"],
    [
      <SkeletonClientAccessPage key="client-access" />,
      "Loading client invitations",
    ],
    [
      <SkeletonBusinessInfoForm key="business-form" />,
      "Loading business information",
    ],
    [
      <SkeletonLinktreeBasicInfo key="linktree-form" />,
      "Loading Linktree information",
    ],
    [
      <SkeletonPageAnalyticsContent key="page-analytics" />,
      "Loading page analytics data",
    ],
    [
      <SkeletonBusinessAnalyticsContent key="business-analytics" />,
      "Loading business analytics data",
    ],
    [<SkeletonNotificationList key="notifications" />, "Loading notifications"],
    [<SkeletonSessionList key="sessions" />, "Loading sessions"],
    [<SkeletonActivityList key="activity" />, "Loading login activity"],
    [<SkeletonConversationList key="conversations" />, "Loading conversations"],
    [<SkeletonChatThread key="chat" />, "Loading messages"],
    [<SkeletonSearchResultList key="search" />, "Loading search results"],
    [
      <ClientInvitationSkeleton key="invitation" />,
      "Loading client invitation",
    ],
  ])("provides one accessible status for %s", (element, label) => {
    const view = render(element);
    expect(screen.getByRole("status", { name: label })).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    view.unmount();
  });

  it("matches the six-card management grid used after loading", () => {
    const { container } = render(<SkeletonLinktreeGrid count={6} />);
    expect(container.querySelectorAll("article")).toHaveLength(6);
  });

  it("matches the invitation list row structure", () => {
    const { container } = render(<SkeletonClientAccessPage />);
    expect(container.querySelectorAll("article")).toHaveLength(3);
  });
});
