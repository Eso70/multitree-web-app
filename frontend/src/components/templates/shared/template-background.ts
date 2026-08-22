import type { CSSProperties } from "react";
import { backgroundImageCss } from "@/lib/templates/background-image";
import { deriveTextColor } from "@/lib/utils/theme-colors";
import type { TemplateTheme } from "../types";

/** Keeps text legible over a photo of any brightness. */
const LIGHT_TEXT_SCRIM = "rgba(0, 0, 0, 0.45)";
const DARK_TEXT_SCRIM = "rgba(255, 255, 255, 0.45)";

/**
 * A background image is arbitrary, but text colour is still derived from the
 * stored palette, so the image is veiled in the direction that palette chose.
 * Reuses `deriveTextColor` rather than re-deciding the light/dark threshold.
 */
function backgroundImageScrim(theme: TemplateTheme): string {
  const scrim =
    deriveTextColor(theme.from, theme.via, theme.to) === "#ffffff"
      ? LIGHT_TEXT_SCRIM
      : DARK_TEXT_SCRIM;

  return `linear-gradient(${scrim}, ${scrim})`;
}

/**
 * The surface style for a template viewport.
 *
 * Every template paints its own full-bleed surface, so each one owns its
 * gradient recipe and passes it here. An uploaded background image wins over
 * that recipe; a solid colour wins over it too, which is what each template
 * already did before the image option existed.
 *
 * A custom gradient the owner built in the colour picker also wins, because it
 * carries a direction the template's own recipe cannot express — every recipe
 * is hardcoded `to bottom right`.
 */
export function templateBackgroundStyle(
  theme: TemplateTheme,
  gradient: string,
): CSSProperties {
  if (theme.backgroundImage) {
    return {
      background: `${backgroundImageScrim(theme)}, ${backgroundImageCss(theme.backgroundImage)}`,
    };
  }

  if (theme.isSolid) {
    return { background: theme.from };
  }

  return { background: theme.backgroundCss || gradient };
}
