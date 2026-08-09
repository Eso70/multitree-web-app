import type { CSSProperties } from "react";

/**
 * Full-color brand marks.
 *
 * Most brands ship a single-color glyph that we paint white on the brand
 * background. A few carry their colors inside the mark itself and must not be
 * recolored — those live here and are flagged `selfColored` in the registry.
 */

/**
 * YouTube's play button: the red rounded badge with the white triangle.
 *
 * Drawn as two paths rather than one knocked-out silhouette so the triangle
 * stays white instead of showing whatever sits behind the icon. On a red
 * surface the badge blends in and only the triangle reads, which is exactly how
 * the logo is meant to look there.
 */
export function YouTubeMark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814Z"
      />
      <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

/** The TikTok note, shared by the three offset copies that make up the mark. */
const TIKTOK_NOTE =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

/**
 * TikTok's note, drawn as the three offset copies the logo is actually made of:
 * a cyan one shifted left, a magenta one shifted right, and the white note on
 * top. A single white glyph loses the split-channel look entirely.
 *
 * The group is scaled slightly so the offset copies stay inside the viewBox
 * instead of being clipped at the edges.
 */
export function TikTokMark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <g transform="translate(12 12) scale(0.92) translate(-12 -12)">
        <path d={TIKTOK_NOTE} fill="#25F4EE" transform="translate(-0.9 -0.6)" />
        <path d={TIKTOK_NOTE} fill="#FE2C55" transform="translate(0.9 0.6)" />
        <path d={TIKTOK_NOTE} fill="#FFFFFF" />
      </g>
    </svg>
  );
}
