import { generateUrl, parseGpsCoordinates } from "./modal-utils";
import type { SocialLink } from "./types";
import { parseUploadedIconValue } from "./custom-icon-value";

export interface NormalizedSocialLink {
  id: string;
  platform: string;
  url: string;
  displayName?: string;
  defaultMessage?: string;
  metadata: Record<string, unknown>;
}

export function normalizeSelectedSocialLinks(
  socialLinks: SocialLink[],
  selectedIds: string[],
): NormalizedSocialLink[] {
  const selected = new Set(selectedIds);

  return socialLinks
    .filter((link) => selected.has(link.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .flatMap((link) => {
      const value = link.value?.trim() || "";
      const generatedUrl = value
        ? generateUrl(link.platform, value, link.countryCode)
        : link.url?.trim() || "";
      const url = generatedUrl.trim();
      if (!url || url.length > 2048) return [];

      const platform = link.platform.trim();
      const isPhonePlatform = platform === "whatsapp" || platform === "phone" || platform === "viber";
      const gpsCoordinates = platform === "gps" ? parseGpsCoordinates(value) : null;
      const uploadedIcon = parseUploadedIconValue(link.customIcon);

      return [{
        id: link.id,
        platform,
        url,
        displayName: link.displayName?.trim() || undefined,
        defaultMessage: platform === "telegram" || platform === "viber" ? "" : undefined,
        metadata: {
          original_input: value,
          ...(isPhonePlatform && link.countryCode ? { country_code: link.countryCode } : {}),
          ...(gpsCoordinates ? { gps_lat: gpsCoordinates.lat, gps_lng: gpsCoordinates.lng } : {}),
          ...(link.customColor && !uploadedIcon?.hasBackground
            ? { custom_color: link.customColor }
            : {}),
          ...(link.customIcon ? { custom_icon: link.customIcon } : {}),
        },
      }];
    });
}

export function groupSocialLinksByPlatform(links: NormalizedSocialLink[]) {
  const urls: Record<string, string[]> = {};
  const metadata: Record<string, Array<{
    display_name?: string;
    default_message?: string;
    metadata: Record<string, unknown>;
  }>> = {};

  for (const link of links) {
    (urls[link.platform] ||= []).push(link.url);
    (metadata[link.platform] ||= []).push({
      display_name: link.displayName,
      default_message: link.defaultMessage,
      metadata: link.metadata,
    });
  }

  return { urls, metadata };
}
