/**
 * Resolving shortened map links.
 *
 * Google's Share button hands out `maps.app.goo.gl/...`, which carries no
 * coordinates — the destination only exists as a redirect on Google's servers,
 * and the browser cannot follow it cross-origin. So the server follows it and
 * reads the coordinates out of the expanded URL.
 *
 * This fetches a user-supplied URL, so it is deliberately narrow: only known
 * map hosts over HTTPS, redirects followed by hand with every hop re-checked
 * against the same allowlist, a hop cap, a short timeout, and the response body
 * is never read. That keeps it from being turned into an SSRF probe against
 * internal services.
 */

/** Hosts a shortened map link may start on. */
const SHORT_LINK_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'www.goo.gl',
  'g.co',
  'www.g.co',
]);

/** Hosts a redirect is allowed to land on. */
const DESTINATION_HOST_SUFFIXES = [
  '.google.com',
  'google.com',
  '.google.co.uk',
  '.goo.gl',
  'goo.gl',
  '.openstreetmap.org',
  'openstreetmap.org',
];

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 5_000;

export interface MapCoordinates {
  lat: number;
  lng: number;
  zoom?: number;
}

function isRealCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function build(lat: number, lng: number, zoom?: number): MapCoordinates | null {
  if (!isRealCoordinate(lat, lng)) return null;
  return {
    lat,
    lng,
    ...(zoom !== undefined && Number.isFinite(zoom)
      ? { zoom: Math.min(20, Math.max(1, zoom)) }
      : {}),
  };
}

/** Reads coordinates out of an expanded map URL. */
export function extractCoordinatesFromMapUrl(
  value: string,
): MapCoordinates | null {
  const input = (value || '').trim();
  if (!input) return null;

  // The resolved place beats the `@` viewport, which is only the camera centre.
  const placeData = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (placeData) {
    const zoom = input.match(
      /@-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,(\d+(?:\.\d+)?)z/,
    );
    const parsed = build(
      Number(placeData[1]),
      Number(placeData[2]),
      zoom ? Number(zoom[1]) : undefined,
    );
    if (parsed) return parsed;
  }

  const viewport = input.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)z)?/,
  );
  if (viewport) {
    const parsed = build(
      Number(viewport[1]),
      Number(viewport[2]),
      viewport[3] ? Number(viewport[3]) : undefined,
    );
    if (parsed) return parsed;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const mlat = url.searchParams.get('mlat');
  const mlon = url.searchParams.get('mlon');
  if (mlat && mlon) {
    const parsed = build(Number(mlat), Number(mlon));
    if (parsed) return parsed;
  }

  for (const key of ['q', 'll', 'center', 'sll', 'daddr', 'destination']) {
    const raw = url.searchParams.get(key);
    if (!raw) continue;
    const match = raw
      .replace(/^loc:/i, '')
      .match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!match) continue;
    const parsed = build(Number(match[1]), Number(match[2]));
    if (parsed) return parsed;
  }

  // `/maps/search/36.172587,+44.040189` — what a shortened Share link actually
  // expands to. The pair sits in the path, with `+` standing in for the space.
  const path = decodeURIComponent(url.pathname).replace(/\+/g, ' ');
  const inPath = path.match(/(-?\d{1,3}\.\d+)[\s,]+(-?\d{1,3}\.\d+)/);
  if (inPath) {
    const parsed = build(Number(inPath[1]), Number(inPath[2]));
    if (parsed) return parsed;
  }

  return null;
}

function isAllowedDestination(url: URL): boolean {
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return DESTINATION_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(suffix),
  );
}

export function isShortMapLink(value: string): boolean {
  try {
    const url = new URL((value || '').trim());
    return (
      url.protocol === 'https:' &&
      SHORT_LINK_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

/**
 * Follows a shortened map link and returns the coordinates it expands to, or
 * null when it cannot be resolved.
 *
 * Redirects are followed manually so each hop can be re-validated; `fetch`'s
 * automatic following would happily chase a hop to somewhere we do not allow.
 */
export async function resolveShortMapLink(
  value: string,
): Promise<MapCoordinates | null> {
  if (!isShortMapLink(value)) return null;

  let current = value.trim();
  for (let hop = 0; hop < MAX_REDIRECTS; hop += 1) {
    let target: URL;
    try {
      target = new URL(current);
    } catch {
      return null;
    }
    if (!isAllowedDestination(target) && !isShortMapLink(current)) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(target.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          // Google serves the redirect only to something that looks like a browser.
          'User-Agent':
            'Mozilla/5.0 (compatible; MultiTree/1.0; +https://multitree.app)',
          Accept: 'text/html',
        },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }

    const location = response.headers.get('location');
    if (!location) {
      // Landed on the final page — read whatever the URL itself carries.
      return extractCoordinatesFromMapUrl(target.toString());
    }

    const next = new URL(location, target);
    const direct = extractCoordinatesFromMapUrl(next.toString());
    if (direct) return direct;
    current = next.toString();
  }

  return null;
}
