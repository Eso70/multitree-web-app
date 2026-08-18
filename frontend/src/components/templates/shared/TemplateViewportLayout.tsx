"use client";

import { memo, type CSSProperties, type ReactNode } from "react";
import { BackgroundPattern } from "@/lib/templates/background-pattern";
import type { BackgroundPatternStyle } from "@linktree/types";

export interface TemplateViewportLayoutProps {
  isPreview: boolean;
  className?: string;
  style?: CSSProperties;
  dir?: "ltr" | "rtl";
  header: ReactNode;
  main: ReactNode;
  footer: ReactNode;
  /** Repeating pattern painted over the surface, under the content. */
  backgroundPattern?: BackgroundPatternStyle | null;
  /** Colour the pattern is stroked in. Defaults to the page text colour. */
  backgroundPatternAccent?: string;
}

/**
 * Shared three-region template frame. It fills the real viewport on public
 * pages and the simulated viewport in device previews. Header, actions, and
 * footer remain in normal document flow so their positions adapt naturally
 * to their content. Taller content grows and remains scrollable.
 */
export const TemplateViewportLayout = memo(function TemplateViewportLayout({
  isPreview,
  className = "",
  style,
  dir,
  header,
  main,
  footer,
  backgroundPattern = null,
  backgroundPatternAccent = "#ffffff",
}: TemplateViewportLayoutProps) {
  return (
    <div
      className={`relative w-full overflow-y-auto ${isPreview ? "min-h-full" : "min-h-screen min-h-[100svh]"} ${className}`.trim()}
      style={style}
      dir={dir}
      data-template-viewport-layout
    >
      {backgroundPattern && backgroundPattern !== "none" && (
        // `fixed` rather than `absolute`: the layout scrolls, and a pattern
        // that scrolls with it reads as a moving texture instead of a surface.
        <BackgroundPattern
          accent={backgroundPatternAccent}
          className={`pointer-events-none ${isPreview ? "absolute" : "fixed"} inset-0 h-full w-full`}
          style={backgroundPattern}
        />
      )}
      <div className="relative z-10 w-full">
        <div className="mx-auto w-full max-w-md">{header}</div>
        <main className="w-full py-6">
          <div className="mx-auto w-full max-w-md">{main}</div>
        </main>
        <div className="mx-auto w-full max-w-md">{footer}</div>
      </div>
    </div>
  );
});
