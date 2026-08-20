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
let flushing = false;

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
    event.eventName &&
    event.visitorId &&
    event.sessionId &&
    event.occurredAt,
  );
}

function readQueue(): QueuedAnalyticsEvent[] {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    const queue = parsed.filter(
      (event) =>
        validEvent(event) && new Date(event.occurredAt).getTime() >= cutoff,
    );
    if (queue.length !== parsed.length) writeQueue(queue);
    return queue;
  } catch {
    return [];
  }
}

function writeQueue(events: QueuedAnalyticsEvent[]): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(events.slice(-MAX_QUEUE_SIZE)),
    );
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
    pageUrl: window.location.href,
    referrer: document.referrer || undefined,
    ttclid: params.get("ttclid") || undefined,
    ttp: cookie("_ttp"),
  };
}

function add(event: QueuedAnalyticsEvent): void {
  const queue = readQueue();
  if (queue.some((stored) => stored.eventId === event.eventId)) return;
  queue.push(event);
  writeQueue(queue);
  if (queue.length >= 25) void flushQueue();
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

async function flushQueue(): Promise<void> {
  if (flushing) return;
  const snapshot = readQueue();
  if (!snapshot.length) return;
  flushing = true;
  writeQueue([]);
  try {
    const response = await fetch("/api/public/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ events: snapshot.slice(0, 50) }),
    });
    // Report the outcome to `?ttdebug=1` (when enabled) so a live page can
    // answer "did the server accept it?" without querying the database. The
    // listener is installed only once debug is on.
    const report = (detail: {
      ok: boolean;
      statusCode?: number;
      accepted?: number;
      deduplicated?: number;
      total: number;
      retryable?: boolean;
    }) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(new CustomEvent("mt:analytics-flush", { detail }));
    };
    // A 4xx is the server saying this batch will never be accepted — a
    // malformed event, a page that no longer exists, a payload a newer server
    // rejects. Retrying it forever would block every event queued behind it,
    // so the batch is dropped and the rest of the queue continues. 5xx and
    // network failures fall through to the catch and are retried.
    if (response.status >= 400 && response.status < 500) {
      if (response.status === 429) throw new Error("Analytics rate limited");
      writeQueue([
        ...snapshot.slice(50),
        ...readQueue().filter(
          (event) => !snapshot.some((sent) => sent.eventId === event.eventId),
        ),
      ]);
      report({
        ok: false,
        statusCode: response.status,
        retryable: false,
        total: snapshot.length,
      });
      return;
    }
    if (!response.ok) throw new Error(`Analytics HTTP ${response.status}`);
    let accepted: number | undefined;
    let deduplicated: number | undefined;
    try {
      const payload = (await response.json()) as {
        data?: { accepted?: number; deduplicated?: number };
      };
      accepted = payload.data?.accepted;
      deduplicated = payload.data?.deduplicated;
    } catch {
      // The batch landed; the summary is only for diagnostics, so a body that
      // fails to parse changes nothing about delivery.
    }
    report({
      ok: true,
      statusCode: response.status,
      accepted,
      deduplicated,
      total: snapshot.length,
    });
    const remaining = snapshot.slice(50);
    writeQueue([
      ...remaining,
      ...readQueue().filter(
        (event) =>
          !remaining.some(
            (remainingEvent) => remainingEvent.eventId === event.eventId,
          ),
      ),
    ]);
  } catch {
    const current = readQueue();
    const restored = [...snapshot];
    for (const event of current) {
      if (!restored.some((stored) => stored.eventId === event.eventId)) {
        restored.push(event);
      }
    }
    writeQueue(restored);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mt:analytics-flush", {
          detail: { ok: false, retryable: true, total: snapshot.length },
        }),
      );
    }
    throw new Error("Analytics delivery failed");
  } finally {
    flushing = false;
  }
}

export function flushNow(): Promise<void> {
  return flushQueue();
}

if (typeof window !== "undefined") {
  let timer = window.setInterval(() => void flushQueue(), FLUSH_INTERVAL_MS);

  /**
   * Hands the queue off on the way out, in batches the endpoint accepts.
   *
   * `sendBeacon` is the only send that survives the page going away, so it has
   * to clear more than one batch: a visitor who clicked through several links
   * can be holding more than fifty events, and leaving the rest meant they only
   * left on some later visit — or never, once they aged out.
   */
  const beacon = () => {
    let pending = readQueue();
    const delivered = new Set<string>();
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
      for (const event of events) delivered.add(event.eventId);
      pending = pending.slice(50);
    }
    if (delivered.size) {
      writeQueue(readQueue().filter((event) => !delivered.has(event.eventId)));
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
    timer = window.setInterval(() => void flushQueue(), FLUSH_INTERVAL_MS);
  });
}
