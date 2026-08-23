import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flushNow: vi.fn().mockResolvedValue(undefined),
  handoffAnalyticsEvent: vi.fn().mockReturnValue(true),
  queueAnalyticsEvent: vi.fn(),
  trackedNavigationUrl: vi.fn(),
  createRuntimeId: vi.fn(),
  trackTikTokEvent: vi.fn(),
  recordTikTokDebug: vi.fn(),
}));

vi.mock("@/lib/utils/client-queue", () => ({
  flushNow: mocks.flushNow,
  handoffAnalyticsEvent: mocks.handoffAnalyticsEvent,
  queueAnalyticsEvent: mocks.queueAnalyticsEvent,
  trackedNavigationUrl: mocks.trackedNavigationUrl,
}));
vi.mock("@/lib/utils/random-id", () => ({
  createRuntimeId: mocks.createRuntimeId,
}));
vi.mock("./tiktok-dispatch", () => ({
  trackTikTokEvent: mocks.trackTikTokEvent,
}));
vi.mock("./tiktok-debug", () => ({
  recordTikTokDebug: mocks.recordTikTokDebug,
}));

import { createPageTracker } from "./page-tracking";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";
const ACTION_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createRuntimeId.mockReturnValue(EVENT_ID);
  mocks.queueAnalyticsEvent.mockReturnValue(EVENT_ID);
  mocks.trackedNavigationUrl.mockReturnValue(
    `/api/public/analytics/open/${PAGE_ID}/${ACTION_ID}?eventId=${EVENT_ID}`,
  );
});

describe("navigation-critical page tracking", () => {
  it("shares one id across Pixel, queue, beacon, and first-party hop", () => {
    const tracker = createPageTracker({
      pageId: PAGE_ID,
      pageName: "Holiday Travel",
      contentType: "linktree",
      analytics: {
        pixelIds: ["PIXEL1"],
        actions: {
          "link:whatsapp": { id: ACTION_ID, pixelEvent: "Contact" },
        },
      },
    });

    const result = tracker.trackAction("link:whatsapp", "whatsapp_click", {
      destination: "https://wa.me/9647500000000",
    });

    expect(mocks.trackTikTokEvent).toHaveBeenCalledWith(
      "Contact",
      expect.any(Object),
      EVENT_ID,
      ["PIXEL1"],
    );
    expect(mocks.queueAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: EVENT_ID,
        pageId: PAGE_ID,
        actionId: ACTION_ID,
        eventName: "whatsapp_click",
        browserDispatched: true,
        browserEventName: "Contact",
      }),
    );
    expect(mocks.handoffAnalyticsEvent).toHaveBeenCalledWith(EVENT_ID);
    expect(mocks.trackedNavigationUrl).toHaveBeenCalledWith(
      EVENT_ID,
      "https://wa.me/9647500000000",
    );
    expect(result).toEqual({
      eventId: EVENT_ID,
      navigationUrl: expect.stringContaining("/api/public/analytics/open/"),
    });
    expect(
      mocks.handoffAnalyticsEvent.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.flushNow.mock.invocationCallOrder[0]);
  });

  it("suppresses the Pixel and every internal delivery on a double tap", () => {
    const tracker = createPageTracker({
      pageId: PAGE_ID,
      pageName: "Holiday Travel",
      contentType: "linktree",
      analytics: {
        pixelIds: ["PIXEL1"],
        actions: {
          "link:whatsapp": { id: ACTION_ID, pixelEvent: "Contact" },
        },
      },
    });

    tracker.trackAction("link:whatsapp", "whatsapp_click", {
      destination: "https://wa.me/9647500000000",
    });
    const repeated = tracker.trackAction("link:whatsapp", "whatsapp_click", {
      destination: "https://wa.me/9647500000000",
    });

    expect(repeated).toBeUndefined();
    expect(mocks.trackTikTokEvent).toHaveBeenCalledTimes(1);
    expect(mocks.queueAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(mocks.handoffAnalyticsEvent).toHaveBeenCalledTimes(1);
  });
});
