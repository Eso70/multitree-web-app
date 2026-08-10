/**
 * The pixel base code, as a pure string, and the guards around it.
 *
 * This is imported by the server-rendered base code component and by the
 * client dispatcher alike, so it must never be marked `"use client"`: the
 * server half puts the snippet into the initial HTML for TikTok's verifier
 * (see `components/analytics/TikTokPixelBaseCode`), and calling a client
 * function from a server component throws at render time.
 */

/** A pixel id we are willing to put in a script URL or an inline snippet. */
export function isValidPixelId(pixelId: string): boolean {
  return /^[A-Za-z0-9_-]{8,255}$/.test(pixelId);
}

/** How many pixels one page may load at once, matching `TikTokPixel`. */
export const MAX_LOADED_PIXELS = 3;

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