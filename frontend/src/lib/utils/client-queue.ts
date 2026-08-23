"use client";

import { createRuntimeId } from "./random-id";
import { getAnalyticsSessionId, getVisitorId } from "./visitor-id";

type InternalEventName =
  | "page_view"
  | "engaged_view"
  | "button_click"
  | "whatsapp_click"
  | "call_click"
  | "email_click"
  | "social_click"
  | "product_click"
  | "service_click"
  | "form_submit"
  | "lead_created"
  | "booking_started"
  | "checkout_started"
  | "order_completed"
  | "download"
  // Richer interactions a mini website produces: opening a section, gallery or
  // player; reaching the form; sharing the page.
  | "action_open"
  | "form_view"
  | "share"
  | "custom";

interface QueuedAnalyticsEvent {
  eventId: string;
  pageId: string;
  actionId?: string;
  eventName: InternalEventName;
  visitorId: string;
  sessionId: string;
  occurredAt: string;
  pageUrl?: string;
  referrer?: string;
  ttclid?: string;
  ttp?: string;
  consentState: "unknown" | "granted" | "denied";
  browserDispatched: boolean;
  /**
   * The TikTok event name the pixel already fired for this id, so the server
   * reports the same pair instead of re-deriving a name that may differ.
   */
  browserEventName?: string;
  conversionValue?: number;
  currency?: string;
  properties: Record<string, unknown>;
}

const QUEUE_KEY = "multitree_analytics_events_v2";
const MAX_QUEUE_SIZE = 500;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FLUSH_INTERVAL_MS = 15_000;
const MAX_ANALYTICS_URL_LENGTH = 2048;
const MAX_TIKTOK_ATTRIBUTION_LENGTH = 255;
let memoryQueue: QueuedAnalyticsEvent[] = [];
let flushPromise: Promise<void> | null = null;

function boundedAnalyticsValue(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  return value ? value.slice(0, maxLength) : undefined;
}

function normalizeEvent(event: QueuedAnalyticsEvent): QueuedAnalyticsEvent {
  return {
    ...event,
    pageUrl: boundedAnalyticsValue(event.pageUrl, MAX_ANALYTICS_URL_LENGTH),
    referrer: boundedAnalyticsValue(event.referrer, MAX_ANALYTICS_URL_LENGTH),
    ttclid: boundedAnalyticsValue(
      event.ttclid,
      MAX_TIKTOK_ATTRIBUTION_LENGTH,
    ),
    ttp: boundedAnalyticsValue(event.ttp, MAX_TIKTOK_ATTRIBUTION_LENGTH),
  };
}

function storageAvailable(): boolean {
  try {
    localStorage.setItem("__mt_analytics_test", "1");
    localStorage.removeItem("__mt_analytics_test");
    return true;
  } catch {
    return false;
  }
}

/**
 * What the server's DTO will accept for an id.
 *
 * Checked here as well because the batch endpoint validates every event before
 * the handler runs: one id the server cannot parse rejects the whole request,
 * and the queue puts it straight back. An id minted by an older build — before
 * `createRuntimeId` always produced a UUID — would otherwise sit at the front
 * of every retry forever and block every event behind it.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validEvent(value: unknown): value is QueuedAnalyticsEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<QueuedAnalyticsEvent>;
  return Boolean(
    event.eventId &&
    UUID_PATTERN.test(event.eventId) &&
    event.pageId &&
    UUID_PATTERN.test(event.pageId) &&
    event.eventName &&
    typeof event.visitorId === "string" &&
    event.visitorId.length >= 8 &&
    event.visitorId.length <= 128 &&
    typeof event.sessionId === "string" &&
    event.sessionId.length >= 8 &&
    event.sessionId.length <= 128 &&
    event.occurredAt &&
    Number.isFinite(new Date(event.occurredAt).getTime()),
  );
}

function readQueue(): QueuedAnalyticsEvent[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  if (!storageAvailable()) {
    memoryQueue = memoryQueue.filter(
      (event) =>
        validEvent(event) && new Date(event.occurredAt).getTime() >= cutoff,
    );
    return [...memoryQueue];
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    const stored = Array.isArray(parsed) ? parsed : [];
    const combined = [...stored];
    for (const memoryEvent of memoryQueue) {
      if (
        !combined.some(
          (event) => validEvent(event) && event.eventId === memoryEvent.eventId,
        )
      ) {
        combined.push(memoryEvent);
      }
    }
    const queue = combined
      .filter(
        (event): event is QueuedAnalyticsEvent =>
          validEvent(event) && new Date(event.occurredAt).getTime() >= cutoff,
      )
      .map(normalizeEvent);
    memoryQueue = queue.slice(-MAX_QUEUE_SIZE);
    if (queue.length !== stored.length) writeQueue(queue);
    return queue;
  } catch {
    return [];
  }
}

function writeQueue(events: QueuedAnalyticsEvent[]): void {
  memoryQueue = events.slice(-MAX_QUEUE_SIZE);
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue));
  } catch {
    // Analytics must never interrupt the public page.
  }
}

function cookie(name: string): string | undefined {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`,
    ),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function attribution(): {
  pageUrl?: string;
  referrer?: string;
  ttclid?: string;
  ttp?: string;
} {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    pageUrl: boundedAnalyticsValue(
      window.location.href,
      MAX_ANALYTICS_URL_LENGTH,
    ),
    referrer: boundedAnalyticsValue(
      document.referrer || undefined,
      MAX_ANALYTICS_URL_LENGTH,
    ),
    ttclid: boundedAnalyticsValue(
      params.get("ttclid") || undefined,
      MAX_TIKTOK_ATTRIBUTION_LENGTH,
    ),
    ttp: boundedAnalyticsValue(cookie("_ttp"), MAX_TIKTOK_ATTRIBUTION_LENGTH),
  };
}

function add(event: QueuedAnalyticsEvent): void {
  const queue = readQueue();
  if (queue.some((stored) => stored.eventId === event.eventId)) return;
  queue.push(event);
  writeQueue(queue);
  if (queue.length >= 25) void flushQueue().catch(() => undefined);
}

function createEvent(input: {
  pageId: string;
  actionId?: string;
  eventName: InternalEventName;
  eventId?: string;
  browserDispatched?: boolean;
  browserEventName?: string;
  properties?: Record<string, unknown>;
  conversionValue?: number;
  currency?: string;
}): QueuedAnalyticsEvent {
  return {
    eventId: input.eventId || createRuntimeId(),
    pageId: input.pageId,
    actionId: input.actionId,
    eventName: input.eventName,
    visitorId: getVisitorId(),
    sessionId: getAnalyticsSessionId(),
    occurredAt: new Date().toISOString(),
    ...attribution(),
    // Marketing tracking is automatic on allowlisted public pages. Keep the
    // existing transport field for backward-compatible API and database rows.
    consentState: "granted",
    browserDispatched: input.browserDispatched || false,
    browserEventName: input.browserEventName,
    conversionValue: input.conversionValue,
    currency: input.currency,
    properties: input.properties || {},
  };
}

export function queueAnalyticsEvent(input: {
  pageId: string;
  actionId?: string;
  eventName: InternalEventName;
  eventId?: string;
  browserDispatched?: boolean;
  browserEventName?: string;
  properties?: Record<string, unknown>;
  conversionValue?: number;
  currency?: string;
}): string {
  const event = createEvent(input);
  add(event);
  return event.eventId;
}

/**
 * Hands one navigation-critical event to the browser immediately.
 *
 * Unlike the normal fetch flush, `sendBeacon` transfers ownership before the
 * caller opens another application. A true result is not a server
 * acknowledgement, so the durable queue intentionally retains the event and
 * retries it later under the same id.
 */
export function handoffAnalyticsEvent(eventId: string): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.sendBeacon !== "function"
  ) {
    return false;
  }
  const event = readQueue().find((queued) => queued.eventId === eventId);
  if (!event) return false;
  try {
    return navigator.sendBeacon(
      "/api/public/analytics/events",
      new Blob([JSON.stringify({ events: [event] })], {
        type: "application/json",
      }),
    );
  } catch {
    return false;
  }
}

/**
 * Builds the first-party navigation hop for a registered HTTP(S) action.
 *
 * The destination is used only to decide whether the browser supports the
 * hop; it is never placed in the URL. The backend resolves the real target
 * from `public_page_actions`, which prevents this endpoint becoming an open
 * redirect. Native schemes stay on the direct-beacon path.
 */
export function trackedNavigationUrl(
  eventId: string,
  destination: string | undefined,
): string | undefined {
  if (!destination) return undefined;
  let protocol: string;
  try {
    protocol = new URL(destination, window.location.href).protocol;
  } catch {
    return undefined;
  }
  if (protocol !== "http:" && protocol !== "https:") return undefined;

  const event = readQueue().find((queued) => queued.eventId === eventId);
  if (!event?.actionId) return undefined;
  const query = new URLSearchParams({
    eventId: event.eventId,
    eventName: event.eventName,
    visitorId: event.visitorId,
    sessionId: event.sessionId,
    occurredAt: event.occurredAt,
    consentState: event.consentState,
    browserDispatched: String(event.browserDispatched),
  });
  if (event.pageUrl) query.set("pageUrl", event.pageUrl);
  if (event.referrer) query.set("referrer", event.referrer);
  if (event.ttclid) query.set("ttclid", event.ttclid);
  if (event.ttp) query.set("ttp", event.ttp);
  if (event.browserEventName)
    query.set("browserEventName", event.browserEventName);
  const parsedDestination = new URL(destination, window.location.href);
  const hostname = parsedDestination.hostname.toLowerCase();
  const message =
    hostname === "wa.me" ||
    hostname === "whatsapp.com" ||
    hostname.endsWith(".whatsapp.com")
      ? parsedDestination.searchParams.get("text")
      : hostname === "t.me" ||
          hostname === "telegram.me" ||
          hostname.endsWith(".telegram.me")
        ? parsedDestination.searchParams.get("start")
        : undefined;
  if (message) query.set("message", message.slice(0, 2000));

  return `/api/public/analytics/open/${encodeURIComponent(
    event.pageId,
  )}/${encodeURIComponent(event.actionId)}?${query.toString()}`;
}

function reportFlush(detail: {
  ok: boolean;
  statusCode?: number;
  accepted?: number;
  deduplicated?: number;
  total: number;
  retryable?: boolean;
}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mt:analytics-flush", { detail }));
}

function removeQueuedEvents(eventIds: Set<string>): void {
  if (!eventIds.size) return;
  writeQueue(readQueue().filter((event) => !eventIds.has(event.eventId)));
}

async function deliverNextBatch(): Promise<void> {
  const sent = readQueue().slice(0, 50);
  if (!sent.length) return;

  try {
    const response = await fetch("/api/public/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ events: sent }),
    });
    if (response.status >= 400 && response.status < 500) {
      if (response.status === 429) throw new Error("Analytics rate limited");
      removeQueuedEvents(new Set(sent.map((event) => event.eventId)));
      reportFlush({
        ok: false,
        statusCode: response.status,
        retryable: false,
        total: sent.length,
      });
      return;
    }
    if (!response.ok) throw new Error(`Analytics HTTP ${response.status}`);

    let accepted: number | undefined;
    let deduplicated: number | undefined;
    let acknowledgedEventIds: Set<string> | undefined;
    try {
      const payload = (await response.json()) as {
        data?: {
          accepted?: number;
          deduplicated?: number;
          events?: Array<{ eventId?: string }>;
        };
      };
      accepted = payload.data?.accepted;
      deduplicated = payload.data?.deduplicated;
      if (Array.isArray(payload.data?.events)) {
        const sentIds = new Set(sent.map((event) => event.eventId));
        acknowledgedEventIds = new Set(
          payload.data.events
            .map((event) => event.eventId)
            .filter(
              (eventId): eventId is string =>
                typeof eventId === "string" && sentIds.has(eventId),
            ),
        );
      }
    } catch {
      // Retain the idempotent batch unless every event is acknowledged.
    }
    if (!acknowledgedEventIds || acknowledgedEventIds.size !== sent.length) {
      throw new Error("Analytics acknowledgement was incomplete");
    }

    removeQueuedEvents(acknowledgedEventIds);
    reportFlush({
      ok: true,
      statusCode: response.status,
      accepted,
      deduplicated,
      total: sent.length,
    });
  } catch {
    reportFlush({ ok: false, retryable: true, total: sent.length });
    throw new Error("Analytics delivery failed");
  }
}

function flushQueue(): Promise<void> {
  if (flushPromise) return flushPromise;
  flushPromise = deliverNextBatch().finally(() => {
    flushPromise = null;
  });
  return flushPromise;
}

export async function flushNow(): Promise<void> {
  const activeFlush = flushPromise;
  if (activeFlush) await activeFlush;
  await flushQueue();
}

if (typeof window !== "undefined") {
  let timer = window.setInterval(
    () => void flushQueue().catch(() => undefined),
    FLUSH_INTERVAL_MS,
  );

  /**
   * Attempts a final handoff without mistaking browser acceptance for a
   * server acknowledgement. Successfully stored events are safe to retry
   * because `eventId` is idempotent.
   *
   * `sendBeacon` is the only send that survives the page going away, so it has
   * to clear more than one batch: a visitor who clicked through several links
   * can be holding more than fifty events, and leaving the rest meant they only
   * left on some later visit — or never, once they aged out.
   */
  const beacon = () => {
    let pending = readQueue();
    // Bounded: sendBeacon has a per-origin size budget, and a page being
    // unloaded is not the place to attempt an unbounded drain.
    for (let batch = 0; batch < 4 && pending.length; batch += 1) {
      const events = pending.slice(0, 50);
      const accepted = navigator.sendBeacon(
        "/api/public/analytics/events",
        new Blob([JSON.stringify({ events })], {
          type: "application/json",
        }),
      );
      // Refused, usually because the budget is spent. Keep what is left.
      if (!accepted) break;
      pending = pending.slice(50);
    }
  };

  window.addEventListener("pagehide", beacon);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) beacon();
  });

  // A page restored from the back/forward cache keeps running this module, so
  // the interval has to come back with it. Clearing it on `beforeunload` and
  // never restarting left a restored page flushing only on `pagehide`.
  window.addEventListener("pageshow", (event) => {
    if (!(event as PageTransitionEvent).persisted) return;
    window.clearInterval(timer);
    timer = window.setInterval(
      () => void flushQueue().catch(() => undefined),
      FLUSH_INTERVAL_MS,
    );
    void flushQueue().catch(() => undefined);
  });
}
