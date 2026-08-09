"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Info, Minus, Plus } from "lucide-react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import maplibregl from "./maplibre";
import type { MiniWebsiteLocation } from "@linktree/types";

/**
 * Basemaps, no API key required.
 *
 * `liberty` is the full-colour style: land use, water and roads are tinted and
 * it carries POI icons, so nearby landmarks appear the way people expect from a
 * map. `dark` is its night counterpart — it ships fewer layers and no POIs,
 * which is a limitation of the style rather than a choice here.
 */
const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

/** Fallback view when a business has not placed its pin yet. */
const FALLBACK = { lng: 44.0091, lat: 36.1901, zoom: 11 };

const AREA_SOURCE = "location-area";
const AREA_LAYER = "location-area-fill";
const PIN_SOURCE = "location-pin";
const PIN_LAYER = "location-pin-dot";
const BUILDING_LAYER = "location-buildings";

/** Tilt and rotation that read as three-dimensional without distorting distance. */
const PITCH = 50;
const BEARING = -17.6;

/**
 * Buildings carry `render_height` in the OpenMapTiles schema, but only from
 * zoom 13 — below that the tiles have no building geometry to extrude.
 */
const BUILDING_MIN_ZOOM = 13;

/** Metres per pixel at a given latitude and zoom, for sizing the radius circle. */
function metresPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

const SKY = {
  light: { sky: "#cfe4f7", horizon: "#eaf2fb", building: "#e3ddd2" },
  dark: { sky: "#0b1016", horizon: "#18202b", building: "#2b313d" },
} as const;

/**
 * Zoom at which each band of places starts drawing.
 *
 * The stock style holds landmarks back until zoom 15–17, which leaves a
 * neighbourhood view almost empty. Places are ranked by importance, so each
 * band is brought forward — major landmarks early, everyday shops later — which
 * is what gives a familiar map its density without turning into label soup.
 */
const POI_MIN_ZOOM: Record<string, number> = {
  poi_r1: 13,
  poi_r7: 14.5,
  poi_r20: 16,
};

/**
 * Enriches the stock basemap: more places, and a sky for the tilted view to sit
 * against instead of ending at a hard edge.
 *
 * Every layer is checked before being touched — styles differ between themes
 * and change upstream over time, and a renamed layer must not take the map down.
 */
function refineStyle(map: MapLibreMap, isDark: boolean) {
  // The dark style ships no places of its own; they are added back instead.
  if (isDark) addDarkPoi(map);

  for (const [id, minzoom] of Object.entries(POI_MIN_ZOOM)) {
    if (!map.getLayer(id)) continue;
    try {
      map.setLayerZoomRange(id, minzoom, 24);
    } catch {
      // The style may not expose this layer; density is a nicety, not a must.
    }
  }

  // Transit markers carry no zoom floor of their own but read as clutter at
  // country level, so they are held back to roughly city scale.
  if (map.getLayer("poi_transit")) {
    try {
      map.setLayerZoomRange("poi_transit", 12, 24);
    } catch {
      // As above.
    }
  }

  try {
    const palette = isDark ? SKY.dark : SKY.light;
    map.setSky({
      "sky-color": palette.sky,
      "horizon-color": palette.horizon,
      "fog-color": palette.horizon,
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.6,
      "fog-ground-blend": 0.1,
    });
  } catch {
    // Sky is a progressive enhancement; the map is fine without it.
  }
}

const DARK_POI_LAYER = "location-poi-dark";

/**
 * Puts places back on the dark basemap.
 *
 * The dark style never references the `poi` source-layer, so shops, cafés and
 * landmarks simply do not exist on it — everything that makes the light map
 * feel populated disappears at night. The data is in the same vector source and
 * the icons are in the same sprite, so the layer is rebuilt here with the
 * ranking and icon logic the light style uses, recoloured for a dark surface.
 */
function addDarkPoi(map: MapLibreMap) {
  if (map.getLayer(DARK_POI_LAYER)) return;
  if (!map.getSource("openmaptiles")) return;

  map.addLayer({
    id: DARK_POI_LAYER,
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom: 14,
    filter: [
      "all",
      ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
      // Rank rises as importance falls, so this keeps the notable places and
      // drops the long tail that would otherwise crowd a small map.
      ["<", ["get", "rank"], 25],
    ],
    layout: {
      "icon-image": [
        "match",
        ["get", "subclass"],
        ["florist", "furniture"],
        ["get", "subclass"],
        ["get", "class"],
      ],
      "icon-size": 0.9,
      "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-anchor": "top",
      "text-offset": [0, 0.7],
      "text-max-width": 9,
      "text-optional": true,
    },
    paint: {
      "text-color": "#c3ccd8",
      "text-halo-color": "#0b1016",
      "text-halo-width": 1.2,
      "text-halo-blur": 0.4,
      // The sprite is drawn for light backgrounds. Where its icons are SDF they
      // recolour to match the labels; where they are not, `icon-color` is
      // ignored and the opacity keeps them from glaring.
      "icon-color": "#c3ccd8",
      "icon-opacity": 0.9,
    },
  });
}

/**
 * Extrudes the basemap's buildings so the view reads as three-dimensional.
 *
 * Inserted beneath the first symbol layer, so street and place labels keep
 * drawing on top of the rooftops instead of disappearing behind them.
 */
function addBuildings(map: MapLibreMap, isDark: boolean, enabled: boolean) {
  if (!enabled || map.getLayer(BUILDING_LAYER)) return;
  // The style has to expose the OpenMapTiles source for there to be buildings.
  if (!map.getSource("openmaptiles")) return;

  const firstSymbolId = map
    .getStyle()
    .layers?.find((layer) => layer.type === "symbol")?.id;

  map.addLayer(
    {
      id: BUILDING_LAYER,
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: BUILDING_MIN_ZOOM,
      // Some footprints are tagged as unsuitable for extrusion (bridges,
      // building parts that would z-fight with their parent).
      filter: ["!=", ["get", "hide_3d"], true],
      paint: {
        "fill-extrusion-color": isDark ? SKY.dark.building : SKY.light.building,
        // Grown in over a zoom, so buildings rise rather than pop into view.
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          BUILDING_MIN_ZOOM,
          0,
          BUILDING_MIN_ZOOM + 2,
          ["coalesce", ["get", "render_height"], 0],
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          BUILDING_MIN_ZOOM,
          0,
          BUILDING_MIN_ZOOM + 2,
          ["coalesce", ["get", "render_min_height"], 0],
        ],
        "fill-extrusion-opacity": 0.9,
      },
    },
    firstSymbolId,
  );
}

/**
 * Follows the app's dark mode when the caller does not state it explicitly.
 * The theme is toggled by adding `dark` to the root element, so that is what is
 * observed.
 */
function useRootDarkMode(explicit?: boolean): boolean {
  const [dark, setDark] = useState(explicit ?? false);

  useEffect(() => {
    if (explicit !== undefined || typeof document === "undefined") return;
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [explicit]);

  return explicit ?? dark;
}

/**
 * The control surface, matching the frosted panels used elsewhere in the
 * product rather than MapLibre's default map-widget chrome.
 */
const SURFACE =
  "rounded-xl border border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-white/10 dark:bg-[#161B22]/85";

function MapButton({
  label,
  onClick,
  active = false,
  accent,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className="flex h-9 w-9 items-center justify-center text-slate-600 transition duration-200 hover:bg-slate-900/5 active:scale-95 dark:text-slate-300 dark:hover:bg-white/10"
      style={active && accent ? { color: accent } : undefined}
    >
      {children}
    </button>
  );
}

export interface LocationMapProps {
  location: MiniWebsiteLocation;
  accent: string;
  /** Lets the viewer pan and zoom. Off for decorative previews. */
  interactive?: boolean;
  /** Drops a draggable pin and reports where it lands. */
  editable?: boolean;
  /** Overrides the app's dark mode, for surfaces that theme themselves. */
  dark?: boolean;
  /** Tilts the camera and extrudes buildings. */
  three?: boolean;
  /**
   * Opens the location in an external maps app. When set, the whole map becomes
   * a target for it, and a button is shown so it is discoverable rather than a
   * hidden gesture.
   */
  onOpenExternal?: () => void;
  onChange?: (next: { lat: number; lng: number; zoom: number }) => void;
  className?: string;
}

/**
 * Renders a mini website's location on a full-colour vector map.
 *
 * Honors the privacy setting: an `exact` location gets a pin on the point, an
 * `approximate` one gets only a soft radius and never renders the pin, so the
 * precise spot cannot be read off the map.
 */
export function LocationMap({
  location,
  accent,
  interactive = false,
  editable = false,
  dark,
  three = true,
  onOpenExternal,
  onChange,
  className = "h-full w-full",
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // A map that fails to load its style or tiles otherwise renders as a blank
  // box with no explanation, which is impossible to diagnose from a screenshot.
  const [failure, setFailure] = useState<string | null>(null);
  // The marker may only be placed once the map has a real size and transform.
  // Projecting before that yields (0,0) and pins it to the top-left corner —
  // which is what happened on narrow layouts, where the map mounts while the
  // column is still resolving its width.
  const [ready, setReady] = useState(false);
  // `three` seeds the view; the control then owns it.
  const [tilted, setTilted] = useState(three);
  const [creditOpen, setCreditOpen] = useState(false);

  const isDark = useRootDarkMode(dark);
  const styleUrl = isDark ? DARK_STYLE : LIGHT_STYLE;

  // Read live values from refs so the map is built once and never torn down by
  // an unrelated re-render.
  const onChangeRef = useRef(onChange);
  const onOpenExternalRef = useRef(onOpenExternal);
  const locationRef = useRef(location);
  const accentRef = useRef(accent);
  const darkRef = useRef(isDark);
  const tiltedRef = useRef(tilted);
  useEffect(() => {
    onChangeRef.current = onChange;
    onOpenExternalRef.current = onOpenExternal;
    locationRef.current = location;
    accentRef.current = accent;
    darkRef.current = isDark;
    tiltedRef.current = tilted;
  }, [accent, isDark, location, onChange, onOpenExternal, tilted]);

  const approximate = location.precision === "approximate";

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [location.lng ?? FALLBACK.lng, location.lat ?? FALLBACK.lat],
      zoom: location.zoom || FALLBACK.zoom,
      pitch: tilted ? PITCH : 0,
      bearing: tilted ? BEARING : 0,
      interactive: interactive || editable,
      // MapLibre's own chrome is replaced below with controls that match the
      // rest of the product. The credit is still rendered — required by the
      // OpenStreetMap licence — just in our own styling.
      attributionControl: false,
      // On a touch screen a one-finger drag over the map would otherwise pan it
      // instead of scrolling the page, trapping the reader mid-article. This
      // asks for two fingers to pan and Ctrl/⌘ to zoom, while a plain tap still
      // registers — which is what places the pin in the editor.
      cooperativeGestures: interactive || editable,
    });
    mapRef.current = map;

    map.on("load", () => setReady(true));

    /**
     * POI icons are named from the tile data (`class` / `subclass`), and the
     * sprite does not carry an image for every value the planet contains —
     * `ice_rink` and friends. MapLibre warns once per missing name, which fills
     * the console on a busy map.
     *
     * Registering a blank image for the missing name satisfies the lookup and
     * stops it repeating. The label still draws; only its icon is absent, which
     * is the correct outcome for a category with no artwork.
     */
    map.on("styleimagemissing", (event) => {
      const id = (event as unknown as { id: string }).id;
      if (!id || map.hasImage(id)) return;
      map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

    map.on("error", (event) => {
      const message = (event as { error?: { message?: string } })?.error?.message;
      setFailure(message || "نەخشەکە بار نەبوو");
      console.error("Location map failed:", event);
    });

    // Fires on first load and again after every `setStyle`, which discards all
    // sources and layers — so everything added here has to be re-added.
    map.on("style.load", () => {
      refineStyle(map, darkRef.current);
      addBuildings(map, darkRef.current, tiltedRef.current);

      const current = locationRef.current;
      if (map.getSource(AREA_SOURCE)) return;

      // Built even when there is no pin yet, holding an empty collection until
      // one is placed. Creating them only once coordinates existed meant a mini
      // website started without a location never got the layers at all, so the
      // first pin the business dropped had nothing to draw into — it only
      // appeared after something rebuilt the style.
      const hasPoint = current.lat !== null && current.lng !== null;
      const point = hasPoint
        ? {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [current.lng as number, current.lat as number],
            },
            properties: {},
          }
        : { type: "FeatureCollection" as const, features: [] };

      map.addSource(AREA_SOURCE, { type: "geojson", data: point });
      map.addLayer({
        id: AREA_LAYER,
        type: "circle",
        source: AREA_SOURCE,
        paint: {
          "circle-color": accentRef.current,
          "circle-opacity": 0.14,
          "circle-stroke-color": accentRef.current,
          "circle-stroke-opacity": 0.45,
          "circle-stroke-width": 1.5,
          // A metre-based radius, so the circle stays geographically true as
          // the viewer zooms.
          "circle-radius": [
            "interpolate",
            ["exponential", 2],
            ["zoom"],
            0,
            0,
            22,
            current.radiusMeters / metresPerPixel(current.lat ?? 0, 22),
          ],
        },
      });
      map.setLayoutProperty(
        AREA_LAYER,
        "visibility",
        current.precision === "approximate" ? "visible" : "none",
      );

      // The pin is drawn by the renderer rather than as an HTML marker over the
      // canvas. A DOM marker has to be projected to a pixel position, which is
      // wrong if it happens before the map has its real size — that raced on
      // narrow layouts and stuck the pin in the corner. A layer is projected by
      // the same pass that draws the tiles, so it cannot disagree with them.
      map.addSource(PIN_SOURCE, { type: "geojson", data: point });
      map.addLayer({
        id: PIN_LAYER,
        type: "circle",
        source: PIN_SOURCE,
        paint: {
          "circle-color": accentRef.current,
          // Smaller on the narrow viewports where the map itself is small.
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 16, 8],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
      map.setLayoutProperty(
        PIN_LAYER,
        "visibility",
        // An approximate location shows only its radius: rendering the pin
        // would give away the exact point the business chose to hide.
        current.precision === "approximate" && !editable ? "none" : "visible",
      );
    });

    // The map is often created while its container still has no size — inside a
    // modal that is animating open, or a step that is not visible yet — and
    // MapLibre only measures once, so it would stay blank.
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // Built once; later changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the basemap when the theme changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(styleUrl);
  }, [styleUrl]);

  // Tilt in and out if 3D is switched at runtime.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      pitch: tilted ? PITCH : 0,
      bearing: tilted ? BEARING : 0,
      duration: 500,
    });
    if (!tilted) {
      if (map.getLayer(BUILDING_LAYER)) map.removeLayer(BUILDING_LAYER);
    } else if (map.isStyleLoaded()) {
      addBuildings(map, darkRef.current, true);
    }
  }, [tilted]);

  // Move the pin and the radius by feeding the layers new data. No pixel maths
  // and no DOM, so there is nothing that can drift out of step with the tiles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (location.lat === null || location.lng === null) return;

    const point = {
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [location.lng, location.lat],
      },
      properties: {},
    };

    for (const id of [PIN_SOURCE, AREA_SOURCE]) {
      const source = map.getSource(id);
      if (source && "setData" in source) {
        (source as { setData: (data: typeof point) => void }).setData(point);
      }
    }

    if (map.getLayer(PIN_LAYER)) {
      map.setPaintProperty(PIN_LAYER, "circle-color", accent);
      map.setLayoutProperty(
        PIN_LAYER,
        "visibility",
        approximate && !editable ? "none" : "visible",
      );
    }
  }, [accent, approximate, editable, location.lat, location.lng, ready]);

  // In the editor a click places the pin. Everywhere else it opens the location
  // in an external map. MapLibre only emits `click` when the pointer did not
  // drag, so panning never triggers either of them.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (event: MapMouseEvent) => {
      if (editable) {
        onChangeRef.current?.({
          lat: Number(event.lngLat.lat.toFixed(6)),
          lng: Number(event.lngLat.lng.toFixed(6)),
          zoom: Number(map.getZoom().toFixed(2)),
        });
        return;
      }
      onOpenExternalRef.current?.();
    };

    map.on("click", handleClick);
    map.getCanvas().style.cursor =
      !editable && onOpenExternal ? "pointer" : "";
    return () => {
      map.off("click", handleClick);
    };
  }, [editable, onOpenExternal]);

  // Keep the radius in step with the precision toggle and the slider.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(AREA_LAYER)) return;
    map.setLayoutProperty(
      AREA_LAYER,
      "visibility",
      approximate ? "visible" : "none",
    );
    if (location.lat !== null) {
      map.setPaintProperty(AREA_LAYER, "circle-radius", [
        "interpolate",
        ["exponential", 2],
        ["zoom"],
        0,
        0,
        22,
        location.radiusMeters / metresPerPixel(location.lat, 22),
      ]);
    }
  }, [approximate, location.radiusMeters, location.lat, styleUrl]);

  // Recentre when the pin moves from outside the map — a pasted link, a reset.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || location.lat === null || location.lng === null) return;
    map.easeTo({ center: [location.lng, location.lat], duration: 400 });
  }, [location.lat, location.lng]);

  const showControls = interactive || editable;

  return (
    <div className={`relative ${className}`} dir="ltr">
      <div ref={containerRef} className="h-full w-full" />

      {showControls && (
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute bottom-3 right-3 flex flex-col items-end gap-2">
            <div className={`flex flex-col overflow-hidden ${SURFACE}`}>
              <MapButton
          label="نزیککردنەوە"
                onClick={() => mapRef.current?.zoomIn({ duration: 300 })}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </MapButton>
              <span className="h-px bg-slate-200/80 dark:bg-white/10" />
              <MapButton
          label="دوورکردنەوە"
                onClick={() => mapRef.current?.zoomOut({ duration: 300 })}
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </MapButton>
            </div>

            <div className={SURFACE}>
              <MapButton
                label={tilted ? "گۆڕین بۆ 2D" : "گۆڕین بۆ 3D"}
                active={tilted}
                accent={accent}
                onClick={() => setTilted((value) => !value)}
              >
                <span className="text-[11px] font-black leading-none">
                  {tilted ? "3D" : "2D"}
                </span>
              </MapButton>
            </div>

            {onOpenExternal && (
              <div className={SURFACE}>
                <MapButton
                  label="کردنەوە لە گووگڵ ماپ"
                  accent={accent}
                  onClick={onOpenExternal}
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={2.5} />
                </MapButton>
              </div>
            )}
          </div>

          {/* The OpenStreetMap licence requires the credit to stay reachable,
              so it is tucked behind this button rather than removed. */}
          <div className="pointer-events-auto absolute bottom-3 left-3 flex items-end gap-2">
            <div className={SURFACE}>
              <MapButton
          label="سەرچاوەی زانیاریی نەخشە"
                active={creditOpen}
                accent={accent}
                onClick={() => setCreditOpen((value) => !value)}
              >
                <Info className="h-4 w-4" strokeWidth={2.5} />
              </MapButton>
            </div>
            {creditOpen && (
              <p className="max-w-[15rem] rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-[10px] font-semibold leading-4 text-slate-500 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#161B22]/90 dark:text-slate-400">
                ©{" "}
                <a
                  className="underline decoration-dotted underline-offset-2"
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap
                </a>{" "}
                ·{" "}
                <a
                  className="underline decoration-dotted underline-offset-2"
                  href="https://openmaptiles.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenMapTiles
                </a>{" "}
                ·{" "}
                <a
                  className="underline decoration-dotted underline-offset-2"
                  href="https://openfreemap.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenFreeMap
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {failure && (
        <p
          className="pointer-events-none absolute inset-x-3 top-3 rounded-lg bg-slate-900/85 px-3 py-2 text-[10px] font-bold leading-4 text-white"
          dir="auto"
        >
          {failure}
        </p>
      )}
    </div>
  );
}
