"use client";

import type { PublicPageTikTokEvent } from "@linktree/types";
import { recordTikTokDebug } from "./tiktok-debug";

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

/** A pixel id we are willing to put in a script URL or an inline snippet. */
export function isValidPixelId(pixelId: string): boolean {
  return /^[A-Za-z0-9_-]{8,255}$/.test(pixelId);
}

/** How many pixels one page may load at once, matching `TikTokPixel`. */
const MAX_LOADED_PIXELS = 3;

/**
 * The pixel base code, as an inline script for the server-rendered HTML.
 *
 * TikTok's Event Builder and site verifier fetch the URL and look for the
 * base code itself; a tag injected only after React hydrates is invisible to
 * a snapshot taken before that, which is exactly the "we can't detect pixel
 * base code" failure with Pixel Helper already working. Rendering this inline
 * puts the `ttq` stub and the `events.js` URL in the raw HTML, so the tag is
 * detected and starts loading at parse time — before hydration.
 *
 * It deliberately does not call `ttq.page()`: the first page view belongs to
 * the client tracker, which reports it once per mount with an `event_id` that
 * the server half shares. A second `page()` here would be a PageView with no
 * deduplicating id, counted twice.
 *
 * Re-running the snippet (soft navigation into a page that re-renders it)
 * must not re-inject `events.js`: the `_i` registry is checked per pixel
 * before creating each script element, so a second pass initialises nothing.
 */
export function tiktokBaseCodeSnippet(pixelIds: string[]): string {
  const ids = [...new Set(pixelIds)]
    .map((pixelId) => pixelId.trim())
    .filter(isValidPixelId)
    .slice(0, MAX_LOADED_PIXELS);
  if (!ids.length) return "";
  const list = ids.map((pixelId) => JSON.stringify(pixelId)).join(",");
  return [
    "!function(w,d,t){var ttq=w[t]=w[t]||[];",
    // The stub's `setAndDefer` methods are the same list the SDK ships.
    'if(!ttq.methods){ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];',
    "ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};",
    "for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);}",
    'ttq._i=ttq._i||{};ttq._t=ttq._t||{};ttq._o=ttq._o||{};',
    `var ids=[${list}];`,
    'for(var k=0;k<ids.length;k++){var e=ids[k];',
    // Idempotency: a pixel already initialised here or by the client loader is
    // left alone, so re-executing the snippet cannot double-inject the SDK.
    'if(ttq._i[e])continue;',
    'var r="https://analytics.tiktok.com/i18n/pixel/events.js";',
    "ttq._i[e]=[];ttq._i[e]._u=r;ttq._t[e]=+new Date;ttq._o[e]={};",
    'var s=document.createElement("script");s.type="text/javascript";s.async=!0;s.src=r+"?sdkid="+e+"&lib="+t;',
    'var a=document.getElementsByTagName("script")[0]||document.head;',
    "a.parentNode.insertBefore(s,a);",
    "}}",
    "}(window,document,'ttq');",
  ].join("");
}

/**
 * Injects one pixel, at most once per page.
 *
 * Loading is deliberately separate from reporting: a soft navigation should
 * replay the page view, but injecting the script again would register the same
 * pixel twice and double every event after it.
 *
 * The `_i` registry is the SDK's own record of initialised pixels, which is
 * also what the server-rendered base code populates before this ever runs —
 * so a pixel the inline snippet already loaded is skipped rather than given a
 * second `events.js` script.
 */
export function loadTikTokPixel(pixelId: string): void {
  if (typeof window === "undefined" || !isValidPixelId(pixelId)) return;

  const ttq = queue();
  if (ttq._i?.[pixelId]) return;

  const markerId = `tiktok-pixel-${pixelId}`;
  if (document.getElementById(markerId)) return;
  const marker = document.createElement("meta");
  marker.id = markerId;
  document.head.appendChild(marker);

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
  // The SDK gives no signal of its own, so the script element is the
  // load-failure observer: `onerror` fires when the network copy cannot be
  // fetched — an ad blocker, a CSP refusal, a dead connection. Tracking fails
  // quietly by design, but a missing pixel must still be diagnosable before
  // a business starts spending on ads it can never attribute.
  script.onload = () => {
    recordTikTokDebug({
      kind: "pixel_loaded",
      eventName: "PageView",
      pixelId,
    });
  };
  script.onerror = () => {
    // Console once per id: a page reloading several times must not repeat
    // the same warning on every load.
    if (!warnedPixelFailures.has(pixelId)) {
      warnedPixelFailures.add(pixelId);
      console.warn(
        `[multitree] TikTok pixel ${pixelId} failed to load — blocked or unavailable`,
      );
    }
    recordTikTokDebug({
      kind: "pixel_failed",
      eventName: "PageView",
      pixelId,
      detail: "events.js could not be fetched",
    });
  };
  document.head.appendChild(script);
}

/** Pixel ids whose load failure has already been warned about. */
const warnedPixelFailures = new Set<string>();

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
