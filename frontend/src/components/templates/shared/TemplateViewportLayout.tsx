"use client";

import { memo, type CSSProperties, type ReactNode } from "react";

export interface TemplateViewportLayoutProps {
  isPreview: boolean;
  className?: string;
  style?: CSSProperties;
  dir?: "ltr" | "rtl";
  decoration?: ReactNode;
  header: ReactNode;
  main: ReactNode;
  footer: ReactNode;
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
  decoration,
  header,
  main,
  footer,
}: TemplateViewportLayoutProps) {
  return (
    <div
      className={`relative w-full overflow-y-auto ${isPreview ? "min-h-full" : "min-h-screen min-h-[100svh]"} ${className}`.trim()}
      style={style}
      dir={dir}
      data-template-viewport-layout
    >
      {decoration}
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
