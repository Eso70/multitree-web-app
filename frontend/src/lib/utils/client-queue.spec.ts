import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The analytics queue's failure handling.
 *
 * The batch endpoint validates every event before its handler runs, so one id
 * the server cannot parse rejects the whole request — and a queue that puts a
 * rejected batch straight back retries that same request forever, blocking
 * every event behind it. A visitor's analytics simply stop, silently.
 *
 * These cover the two halves of the cure: refusing to keep an event the server
 * could never accept, and dropping a batch the server rejected permanently.
 */

const QUEUE_KEY = "multitree_analytics_events_v2";
const UUID = "11111111-1111-4111-8111-111111111111";
const PAGE_UUID = "22222222-2222-4222-8222-222222222222";

function storedEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: UUID,
    pageId: PAGE_UUID,
    eventName: "page_view",
    visitorId: "visitor-1",
    sessionId: "session-1",
    occurredAt: new Date().toISOString(),
    consentState: "unknown",
    browserDispatched: false,
    properties: {},
    ...overrides,
  };
}

/**
 * An in-memory `localStorage`.
 *
 * This runtime exposes a built-in `localStorage` that is undefined unless Node
 * is started with `--localstorage-file`, and it shadows the jsdom one, so the
 * module under test needs a store supplied explicitly.
 */
function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
  } as Storage;
}

function readStored(): Array<{ eventId: string }> {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
}

async function loadQueueModule() {
  vi.resetModules();
  return import("./client-queue");
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("localStorage", memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analytics queue delivery", () => {
  it("marks every new public-page event for automatic marketing delivery", async () => {
    const { queueAnalyticsEvent } = await loadQueueModule();

    queueAnalyticsEvent({ pageId: PAGE_UUID, eventName: "page_view" });

    const [event] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || "[]",
    ) as Array<{
      consentState: string;
    }>;
    expect(event.consentState).toBe("granted");
  });

  it("discards a stored event whose id the server could never parse", async () => {
    // An id minted by an older build, before createRuntimeId always produced a
    // UUID. It cannot be accepted, so keeping it only blocks the queue.
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([
        storedEvent({ eventId: "m1k2j3-abc123-xyz789" }),
        storedEvent({ eventId: UUID }),
      ]),
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () => ({ data: { events: [{ eventId: UUID }] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { flushNow } = await loadQueueModule();
    await flushNow();

    const sent = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body,
    ) as { events: Array<{ eventId: string }> };
    expect(sent.events).toHaveLength(1);
    expect(sent.events[0].eventId).toBe(UUID);
  });

  it("drops a batch the server rejects permanently instead of retrying it forever", async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([storedEvent()]));
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 400, json: () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { flushNow } = await loadQueueModule();
    await flushNow();

    expect(readStored()).toEqual([]);
  });

  it("keeps a batch the server failed to accept for a transient reason", async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([storedEvent()]));
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503, json: () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { flushNow } = await loadQueueModule();
    await expect(flushNow()).rejects.toThrow();

    expect(readStored()).toHaveLength(1);
  });

  it("hands off more than one batch when the page goes away", async () => {
    // A visitor who clicked through several links can be holding more than one
    // batch. Sending only the first left the rest until some later visit.
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(
        Array.from({ length: 120 }, (_, index) =>
          storedEvent({
            eventId: UUID.replace(/.{4}$/, String(index).padStart(4, "0")),
          }),
        ),
      ),
    );
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...globalThis.navigator, sendBeacon });
    vi.stubGlobal("fetch", vi.fn());
    const listenerSpy = vi.spyOn(window, "addEventListener");

    await loadQueueModule();
    const pagehide = listenerSpy.mock.calls.find(
      ([eventName]) => eventName === "pagehide",
    )?.[1] as EventListener;
    pagehide(new Event("pagehide"));

    expect(sendBeacon).toHaveBeenCalledTimes(3);
    expect(readStored()).toHaveLength(120);
  });

  it("stops handing off once the browser refuses a beacon", async () => {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(
        Array.from({ length: 120 }, (_, index) =>
          storedEvent({
            eventId: UUID.replace(/.{4}$/, String(index).padStart(4, "0")),
          }),
        ),
      ),
    );
    const sendBeacon = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    vi.stubGlobal("navigator", { ...globalThis.navigator, sendBeacon });
    vi.stubGlobal("fetch", vi.fn());
    const listenerSpy = vi.spyOn(window, "addEventListener");

    await loadQueueModule();
    const pagehide = listenerSpy.mock.calls.find(
      ([eventName]) => eventName === "pagehide",
    )?.[1] as EventListener;
    pagehide(new Event("pagehide"));

    // Browser acceptance is not a server acknowledgement, so all remain.
    expect(readStored()).toHaveLength(120);
  });

  it("keeps a rate-limited batch, which is a wait rather than a rejection", async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([storedEvent()]));
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 429, json: () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { flushNow } = await loadQueueModule();
    await expect(flushNow()).rejects.toThrow();

    expect(readStored()).toHaveLength(1);
  });

  it("retires individually rejected events acknowledged by the server", async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([storedEvent()]));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => ({
          data: {
            accepted: 0,
            deduplicated: 0,
            events: [{ eventId: UUID, accepted: false }],
          },
        }),
      }),
    );

    const { flushNow } = await loadQueueModule();
    await flushNow();

    expect(readStored()).toEqual([]);
  });

  it("keeps events when a success response lacks complete acknowledgements", async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([storedEvent()]));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: () => ({ data: { accepted: 1 } }),
      }),
    );

    const { flushNow } = await loadQueueModule();
    await expect(flushNow()).rejects.toThrow();

    expect(readStored()).toHaveLength(1);
  });

  it("still sends a click queued while a view batch is in flight", async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([storedEvent()]));
    let resolveFirst: ((value: unknown) => void) | undefined;
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const clickId = "33333333-3333-4333-8333-333333333333";
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: () => ({ data: { events: [{ eventId: clickId }] } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { flushNow, queueAnalyticsEvent } = await loadQueueModule();
    const firstFlush = flushNow();
    queueAnalyticsEvent({
      pageId: PAGE_UUID,
      eventId: clickId,
      eventName: "button_click",
    });
    const clickFlush = flushNow();
    resolveFirst?.({
      ok: true,
      status: 202,
      json: () => ({ data: { events: [{ eventId: UUID }] } }),
    });

    await firstFlush;
    await clickFlush;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readStored()).toEqual([]);
  });

  it("delivers from memory when localStorage is blocked", async () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      getItem: () => {
        throw new Error("blocked");
      },
    });
    const fetchMock = vi.fn().mockImplementation((_url, init) => {
      const payload = JSON.parse(init.body) as {
        events: Array<{ eventId: string }>;
      };
      return Promise.resolve({
        ok: true,
        status: 202,
        json: () => ({
          data: {
            events: payload.events.map(({ eventId }) => ({ eventId })),
          },
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { flushNow, queueAnalyticsEvent } = await loadQueueModule();
    queueAnalyticsEvent({ pageId: PAGE_UUID, eventName: "page_view" });
    await flushNow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
