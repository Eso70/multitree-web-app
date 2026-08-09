import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { MiniWebsiteSectionKey } from "@/features/mini-website/types";

/**
 * The Section Standard — the contract every LiquidGlass section follows so
 * sections stay reusable, customisable and restylable without editing their
 * renderers. A section renders through `SectionFrame`, reads colour from
 * `SectionTheme` plus its own `palette`, and never hardcodes a hex.
 *
 * The live dispatcher is `./registry`'s render-function table. This contract
 * is documented here as the target shape to adopt wholesale once the sections
 * are restyled around it.
 */

/** Invariant styling context the template resolves for every section. */
export interface SectionTheme {
  /** The business's brand colour (`profile.accentColor`). */
  accent: string;
  /** Current theme mode, so sections can pick matching surfaces. */
  dark: boolean;
  /** Future styling knobs — optional, so existing sections keep working. */
  density?: "comfortable" | "compact";
  radius?: string;
  /** Escape hatch: restyle a section without touching its component. */
  overrides?: Record<string, string>;
}

/** Base props every section accepts; each section adds its own data. */
export type SectionProps<TData = object> = {
  fullPage: boolean;
  interactive: boolean;
  index?: number;
  theme: SectionTheme;
} & TData;

/** Placement in the public portfolio grid. */
export type SectionPlacement = "full" | "half";

/** Registry entry that drives header, tone, placement and renderer. */
export interface SectionSpec {
  key: MiniWebsiteSectionKey;
  label: string;
  icon: LucideIcon;
  /** Per-item tones; the header uses `palette[0]`. */
  palette: readonly string[];
  placement: SectionPlacement;
  Component: ComponentType<SectionProps>;
}
