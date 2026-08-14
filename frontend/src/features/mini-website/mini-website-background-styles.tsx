import { useId } from "react";
import type { MiniWebsiteBackgroundStyle } from "./types";

/**
 * Background-style catalogue and the pattern renderer, kept separate from the
 * editor field so the public mini-website renderer and the picker modal can
 * both use them without importing editor UI.
 */
export const BACKGROUND_STYLE_OPTIONS: ReadonlyArray<{
  value: MiniWebsiteBackgroundStyle;
  label: string;
}> = [
  { value: "none", label: "بێ نەخش" },
  { value: "grid", label: "تۆڕ" },
  { value: "grid45", label: "تۆڕی ٤٥ پلە" },
  { value: "dots", label: "خاڵ" },
  { value: "diagonal", label: "هێڵی لار" },
  { value: "cross", label: "خاچ" },
  { value: "circles", label: "بازنە" },
  { value: "waves", label: "شەپۆل" },
  { value: "zigzag", label: "زیکزاک" },
];

export function backgroundStyleLabel(value: MiniWebsiteBackgroundStyle): string {
  return (
    BACKGROUND_STYLE_OPTIONS.find((option) => option.value === value)?.label ??
    BACKGROUND_STYLE_OPTIONS[0].label
  );
}

interface MiniWebsiteBackgroundPatternProps {
  style: MiniWebsiteBackgroundStyle;
  accent: string;
  className?: string;
  /**
   * Multiplies the stroke/fill opacities. The page background is deliberately
   * faint; a small preview tile needs the same pattern drawn solid enough to
   * actually read. Defaults to the page strength.
   */
  opacityScale?: number;
}

export function MiniWebsiteBackgroundPattern({
  style,
  accent,
  className,
  opacityScale = 1,
}: MiniWebsiteBackgroundPatternProps) {
  const patternId = useId().replace(/:/g, "");

  if (style === "none") {
    return null;
  }

  const opacity = (base: number) => Math.min(1, base * opacityScale).toString();

  const patternWidth =
    style === "waves"
      ? 72
      : style === "grid"
        ? 36
        : style === "grid45"
          ? 32
          : style === "dots" || style === "cross"
            ? 24
            : 28;
  const patternHeight =
    style === "waves" || style === "grid"
      ? 36
      : style === "grid45"
        ? 32
        : style === "dots" || style === "cross"
          ? 24
          : style === "zigzag"
            ? 14
            : 28;

  return (
    <svg
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={patternId}
          width={patternWidth}
          height={patternHeight}
          patternUnits="userSpaceOnUse"
          patternTransform={style === "grid45" ? "rotate(45)" : undefined}
        >
          {style === "grid" ? (
            <path
              d="M36 0H0V36"
              fill="none"
              stroke={accent}
              strokeOpacity={opacity(0.2)}
              strokeWidth="0.8"
            />
          ) : null}
          {style === "dots" ? (
            <circle cx="2" cy="2" fill={accent} fillOpacity={opacity(0.28)} r="1.6" />
          ) : null}
          {style === "grid45" ? (
            <path
              d="M32 0H0V32"
              fill="none"
              stroke={accent}
              strokeOpacity={opacity(0.2)}
              strokeWidth="0.8"
            />
          ) : null}
          {style === "diagonal" ? (
            <path
              d="M-7 7 7-7M0 28 28 0M21 35 35 21"
              fill="none"
              stroke={accent}
              strokeOpacity={opacity(0.18)}
              strokeWidth="1"
            />
          ) : null}
          {style === "waves" ? (
            <path
              d="M0 18Q18 0 36 18T72 18"
              fill="none"
              stroke={accent}
              strokeOpacity={opacity(0.22)}
              strokeWidth="1"
            />
          ) : null}
          {style === "cross" ? (
            <path
              d="M12 6V18M6 12H18"
              fill="none"
              stroke={accent}
              strokeLinecap="round"
              strokeOpacity={opacity(0.22)}
              strokeWidth="1"
            />
          ) : null}
          {style === "circles" ? (
            <circle
              cx="14"
              cy="14"
              fill="none"
              r="5"
              stroke={accent}
              strokeOpacity={opacity(0.22)}
              strokeWidth="1"
            />
          ) : null}
          {style === "zigzag" ? (
            <path
              d="M0 14 7 7 14 14 21 7 28 14"
              fill="none"
              stroke={accent}
              strokeLinejoin="round"
              strokeOpacity={opacity(0.2)}
              strokeWidth="1"
            />
          ) : null}
        </pattern>
      </defs>
      <rect fill={`url(#${patternId})`} height="100%" width="100%" />
    </svg>
  );
}
