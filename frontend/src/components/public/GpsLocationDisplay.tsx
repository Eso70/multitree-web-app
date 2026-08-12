"use client";

import { memo } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import type { LinktreePresentationLink as Link } from "@linktree/types";

export const GPS_PLATFORM_ID = "gps";

function parseGpsCoordinates(raw: string): { lat: string; lng: string } | null {
  if (!raw || typeof raw !== "string") return null;

  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return null;

  const queryMatch = decoded.match(/[?&]q=([^&]+)/i);
  const geoMatch = decoded.match(/^geo:([^?]+)/i);
  const source = (queryMatch && queryMatch[1]) || (geoMatch && geoMatch[1]) || decoded;

  const coordsMatch = source.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (!coordsMatch) return null;

  return {
    lat: coordsMatch[1],
    lng: coordsMatch[2],
  };
}

function isGoogleMapsUrl(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    return (
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      (host.endsWith("google.com") && url.pathname.startsWith("/maps")) ||
      host === "maps.google.com"
    );
  } catch {
    return false;
  }
}

function formatMapsLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Google Maps";
  const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(normalized);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "Google Maps";
  }
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function getMapsLink(raw: string, coords?: { lat: string; lng: string } | null): string | null {
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  }
  if (isGoogleMapsUrl(raw)) {
    return normalizeUrl(raw);
  }
  return null;
}

export function splitGpsLinks(links: Link[]): { gpsLink?: Link; regularLinks: Link[] } {
  const gpsLink = links.find((link) => link.platform === GPS_PLATFORM_ID);
  const regularLinks = links.filter((link) => link.platform !== GPS_PLATFORM_ID);
  return { gpsLink, regularLinks };
}

function getGpsLabel(link: Link): { label: string; coords: string } | null {
  const metadata = link.metadata as Record<string, unknown> | null;
  const rawInput = typeof metadata?.original_input === "string" ? metadata?.original_input : undefined;
  const raw = rawInput || link.url || "";
  const coords = parseGpsCoordinates(raw);
  if (coords) {
    return {
      label: link.display_name || "شوێنی GPS",
      coords: `${coords.lat}, ${coords.lng}`,
    };
  }

  if (isGoogleMapsUrl(raw)) {
    return {
      label: link.display_name || "شوێنی GPS",
      coords: formatMapsLabel(raw),
    };
  }

  return null;
}

export const GpsLocationDisplay = memo(function GpsLocationDisplay({
  gpsLink,
  textColor,
  textSecondaryColor,
  className,
  onOpen,
}: {
  gpsLink?: Link;
  textColor?: string;
  textSecondaryColor?: string;
  className?: string;
  /**
   * Reports and opens the maps link, using the same path as every other link
   * on the page.
   *
   * `splitGpsLinks` pulls the GPS link out of the rendered button list, but the
   * database still registers a `public_page_actions` row for it like any other
   * link. Without this the row reported a permanent zero: a visitor asking for
   * directions — one of the strongest intent signals a local business gets —
   * was the one click the page never counted. Templates pass their own
   * `onLinkClick` here so reporting, message handling, and popup-blocker
   * fallback all stay in one place.
   */
  onOpen?: (
    linkId: string,
    url: string,
    platform: string,
    defaultMessage?: string | null,
  ) => void;
}) {
  if (!gpsLink) return null;

  const label = getGpsLabel(gpsLink);
  if (!label) return null;

  const raw = (gpsLink.metadata as Record<string, unknown> | null)?.original_input as string | undefined;
  const rawValue = raw || gpsLink.url || "";
  const coords = parseGpsCoordinates(rawValue);
  const mapsLink = getMapsLink(rawValue, coords);
  const embedUrl = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}&output=embed`
    : null;

  const primaryColor = textColor || "#111827";
  const secondaryColor = textSecondaryColor || "#6b7280";

  return (
    <div
      className={`mt-6 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm ${className || ""}`}
      style={{ color: primaryColor }}
      aria-label="شوێنی GPS"
    >
      <div className="flex items-center gap-2">
        <FaMapMarkerAlt className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-semibold">{label.label}</span>
      </div>
      <div className="mt-1 text-xs" style={{ color: secondaryColor }}>
        {label.coords}
      </div>
      {embedUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/20 bg-white/10">
          <iframe
            title="پێشبینینی Google Maps"
            src={embedUrl}
            className="h-48 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
      {mapsLink && (
        <a
          href={mapsLink}
          target="_blank"
          rel="noreferrer"
          onClick={
            onOpen
              ? (event) => {
                  // The handler both reports and opens, so the anchor's own
                  // navigation would produce a second tab. `href` stays for
                  // middle-click, "open in new tab", and the no-handler case.
                  event.preventDefault();
                  onOpen(gpsLink.id, mapsLink, GPS_PLATFORM_ID, null);
                }
              : undefined
          }
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-xs font-semibold transition hover:bg-white/10"
          style={{ color: primaryColor }}
        >
          لە Google Maps بیکەرەوە
        </a>
      )}
    </div>
  );
});
