"use client";

import type { MiniWebsiteBackgroundStyle } from "@/features/mini-website/types";
import { MiniWebsiteBackgroundPattern } from "@/features/mini-website/mini-website-background-styles";

/**
 * Page-level background pattern using the selected portfolio colour. The
 * pattern is owner-configurable (`background_style`, "none" disables it);
 * no other ornaments are drawn.
 */
export function PortfolioDecorations({
  accent,
  backgroundStyle,
}: {
  accent: string;
  backgroundStyle: MiniWebsiteBackgroundStyle;
}) {
  if (backgroundStyle === "none") {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <MiniWebsiteBackgroundPattern
        accent={accent}
        className="absolute inset-0 h-full w-full"
        style={backgroundStyle}
      />
    </div>
  );
}
