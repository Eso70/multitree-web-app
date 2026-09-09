/** Sponsor.krd's primary TikTok-inspired cyan accent. */
export const SPONSOR_KRD_ACCENT_COLOR = "#25F4EE";

/** Shared brand fill for primary controls and decorative accents. */
export const SPONSOR_KRD_ACCENT_GRADIENT =
  "linear-gradient(to right, #25F4EE 0%, #FE2C55 100%)";

/** Persisted website-color representation understood by parseWebsiteColor. */
export const SPONSOR_KRD_ACCENT_VALUE = "gradient:to-r:#25F4EE:#FE2C55";

/** MultiTree's former platform accent, accepted only for upgrade compatibility. */
export const LEGACY_MULTITREE_ACCENT_COLOR = "#b6f20d";

/**
 * Prevent a not-yet-migrated platform profile from repainting Sponsor.krd's
 * own surfaces with the retired MultiTree lime. Custom administrator colours
 * remain configurable and pass through unchanged.
 */
export function normalizeSponsorKrdAccentValue(value: string): string {
  return value.trim().toLowerCase() === LEGACY_MULTITREE_ACCENT_COLOR
    ? SPONSOR_KRD_ACCENT_VALUE
    : value;
}

export function getSponsorKrdAccentInk(hex: string): "#111827" | "#ffffff" {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return "#111827";

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.55 ? "#111827" : "#ffffff";
}
