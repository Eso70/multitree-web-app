import type { ComponentType, CSSProperties } from "react";
import {
  SiDiscord,
  SiGoogle,
  SiGooglemaps,
  SiInstagram,
  SiSnapchat,
  SiViber,
  SiWhatsapp,
  SiX,
} from "react-icons/si";
import {
  FaEnvelope,
  FaFacebookF,
  FaGlobe,
  FaLink,
  FaLinkedinIn,
  FaPhoneAlt,
  FaTelegramPlane,
} from "react-icons/fa";
import { TikTokMark, YouTubeMark } from "./marks";

/**
 * Single source of truth for platform branding.
 *
 * Every surface that paints a platform — public linktree buttons, all templates,
 * the link editor, the mini website and its editor — resolves colors and glyphs
 * from here, so a brand only ever has to be corrected in one place.
 *
 * Glyphs come from Simple Icons (`react-icons/si`), which ships the official
 * brand marks rather than lookalikes. LinkedIn is the exception: Simple Icons
 * dropped it over trademark policy, so it falls back to Font Awesome's mark.
 * Non-brand entries (phone, email, website, gps, custom) use neutral glyphs and
 * deliberately neutral colors — inventing a brand color for them would be wrong.
 */
export interface PlatformBrand {
  readonly id: string;
  readonly name: string;
  /** Official brand mark. */
  readonly icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  /** CSS `background` value — a solid color for most brands, a gradient where the brand has one. */
  readonly background: string;
  /** Icon fill and label color on top of `background`. */
  readonly foreground: string;
  /**
   * Keyline drawn around the glyph and label. Only Snapchat needs one: its mark
   * is a white ghost on yellow, which is illegible without a black outline.
   */
  readonly outline?: string;
  /**
   * The mark carries its own colors and must never be recolored — TikTok's
   * split cyan/magenta note, for instance.
   */
  readonly selfColored?: boolean;
  /**
   * The mark includes its own backdrop, so it fills the chip edge to edge
   * instead of sitting inset on a brand fill. YouTube's red badge is the case
   * for this; TikTok is self-colored but still wants its black chip behind it.
   */
  readonly fillsChip?: boolean;
  /**
   * Hairline border for brands whose fill is so dark it disappears against a
   * dark page — X and TikTok are both pure black. Gives the button an edge
   * without altering the brand color itself.
   */
  readonly edge?: string;
  /**
   * Three gradient stops for consumers that build their own
   * `linear-gradient(from, via, to)`. Solid brands repeat the same color.
   */
  readonly stops: readonly [string, string, string];
}

const solid = (color: string): readonly [string, string, string] => [color, color, color];

/**
 * Edge for the pure-black brands. Translucent white so it reads as a rim on a
 * dark page and stays invisible on a light one.
 */
const BLACK_BRAND_EDGE = "rgba(255, 255, 255, 0.35)";

export const PLATFORM_BRANDS: Record<string, PlatformBrand> = {
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    icon: SiWhatsapp,
    background: "#25D366",
    foreground: "#FFFFFF",
    stops: solid("#25D366"),
  },
  viber: {
    id: "viber",
    name: "Viber",
    icon: SiViber,
    background: "#7360F2",
    foreground: "#FFFFFF",
    stops: solid("#7360F2"),
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    // The bare paper plane. Simple Icons' version wraps it in a filled circle,
    // which inverts on the blue fill into a white disc with a blue plane cut
    // out of it — the same trap Facebook's mark has.
    icon: FaTelegramPlane,
    // Telegram's app icon is a top-to-bottom gradient, not a flat fill.
    background: "linear-gradient(180deg, #2AABEE 0%, #229ED9 100%)",
    foreground: "#FFFFFF",
    stops: ["#2AABEE", "#2AABEE", "#229ED9"],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    icon: SiInstagram,
    // Instagram's signature warm-to-violet sweep.
    background:
      "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)",
    foreground: "#FFFFFF",
    stops: ["#FA7E1E", "#D62976", "#4F5BD5"],
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    // The bare "f", not Simple Icons' version that encloses it in a filled
    // circle — that one inverts on the blue fill into a white disc with a blue
    // letter cut out of it.
    icon: FaFacebookF,
    // The app icon runs a vertical gradient from a lighter cyan-blue down into
    // #0866FF, Facebook's current brand blue (#1877F2 is the pre-2023 one).
    background: "linear-gradient(180deg, #18ACFE 0%, #0866FF 100%)",
    foreground: "#FFFFFF",
    stops: ["#18ACFE", "#0F86FF", "#0866FF"],
  },
  twitter: {
    id: "twitter",
    name: "X",
    icon: SiX,
    background: "#000000",
    foreground: "#FFFFFF",
    edge: BLACK_BRAND_EDGE,
    stops: solid("#000000"),
  },
  x: {
    id: "x",
    name: "X",
    icon: SiX,
    background: "#000000",
    foreground: "#FFFFFF",
    edge: BLACK_BRAND_EDGE,
    stops: solid("#000000"),
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    // The note is split into offset cyan and magenta copies behind the white
    // one; flattening it to a single white glyph loses the whole look.
    icon: TikTokMark,
    background: "#000000",
    foreground: "#FFFFFF",
    selfColored: true,
    edge: BLACK_BRAND_EDGE,
    stops: solid("#000000"),
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    // The logo is the red badge plus the white triangle together, so it is drawn
    // as a full-color mark rather than a white glyph on a red fill.
    //
    // That means the surface behind it must not be red, or the badge dissolves
    // into it. Public-page buttons (built from `stops`) are therefore white, and
    // the label switches to YouTube's near-black so it stays readable there.
    icon: YouTubeMark,
    background: "transparent",
    foreground: "#0F0F0F",
    selfColored: true,
    fillsChip: true,
    stops: solid("#FFFFFF"),
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: FaLinkedinIn,
    background: "#0A66C2",
    foreground: "#FFFFFF",
    stops: solid("#0A66C2"),
  },
  snapchat: {
    id: "snapchat",
    name: "Snapchat",
    icon: SiSnapchat,
    background: "#FFFC00",
    foreground: "#FFFFFF",
    outline: "#000000",
    stops: solid("#FFFC00"),
  },
  discord: {
    id: "discord",
    name: "Discord",
    icon: SiDiscord,
    background: "#5865F2",
    foreground: "#FFFFFF",
    stops: solid("#5865F2"),
  },
  googleReview: {
    id: "googleReview",
    name: "Google Review",
    icon: SiGoogle,
    background: "#4285F4",
    foreground: "#FFFFFF",
    stops: solid("#4285F4"),
  },
  // Not brands — neutral by design.
  phone: {
    id: "phone",
    name: "Phone",
    icon: FaPhoneAlt,
    background: "#0A84FF",
    foreground: "#FFFFFF",
    stops: solid("#0A84FF"),
  },
  email: {
    id: "email",
    name: "Email",
    icon: FaEnvelope,
    background: "#6B7280",
    foreground: "#FFFFFF",
    stops: solid("#6B7280"),
  },
  website: {
    id: "website",
    name: "Website",
    icon: FaGlobe,
    background: "#0EA5E9",
    foreground: "#FFFFFF",
    stops: solid("#0EA5E9"),
  },
  gps: {
    id: "gps",
    name: "GPS Location",
    icon: SiGooglemaps,
    background: "#4285F4",
    foreground: "#FFFFFF",
    stops: solid("#4285F4"),
  },
  custom: {
    id: "custom",
    name: "Link",
    icon: FaLink,
    background: "#64748B",
    foreground: "#FFFFFF",
    stops: solid("#64748B"),
  },
};

export const CUSTOM_PLATFORM_BRAND = PLATFORM_BRANDS.custom;

/** Resolves a platform id to its brand, falling back to the neutral custom-link brand. */
export function getPlatformBrand(platform: string): PlatformBrand {
  return PLATFORM_BRANDS[platform] ?? CUSTOM_PLATFORM_BRAND;
}

/**
 * Background for a platform. A business-supplied `customColor` always wins —
 * they picked it deliberately, so we never override it with brand paint.
 */
export function platformBackground(platform: string, customColor?: string): string {
  const custom = customColor?.trim();
  return custom || getPlatformBrand(platform).background;
}

/**
 * Icon/label color for a platform. Custom backgrounds fall back to white, since
 * we cannot know what the business chose.
 */
export function platformForeground(platform: string, customColor?: string): string {
  return customColor?.trim() ? "#FFFFFF" : getPlatformBrand(platform).foreground;
}

/**
 * A single representative color for a platform, for places that need a flat
 * value — icon tints, borders, drop shadows — where a gradient `background`
 * cannot be used. Picks the middle stop, which reads as the brand's signature
 * hue (Instagram's magenta rather than its orange or violet ends).
 */
export function platformAccentColor(platform: string, customColor?: string): string {
  return customColor?.trim() || getPlatformBrand(platform).stops[1];
}

/**
 * Whether the platform's mark carries its own colors. A business-supplied color
 * turns this off — at that point they want their own paint, not the logo.
 */
export function isSelfColored(platform: string, customColor?: string): boolean {
  return !customColor?.trim() && Boolean(getPlatformBrand(platform).selfColored);
}

/**
 * Hairline border for a platform, or undefined when its fill already stands on
 * its own. Exists so pure-black brands keep an edge on dark pages.
 */
export function platformBorder(platform: string, customColor?: string): string | undefined {
  return customColor?.trim() ? undefined : getPlatformBrand(platform).edge;
}

/**
 * Whether the mark supplies its own backdrop and should fill the chip edge to
 * edge, rather than sitting inset on a brand fill.
 */
export function markFillsChip(platform: string, customColor?: string): boolean {
  return !customColor?.trim() && Boolean(getPlatformBrand(platform).fillsChip);
}

/** The keyline color for a platform, or undefined when it needs none. */
export function platformOutline(platform: string, customColor?: string): string | undefined {
  return customColor?.trim() ? undefined : getPlatformBrand(platform).outline;
}

/**
 * Classes that paint a glyph in its brand foreground, adding an outline for the
 * brands that need one.
 *
 * `non-scaling-stroke` pins the keyline to ~1 device pixel whatever the icon
 * set's viewBox is — Simple Icons use 24 units and Font Awesome 512, so a fixed
 * stroke-width would swallow the glyph on the former. `paint-order` draws the
 * stroke first so the fill covers its inner half.
 */
export function platformIconClass(platform: string, customColor?: string): string {
  return platformOutline(platform, customColor)
    ? "overflow-visible [stroke-width:2] [vector-effect:non-scaling-stroke] [paint-order:stroke_fill]"
    : "";
}

/**
 * How a glyph should be filled.
 * `brand` paints it in the platform's own foreground — correct when it sits on
 * the brand background. `inherit` leaves the fill to the surrounding context,
 * for templates that deliberately tint glyphs to match their own palette.
 * The keyline is applied either way, since it exists for legibility.
 */
export type PlatformIconTone = "brand" | "inherit";

/** Inline style painting a glyph, including any keyline the brand needs. */
export function platformIconStyle(
  platform: string,
  customColor?: string,
  tone: PlatformIconTone = "brand",
): CSSProperties {
  // A full-color mark paints itself; forcing a fill would flatten it.
  if (isSelfColored(platform, customColor)) return {};

  const outline = platformOutline(platform, customColor);
  return {
    ...(tone === "brand" ? { color: platformForeground(platform, customColor) } : {}),
    ...(outline ? { stroke: outline } : {}),
  };
}

/**
 * Inline style for a label sitting on a platform's background. Outlined brands
 * get a matching text keyline so the white label stays readable — Snapchat's
 * white-on-yellow is the case this exists for.
 */
export function platformTextStyle(platform: string, customColor?: string): CSSProperties {
  const outline = platformOutline(platform, customColor);
  return {
    color: platformForeground(platform, customColor),
    ...(outline
      ? {
          WebkitTextStrokeWidth: "1px",
          WebkitTextStrokeColor: outline,
          paintOrder: "stroke fill",
        }
      : {}),
  };
}
