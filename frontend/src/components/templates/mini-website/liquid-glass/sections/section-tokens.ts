import type {
  MiniWebsiteEducation,
  MiniWebsiteExperience,
  MiniWebsiteOwnedPropertyType,
} from "@/features/mini-website/types";

/**
 * Pure section data — the per-item tone palettes and label maps. Each palette
 * stays beside the section that owns it; these move into the per-section
 * files alongside their renderers as the sections are extracted.
 */

/**
 * The ninth palette. Every hue that clears the contrast floor is spoken for by
 * now, so these are separated from the other lists by weight rather than by
 * hue: a deeper, more saturated band that reads as its own family even where a
 * hue repeats. Neighbours inside this list stay far apart, which is what a
 * visitor actually compares.
 */
export const REVIEW_TONES = [
  "#7c1d6f",
  "#1d4e89",
  "#8a5a00",
  "#2f6d3a",
  "#93213a",
] as const;

export const LANGUAGE_TONES = [
  "#0f766e",
  "#be185d",
  "#1d4ed8",
  "#a16207",
  "#7c3aed",
] as const;

export const OFFER_TONES = [
  "#0f6b4a",
  "#9d1660",
  "#0b5a7a",
  "#8f4108",
  "#5b2a9e",
] as const;

export const EVENT_TONES = [
  "#f43f5e",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
] as const;

/**
 * Position `n` is a distinct hue from the same slot of the palettes in
 * `LiquidGlassInformationalSections`, and neighbours inside this list sit far
 * apart so featured episodes never share a colour. No hex in this list is
 * repeated by any other section palette.
 */
export const AUDIO_TONES = [
  "#d946ef",
  "#84cc16",
  "#06b6d4",
  "#ef4444",
  "#6366f1",
] as const;

/**
 * The tenth palette. Every hue that clears the contrast floor is spoken for, so
 * these repeat hues used elsewhere at a different weight. Neighbours inside the
 * list stay far apart, which is what a visitor actually compares.
 */
export const OWNED_PROPERTY_TONES = [
  "#1f4f7a",
  "#7a3d10",
  "#3f2a7a",
  "#1a5c4a",
  "#7a1f3d",
] as const;

// English on the public page for the same reason as the experience and
// education chips: these read as browser furniture and metadata, not prose. The
// Kurdish labels in `owned-property-links` stay with the dashboard editor.
export const OWNED_PROPERTY_TYPE_TEXT: Record<MiniWebsiteOwnedPropertyType, string> = {
  brand: "Brand",
  company: "Company",
  shop: "Shop",
  organization: "Organization",
  facebook: "Facebook Page",
  instagram: "Instagram",
  youtube: "YouTube Channel",
  website: "Website",
  other: "Other",
};

export const OWNED_PROPERTY_VISIT_TEXT: Record<MiniWebsiteOwnedPropertyType, string> = {
  brand: "Visit brand",
  company: "Visit company",
  shop: "Visit shop",
  organization: "Visit organization",
  facebook: "Visit page",
  instagram: "Visit profile",
  youtube: "Visit channel",
  website: "Visit website",
  other: "Visit page",
};

// metadata beside Kurdish body text.
export const EDUCATION_STATUS_TEXT: Record<MiniWebsiteEducation["status"], string> = {
  studying: "Studying",
  graduated: "Graduated",
  paused: "Paused",
  other: "Education",
};

/**
 * Position `n` here differs from position `n` of the five palettes above. With
 * six sections the wheel is tight enough that same-slot tones are held 40
 * degrees apart rather than the 45 used between neighbours inside a section —
 * two sections are scrolled past seconds apart, while neighbours sit together.
 */
export const EDUCATION_TONES = [
  "#7a1a5e",
  "#4d7c0f",
  "#4338ca",
  "#2b6b2b",
  "#637a0f",
] as const;

// metadata rather than prose, and stay legible beside Kurdish body text.
export const EXPERIENCE_STATUS_TEXT: Record<MiniWebsiteExperience["status"], string> = {
  current: "Current",
  completed: "Completed",
};

/**
 * Position `n` here is a different hue from position `n` of the advantage,
 * process, service, and impact palettes — see the note on `SERVICE_CARD_TONES`.
 */
export const EXPERIENCE_TONES = [
  "#6b6b0f",
  "#15803d",
  "#a16207",
  "#7e22ce",
  "#2b6b2b",
] as const;

export const SERVICE_CARD_TONES = [
  "#b91c1c",
  "#c026d3",
  "#15803d",
  "#831843",
  "#4338ca",
] as const;

export const BOOKING_TONES = [
  "#7c3aed",
  "#ea580c",
  "#0d9488",
  "#e11d48",
  "#0891b2",
] as const;

export const TEAM_TONES = [
  "#317014",
  "#4338ca",
  "#871496",
  "#637a0f",
  "#be123c",
] as const;

export const FAQ_TONES = [
  "#db2777",
  "#7c3aed",
  "#2563eb",
  "#16a34a",
  "#ea580c",
] as const;

export const PLAN_TONES = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#be185d",
  "#7c3aed",
] as const;

export const CREDENTIAL_TONES = [
  "#1e2d8c",
  "#146e61",
  "#a51e14",
  "#96128d",
  "#14703f",
] as const;
