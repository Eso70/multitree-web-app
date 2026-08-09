import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackTikTokEvent } from "./tiktok-dispatch";

/**
 * How an event reaches the pixel.
 *
 * The single-pixel path is the one nearly every business is on, so it must stay
 * exactly what it always was: one bare `ttq.track`. The multi-pixel path exists
 * because a business paying for a second pixel and receiving events on only one
 * of them looks identical to a misconfigured pixel.
 */

const properties = {
  content_id: "action-1",
  content_ids: ["action-1"],
  content_type: "mini:whatsapp",
  content_name: "WhatsApp",
  description: "",
};

function stubQueue(withInstance: boolean) {
  const track = vi.fn();
  const instanceTrack = vi.fn();
  const ttq: Record<string, unknown> = { track, push: vi.fn() };
  if (withInstance) {
    ttq.instance = vi.fn(() => ({ track: instanceTrack }));
  }
  vi.stubGlobal("window", { ...globalThis.window, ttq });
  return { track, instanceTrack, instance: ttq.instance as ReturnType<typeof vi.fn> };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as { ttq?: unknown }).ttq;
});

describe("trackTikTokEvent", () => {
  it("uses one bare track call for a single pixel", () => {
    const { track, instanceTrack } = stubQueue(true);

    trackTikTokEvent("Contact", properties, "event-1", ["PIXELONE"]);

    expect(track).toHaveBeenCalledTimes(1);
    expect(instanceTrack).not.toHaveBeenCalled();
  });

  it("uses one bare track call when no pixel ids are supplied", () => {
    const { track, instanceTrack } = stubQueue(true);

    trackTikTokEvent("Contact", properties, "event-1");

    expect(track).toHaveBeenCalledTimes(1);
    expect(instanceTrack).not.toHaveBeenCalled();
  });

  it("addresses each pixel explicitly when more than one is loaded", () => {
    const { track, instanceTrack, instance } = stubQueue(true);

    trackTikTokEvent("Contact", properties, "event-1", ["ONE", "TWO"]);

    expect(instance).toHaveBeenCalledWith("ONE");
    expect(instance).toHaveBeenCalledWith("TWO");
    expect(instanceTrack).toHaveBeenCalledTimes(2);
    // Not both routes: that would report the event twice per pixel.
    expect(track).not.toHaveBeenCalled();
  });

  it("sends the same event id to every pixel", () => {
    const { instanceTrack } = stubQueue(true);

    trackTikTokEvent("Contact", properties, "shared-id", ["ONE", "TWO"]);

    for (const call of instanceTrack.mock.calls) {
      expect(call[2]).toEqual({ event_id: "shared-id" });
    }
  });

  it("falls back to track while only the stub queue exists", () => {
    // `instance` is added by the real events.js. Before it lands, the stub
    // replays a queued `track`, so dropping the event would be worse.
    const { track } = stubQueue(false);

    trackTikTokEvent("Contact", properties, "event-1", ["ONE", "TWO"]);

    expect(track).toHaveBeenCalledTimes(1);
  });

  it("falls back to track when every instance lookup misses", () => {
    const track = vi.fn();
    vi.stubGlobal("window", {
      ...globalThis.window,
      ttq: { track, push: vi.fn(), instance: () => undefined },
    });

    trackTikTokEvent("Contact", properties, "event-1", ["ONE", "TWO"]);

    expect(track).toHaveBeenCalledTimes(1);
  });
});
