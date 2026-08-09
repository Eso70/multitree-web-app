/**
 * Reading coordinates out of a pasted map link.
 *
 * Businesses copy a link from Google Maps rather than hunting for a point on a
 * map, so the pin is derived from the link whenever the link actually carries
 * coordinates.
 */

export interface ParsedCoordinates {
  lat: number;
  lng: number;
  /** Present only when the link encodes a zoom level. */
  zoom?: number;
}

function isRealCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    // 0,0 is in the Atlantic and is almost always a parse artefact rather than
    // somewhere a business actually is.
    !(lat === 0 && lng === 0)
  );
}

function pair(latText: string, lngText: string, zoomText?: string): ParsedCoordinates | null {
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!isRealCoordinate(lat, lng)) return null;
  const zoom = zoomText ? Number(zoomText) : undefined;
  return {
    lat,
    lng,
    ...(zoom !== undefined && Number.isFinite(zoom)
      ? { zoom: Math.min(20, Math.max(1, zoom)) }
      : {}),
  };
}

/** Query keys that hold a bare "lat,lng" value across the common map hosts. */
const COORDINATE_PARAMS = ["q", "ll", "center", "sll", "daddr", "destination", "mlat"];

/**
 * Extracts coordinates from a map URL, or plain "lat, lng" text.
 *
 * Handles the Google Maps shapes in the wild — the `!3d…!4d…` place data, the
 * `@lat,lng,zoom` viewport, and `?q=`/`?ll=` queries — plus OpenStreetMap's
 * `mlat`/`mlon`. Returns null when the link carries no coordinates at all,
 * which is the case for shortened `maps.app.goo.gl` links.
 */
export function coordinatesFromMapUrl(value: string): ParsedCoordinates | null {
  const input = value.trim();
  if (!input) return null;

  // Bare "36.19, 44.00" pasted straight from a coordinates field.
  const bare = input.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (bare) return pair(bare[1], bare[2]);

  // `!3d<lat>!4d<lng>` is the place Google actually resolved, so it beats the
  // `@` viewport centre, which is only where the camera happened to sit.
  const placeData = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (placeData) {
    const zoom = input.match(/@-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,(\d+(?:\.\d+)?)z/);
    const parsed = pair(placeData[1], placeData[2], zoom?.[1]);
    if (parsed) return parsed;
  }

  const viewport = input.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)z)?/,
  );
  if (viewport) {
    const parsed = pair(viewport[1], viewport[2], viewport[3]);
    if (parsed) return parsed;
  }

  let url: URL | null = null;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  // OpenStreetMap splits latitude and longitude across two parameters.
  const mlat = url.searchParams.get("mlat");
  const mlon = url.searchParams.get("mlon");
  if (mlat && mlon) {
    const parsed = pair(mlat, mlon);
    if (parsed) return parsed;
  }

  for (const key of COORDINATE_PARAMS) {
    const raw = url.searchParams.get(key);
    if (!raw) continue;
    // `q=loc:36.19,44.00` and `q=36.19,44.00` both appear.
    const match = raw
      .replace(/^loc:/i, "")
      .match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!match) continue;
    const parsed = pair(match[1], match[2]);
    if (parsed) return parsed;
  }

  // `#map=15/36.19/44.00` — OpenStreetMap's hash form.
  const hash = url.hash.match(/map=(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  if (hash) {
    const parsed = pair(hash[2], hash[3], hash[1]);
    if (parsed) return parsed;
  }

  // `/maps/search/36.172587,+44.040189` — what a shortened Share link expands
  // to. The pair sits in the path, with `+` standing in for the space.
  const path = decodeURIComponent(url.pathname).replace(/\+/g, " ");
  const inPath = path.match(/(-?\d{1,3}\.\d+)[\s,]+(-?\d{1,3}\.\d+)/);
  if (inPath) {
    const parsed = pair(inPath[1], inPath[2]);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Returns the first URL in a string, discarding anything appended after it.
 *
 * Guards against a value that already contains the same link twice — pasting
 * used to apply the clipboard and the input separately, which concatenated the
 * URL with itself, and records saved in that state need cleaning on edit.
 */
export function firstUrl(value: string): string {
  const input = value.trim();
  const second = input.indexOf("http", 1);
  return second === -1 ? input : input.slice(0, second);
}

/**
 * Whether a link is a shortened map URL. These resolve server-side and carry no
 * coordinates, so the pin cannot be derived from them and the business needs to
 * be told rather than left wondering why nothing moved.
 */
export function isShortenedMapUrl(value: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i.test(value.trim());
}
