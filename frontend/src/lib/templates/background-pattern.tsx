import { useId } from "react";
import {
  BACKGROUND_PATTERN_CONFIG_KEY,
  BACKGROUND_PATTERN_DEFAULT,
  BACKGROUND_PATTERN_STYLES,
  type BackgroundPatternStyle,
} from "@linktree/types";

/**
 * The background-pattern catalogue and its renderer.
 *
 * Kept out of any one feature because both surfaces draw the same patterns:
 * the mini website reads it through `mini-website-background-styles`, and the
 * linktree templates read it through `TemplateViewportLayout`. The picker
 * modal (`components/shared/BackgroundPatternModal`) renders these previews
 * too, so a pattern only has to be described once.
 */

export const BACKGROUND_PATTERN_OPTIONS: ReadonlyArray<{
  value: BackgroundPatternStyle;
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

export function backgroundPatternLabel(value: BackgroundPatternStyle): string {
  return (
    BACKGROUND_PATTERN_OPTIONS.find((option) => option.value === value)?.label ??
    BACKGROUND_PATTERN_OPTIONS[0].label
  );
}

export function isBackgroundPatternStyle(
  value: unknown,
): value is BackgroundPatternStyle {
  return (
    typeof value === "string" &&
    (BACKGROUND_PATTERN_STYLES as readonly string[]).includes(value)
  );
}

/**
 * The pattern stored in a template config, or the default when absent or
 * unrecognised. Mirrors `readBackgroundImage`, which guards the same object.
 */
export function readBackgroundPattern(
  templateConfig: unknown,
): BackgroundPatternStyle {
  if (
    !templateConfig ||
    typeof templateConfig !== "object" ||
    Array.isArray(templateConfig)
  ) {
    return BACKGROUND_PATTERN_DEFAULT;
  }

  const value = (templateConfig as Record<string, unknown>)[
    BACKGROUND_PATTERN_CONFIG_KEY
  ];
  return isBackgroundPatternStyle(value) ? value : BACKGROUND_PATTERN_DEFAULT;
}

interface BackgroundPatternProps {
  style: BackgroundPatternStyle;
  accent: string;
  className?: string;
  /**
   * Multiplies the stroke/fill opacities. A page background is deliberately
   * faint; a small preview tile needs the same pattern drawn solid enough to
   * actually read. Defaults to the page strength.
   */
  opacityScale?: number;
}

export function BackgroundPattern({
  style,
  accent,
  className,
  opacityScale = 1,
}: BackgroundPatternProps) {
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
