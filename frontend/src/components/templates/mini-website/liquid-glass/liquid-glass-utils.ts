export const SWISS_ACCENT =
  "var(--business-website-color, var(--theme-primary, #64748b))";

export const SWISS_ACCENT_BACKGROUND =
  "var(--theme-css, var(--business-website-color, var(--theme-primary, #64748b)))";

export function safeUrl(value = "") {
  return /^https?:\/\//i.test(value) ? value : undefined;
}

/** A translucent wash of a section's tone, for chips and card fills. */
export function toneWash(tone: string, percent: number): string {
  return `color-mix(in srgb, ${tone} ${percent}%, transparent)`;
}

/**
 * Smoked glass for anything that sits on top of a business's own photography —
 * rail arrows, comparison controls, image labels.
 *
 * Deliberately one treatment for both themes. These float over an uploaded
 * photo rather than over the page, so the image behind them, not the theme,
 * decides whether they can be seen; a light-mode variant would simply vanish
 * into a bright picture. White keyline and white glyph read against both.
 */
export const GLASS_SURFACE_CLASS =
  "bg-slate-950/45 text-white ring-1 ring-white/35 backdrop-blur-md";

/** The interactive form of {@link GLASS_SURFACE_CLASS}. */
export const GLASS_CONTROL_CLASS = `${GLASS_SURFACE_CLASS} transition duration-300 hover:bg-slate-950/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`;

/** Lifts glass off a pale photo, where a translucent fill has little edge. */
export const GLASS_CONTROL_SHADOW = "0 6px 20px -8px rgba(15,23,42,0.55)";
