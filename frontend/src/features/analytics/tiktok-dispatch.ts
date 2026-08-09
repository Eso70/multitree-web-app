"use client";

import type { PublicPageTikTokEvent } from "@linktree/types";

/**
 * The only module in the app that touches `window.ttq`.
 *
 * There used to be two copies of the queue stub — one that loaded the pixel and
 * one that fired events — which meant two definitions of what the global looked
 * like and two chances for a page to report through a half-built queue. The
 * placement test in `components/analytics/pixel-placement.spec.ts` enforces
 * that this stays the single dispatcher.
 *
 * Nothing here throws. Analytics must never be the reason a public page breaks,
 * so every entry point is a no-op when the pixel is absent or the browser
 * refused it.
 */

/** Methods the real `events.js` defines, stubbed so calls queue until it lands. */
const TIKTOK_METHODS = [
  "page",
  "track",
  "identify",
  "instances",
  "debug",
  "on",
  "off",
  "once",
  "ready",
  "alias",
  "group",
  "enableCookie",
  "disableCookie",
  "holdConsent",
  "revokeConsent",
  "grantConsent",
] as const;

const PIXEL_SOURCE = "https://analytics.tiktok.com/i18n/pixel/events.js";

export interface TikTokEventProperties {
  content_id: string;
  content_ids: string[];
  content_type: string;
  content_name: string;
  description: string;
  url?: string;
}

type TikTokQueue = NonNullable<Window["ttq"]> & {
  push: (value: unknown) => number;
  methods?: readonly string[];
  _i?: Record<string, unknown[]>;
  _t?: Record<string, number>;
  _o?: Record<string, Record<string, never>>;
};

interface TikTokInstance {
  track?: (
    event: PublicPageTikTokEvent,
    properties?: Record<string, unknown>,
    options?: { event_id?: string },
  ) => void;
}

declare global {
  interface Window {
    ttq?: {
      track?: (
        event: PublicPageTikTokEvent,
        properties?: Record<string, unknown>,
        options?: { event_id?: string },
      ) => void;
      page?: () => void;
      load?: (pixelId: string) => void;
      /** Added by the real `events.js`; absent while only the stub exists. */
      instance?: (pixelId: string) => TikTokInstance | undefined;
    };
  }
}

/**
 * The queue, created if the network copy has not arrived yet.
 *
 * Calls made against the stub are replayed once the real script loads, so an
 * event fired during the first few hundred milliseconds of a page is queued
 * rather than lost — which is exactly the window a visitor who taps
 * immediately falls into.
 */
function queue(): TikTokQueue {
  const existing = (window.ttq || []) as TikTokQueue;
  if (!window.ttq) window.ttq = existing;
  existing.methods ||= TIKTOK_METHODS;

  for (const method of existing.methods) {
    const target = existing as TikTokQueue & Record<string, unknown>;
    if (typeof target[method] !== "function") {
      target[method] = (...args: unknown[]) => existing.push([method, ...args]);
    }
  }
  return existing;
}

/** A pixel id we are willing to put in a script URL. */
export function isValidPixelId(pixelId: string): boolean {
  return /^[A-Za-z0-9_-]{8,255}$/.test(pixelId);
}

/**
 * Injects one pixel, at most once per page.
 *
 * Loading is deliberately separate from reporting: a soft navigation should
 * replay the page view, but injecting the script again would register the same
 * pixel twice and double every event after it.
 */
export function loadTikTokPixel(pixelId: string): void {
  if (typeof window === "undefined" || !isValidPixelId(pixelId)) return;

  const markerId = `tiktok-pixel-${pixelId}`;
  if (document.getElementById(markerId)) return;
  const marker = document.createElement("meta");
  marker.id = markerId;
  document.head.appendChild(marker);

  const ttq = queue();
  ttq._i ||= {};
  ttq._i[pixelId] = [];
  ttq._t ||= {};
  ttq._t[pixelId] = Date.now();
  ttq._o ||= {};
  ttq._o[pixelId] = {};

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.src = `${PIXEL_SOURCE}?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`;
  document.head.appendChild(script);
}

/** TikTok's own `PageView`, which is separate from our `ViewContent`. */
export function reportTikTokPageView(): void {
  if (typeof window === "undefined") return;
  queue().page?.();
}

/**
 * Fires one event.
 *
 * `eventId` is not optional and is not generated here on purpose. TikTok
 * collapses a browser event and a server event into one conversion only when
 * the id *and* the name match, so the id has to be minted once by the caller
 * and handed to both halves. Generating one here would guarantee they differ.
 */
export function trackTikTokEvent(
  event: PublicPageTikTokEvent,
  properties: TikTokEventProperties,
  eventId: string,
  pixelIds: string[] = [],
): void {
  if (typeof window === "undefined") return;
  const ttq = queue();
  const options = { event_id: eventId };

  // With two or more pixels loaded, address each one explicitly. A bare
  // `ttq.track` leaves it to the SDK which loaded instances receive the event,
  // and a business paying for a second pixel getting events on only one of them
  // is indistinguishable from the pixel being misconfigured.
  //
  // Only when `instance` actually exists — it is added by the real `events.js`,
  // so during the stub window before that lands, and for the single-pixel case,
  // this is the same `ttq.track` call it has always been. The stub replays that
  // call once the script arrives.
  if (pixelIds.length > 1 && typeof ttq.instance === "function") {
    let dispatched = false;
    for (const pixelId of pixelIds) {
      const instance = ttq.instance(pixelId);
      if (!instance?.track) continue;
      instance.track(event, { ...properties }, options);
      dispatched = true;
    }
    // Every instance lookup missed — fall back rather than dropping the event.
    if (dispatched) return;
  }

  ttq.track?.(event, { ...properties }, options);
}
