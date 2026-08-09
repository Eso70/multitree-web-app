/**
 * MapLibre, loaded so its tile-decoding worker actually runs.
 *
 * The default build inlines the worker and lets the bundler handle it. Under
 * Next's bundler that worker gets split into a chunk it then tries to import
 * relative to the *page* URL, which returns the app's HTML and fails with
 * "Failed to load module script: non-JavaScript MIME type". Nothing reports it:
 * the style and tile requests still succeed, so MapLibre raises no error — the
 * tiles simply never decode and only the style's flat background paints.
 *
 * The CSP build takes the worker as a plain URL instead, so it is served as a
 * static file from `public/` and never touched by the bundler. `worker-src
 * 'self'` covers it.
 *
 * The worker file is copied into `public/maplibre/` by the `sync:maplibre`
 * script, which runs before dev and build so it cannot drift from the installed
 * version.
 */
import type * as MapLibre from "maplibre-gl";
// @ts-expect-error - the dist build ships no types of its own; the package's
// public types describe it exactly, and are applied on the next line.
import cspBuild from "maplibre-gl/dist/maplibre-gl-csp";
import "maplibre-gl/dist/maplibre-gl.css";

const maplibregl = cspBuild as typeof MapLibre;

maplibregl.setWorkerUrl("/maplibre/maplibre-gl-csp-worker.js");

/**
 * Arabic and Kurdish labels need contextual shaping and bidi reordering, which
 * MapLibre does not do itself — without this plugin their glyphs render
 * detached and in reverse order.
 *
 * Registered lazily (the third argument) so it is only fetched once a tile
 * actually contains RTL text, and guarded because the plugin may only be set
 * once per page and this module can be imported by more than one map.
 */
if (typeof window !== "undefined" && maplibregl.getRTLTextPluginStatus() === "unavailable") {
  maplibregl.setRTLTextPlugin("/maplibre/mapbox-gl-rtl-text.js", true);
}

export default maplibregl;
export type { MapMouseEvent } from "maplibre-gl";
