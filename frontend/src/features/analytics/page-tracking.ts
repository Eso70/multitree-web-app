"use client";

import type { PublicPageAnalytics } from "@linktree/types";
import { flushNow, queueAnalyticsEvent } from "@/lib/utils/client-queue";
import { createRuntimeId } from "@/lib/utils/random-id";
import { trackTikTokEvent } from "./tiktok-dispatch";
import { recordTikTokDebug } from "./tiktok-debug";

/**
 * The one way a public page reports what happened on it.
 *
 * Two pages use this — the public linktree and the public mini website — and no
 * others, because those are the only surfaces allowed to carry a business's
 * TikTok pixel. Anything new on either page reports through here rather than
 * calling the pixel directly; docs/tracking.md is the procedure.
 *
 * The design rests on one rule. Every event gets an id, minted once, and that
 * same id goes to both the pixel in the browser and the queue that the server
 * forwards to the Events API. TikTok merges the pair into a single conversion
 * only when the id *and* the event name match, so the name is not derived here
 * either — it comes from the action's own `public_page_actions.tiktok_event`
 * row, which is also what the server reads. Neither side can invent a name the
 * other did not use.
 *
 * Every method is safe to call more than once. Nothing here throws: analytics
 * must never be the reason a public page breaks.
 */

export type PageEventName =
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
  | "form_view"
  | "lead_created"
  | "booking_started"
  | "checkout_started"
  | "order_completed"
  | "download"
  | "action_open"
  | "share"
  | "custom";

/** How long the same action key is ignored after being reported. */
const REPEAT_WINDOW_MS = 1_500;

/** Where an unregistered outbound link is attributed, when the page has one. */
const FALLBACK_ACTION_KEY = "mini:external";

export interface PageTrackerOptions {
  /** The page's own id; the server resolves it to a public page. */
  pageId: string;
  pageName: string;
  /** Describes the page for TikTok's `content_type`. */
  contentType: string;
  /** Pixel ids and registered actions, both resolved server-side. */
  analytics: PublicPageAnalytics;
  /** Optional headline sent as the event description. */
  description?: string;
}

export interface TrackActionOptions {
  label?: string;
  destination?: string;
  properties?: Record<string, unknown>;
  /** Reports at most once for this key, for the life of the page. */
  once?: boolean;
}

export interface PageTracker {
  /** Reports the visit. Fires `ViewContent`, the page-level standard event. */
  trackView: () => void;
  /**
   * Reports a registered action — a link, a button, a booked slot.
   *
   * The pixel fires only when the key resolves to a registered action, because
   * an unregistered key has no server-side event name to agree with and the
   * pair would be counted twice.
   */
  trackAction: (
    actionKey: string,
    eventName: PageEventName,
    options?: TrackActionOptions,
  ) => void;
  /** Reports a click on an anchor, using its `data-mini-action` hint when present. */
  trackAnchor: (anchor: HTMLAnchorElement) => void;
  /**
   * Reports engagement that is real but is not a conversion — a section
   * reached, a gallery opened, time on the page. Internal only: these never
   * reach TikTok, because inflating a pixel with scroll depth trains the ad
   * algorithm on people who did nothing.
   */
  trackEngagement: (
    eventName: PageEventName,
    options?: TrackActionOptions & { actionKey?: string },
  ) => void;
  /**
   * Fires only the browser half, for a conversion the server already records
   * from its own endpoint.
   *
   * The lead form is the case: the submission itself creates the analytics
   * event server-side, so queueing a second one here would double-count it
   * internally. What is missing without this is the pixel, and with it the
   * cookies and match signals only the browser holds. Passing the id the
   * server will ingest under is what makes the two collapse into one.
   */
  trackServerConversion: (actionKey: string, eventId: string) => void;
}

function absoluteUrl(value: string): string {
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
}

/** The internal event a bare action key implies, when none is given. */
function inferEventName(actionKey: string): PageEventName {
  if (actionKey === "mini:whatsapp" || actionKey.startsWith("mini:social:whats"))
    return "whatsapp_click";
  if (actionKey === "mini:phone") return "call_click";
  if (actionKey === "mini:email") return "email_click";
  if (actionKey === "mini:share" || actionKey === "mini:vcard") return "share";
  if (actionKey.startsWith("mini:social:")) return "social_click";
  if (actionKey.startsWith("mini:service:")) return "service_click";
  if (actionKey.startsWith("mini:plan:") || actionKey.startsWith("mini:offer:"))
    return "checkout_started";
  if (
    actionKey === "mini:booking" ||
    actionKey.startsWith("mini:booking:") ||
    actionKey.startsWith("mini:event:")
  )
    return "booking_started";
  if (actionKey.startsWith("mini:document:")) return "download";
  return "button_click";
}

/** The event an address implies, for pages whose buttons declare no key. */
function inferEventFromHref(href: string): PageEventName {
  const value = absoluteUrl(href);
  if (/^https?:\/\/(?:api\.)?wa\.me\//i.test(value)) return "whatsapp_click";
  if (/^tel:/i.test(value)) return "call_click";
  if (/^mailto:/i.test(value)) return "email_click";
  return "button_click";
}

/** Events worth their own round trip rather than riding the next batch. */
const IMMEDIATE_EVENTS = new Set<PageEventName>([
  "form_submit",
  "lead_created",
]);

export function createPageTracker(options: PageTrackerOptions): PageTracker {
  const recent = new Map<string, number>();
  const reportedOnce = new Set<string>();
  let viewSent = false;

  const hasPixel = () => options.analytics.pixelIds.length > 0;

  /**
   * Suppresses a repeat of the same key inside the dedupe window.
   *
   * Applied to the whole report, not just the pixel half. Gating only the
   * pixel is what a double tap used to do: the browser fired once, but the
   * queue still sent a second event under a fresh id, and TikTok counted the
   * pair as two conversions from one finger.
   */
  const isRepeat = (key: string): boolean => {
    const now = Date.now();
    if (now - (recent.get(key) || 0) < REPEAT_WINDOW_MS) return true;
    recent.set(key, now);
    return false;
  };

  const send = (input: {
    eventName: PageEventName;
    actionKey: string;
    label: string;
    destination?: string;
    properties?: Record<string, unknown>;
    /** Only registered actions carry one; engagement events pass none. */
    action?: PublicPageAnalytics["actions"][string];
    immediate?: boolean;
  }) => {
    // Minted once, shared by both halves. This is the whole deduplication
    // contract in one line.
    const eventId = createRuntimeId();
    const pixelEvent = input.action?.pixelEvent;

    let pixelDispatched = false;
    if (hasPixel() && pixelEvent) {
      trackTikTokEvent(
        pixelEvent,
        {
          content_id: input.action?.id || options.pageId,
          content_ids: [input.action?.id || options.pageId],
          content_type: input.actionKey,
          content_name: input.label || options.pageName,
          description: options.description ?? "",
          url: window.location.href,
        },
        eventId,
        options.analytics.pixelIds,
      );
      pixelDispatched = true;
      recordTikTokDebug({
        kind: "pixel",
        eventName: pixelEvent,
        eventId,
        actionKey: input.actionKey,
        pixelDispatched: true,
      });
    }

    queueAnalyticsEvent({
      pageId: options.pageId,
      actionId: input.action?.id,
      eventName: input.eventName,
      eventId,
      browserDispatched: pixelDispatched,
      // Only when the pixel actually fired: the pair has to describe what the
      // browser sent, not what it would have sent.
      browserEventName: pixelDispatched ? pixelEvent : undefined,
      properties: {
        actionKey: input.actionKey,
        contentName: input.label || options.pageName,
        contentType: input.actionKey,
        destination: input.destination,
        ...input.properties,
      },
    });
    recordTikTokDebug({
      kind: "queue",
      eventName: input.eventName,
      eventId,
      actionKey: input.actionKey,
      pixelDispatched,
    });

    // Everything else is delivered by the queue's own batching: at twenty-five
    // events, every fifteen seconds, and on pagehide. Nothing is lost by
    // waiting, and the page stays responsive while it does.
    if (input.immediate)
      void flushNow().catch((error: unknown) =>
        recordTikTokDebug({
          kind: "error",
          eventName: input.eventName,
          eventId,
          detail: error instanceof Error ? error.message : String(error),
        }),
      );
  };

  const resolveAction = (actionKey: string) =>
    options.analytics.actions[actionKey] ||
    options.analytics.actions[FALLBACK_ACTION_KEY];

  return {
    trackView() {
      if (viewSent) return;
      viewSent = true;
      const eventId = createRuntimeId();
      if (hasPixel()) {
        trackTikTokEvent(
          "ViewContent",
          {
            content_id: options.pageId,
            content_ids: [options.pageId],
            content_type: options.contentType,
            content_name: options.pageName,
            description: options.description ?? "",
            url: window.location.href,
          },
          eventId,
          options.analytics.pixelIds,
        );
      }
      queueAnalyticsEvent({
        pageId: options.pageId,
        eventName: "page_view",
        eventId,
        browserDispatched: hasPixel(),
        // The server maps `page_view` to `ViewContent` too, so the names agree
        // either way. Sent explicitly so that stays true by contract rather
        // than by two mappings happening to match.
        browserEventName: hasPixel() ? "ViewContent" : undefined,
        properties: {
          contentId: options.pageId,
          contentName: options.pageName,
          contentType: options.contentType,
          description: options.description,
        },
      });
      void flushNow().catch(() => undefined);
    },

    trackAction(actionKey, eventName, input = {}) {
      const key = actionKey.slice(0, 120);
      if (input.once) {
        if (reportedOnce.has(key)) return;
        reportedOnce.add(key);
      }
      if (isRepeat(`${eventName}:${key}`)) return;

      send({
        eventName,
        actionKey: key,
        label: input.label || options.pageName,
        destination: input.destination,
        properties: input.properties,
        action: resolveAction(key),
        // A click usually navigates away; get it out before the page goes.
        immediate: true,
      });
    },

    trackAnchor(anchor) {
      const href = anchor.getAttribute("href");
      if (!href) return;
      const declaredKey = anchor.dataset.miniAction?.trim().slice(0, 120);
      const actionKey = declaredKey || FALLBACK_ACTION_KEY;
      if (isRepeat(actionKey)) return;

      // `data-mini-track="internal"` is a deliberate "count this, do not
      // report it" — an affordance that shares another action's key but is not
      // the conversion that key stands for. Saving a QR image is not the same
      // intent as saving a contact card, and reporting it as one would teach
      // the ad algorithm the wrong thing.
      const reportable = anchor.dataset.miniTrack !== "internal";

      send({
        eventName: declaredKey
          ? inferEventName(declaredKey)
          : inferEventFromHref(href),
        actionKey,
        label: anchor.textContent?.trim() || options.pageName,
        destination: absoluteUrl(href),
        action: reportable ? resolveAction(actionKey) : undefined,
        immediate: true,
      });
    },

    trackEngagement(eventName, input = {}) {
      const actionKey = (input.actionKey || `page:${eventName}`).slice(0, 120);
      if (input.once) {
        const onceKey = `${eventName}:${actionKey}`;
        if (reportedOnce.has(onceKey)) return;
        reportedOnce.add(onceKey);
      }
      if (isRepeat(`${eventName}:${actionKey}`)) return;

      send({
        eventName,
        actionKey,
        label: input.label || options.pageName,
        destination: input.destination,
        properties: input.properties,
        // No `action`, so no pixel: engagement is ours to measure, not TikTok's
        // to optimise on.
        immediate: IMMEDIATE_EVENTS.has(eventName),
      });
    },

    trackServerConversion(actionKey, eventId) {
      const action = resolveAction(actionKey);
      if (!hasPixel() || !action) return;
      trackTikTokEvent(
        action.pixelEvent,
        {
          content_id: action.id,
          content_ids: [action.id],
          content_type: actionKey,
          content_name: options.pageName,
          description: options.description ?? "",
          url: window.location.href,
        },
        eventId,
        options.analytics.pixelIds,
      );
      recordTikTokDebug({
        kind: "pixel",
        eventName: action.pixelEvent,
        eventId,
        actionKey,
        pixelDispatched: true,
      });
    },
  };
}
