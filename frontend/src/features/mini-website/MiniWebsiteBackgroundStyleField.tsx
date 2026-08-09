import { useId } from "react";
import { Check } from "lucide-react";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import type { MiniWebsiteBackgroundStyle } from "./types";

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

interface MiniWebsiteBackgroundPatternProps {
  style: MiniWebsiteBackgroundStyle;
  accent: string;
  className?: string;
}

export function MiniWebsiteBackgroundPattern({
  style,
  accent,
  className,
}: MiniWebsiteBackgroundPatternProps) {
  const patternId = useId().replace(/:/g, "");

  if (style === "none") {
    return null;
  }

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
              strokeOpacity="0.2"
              strokeWidth="0.8"
            />
          ) : null}
          {style === "dots" ? (
            <circle cx="2" cy="2" fill={accent} fillOpacity="0.28" r="1.6" />
          ) : null}
          {style === "grid45" ? (
            <path
              d="M32 0H0V32"
              fill="none"
              stroke={accent}
              strokeOpacity="0.2"
              strokeWidth="0.8"
            />
          ) : null}
          {style === "diagonal" ? (
            <path
              d="M-7 7 7-7M0 28 28 0M21 35 35 21"
              fill="none"
              stroke={accent}
              strokeOpacity="0.18"
              strokeWidth="1"
            />
          ) : null}
          {style === "waves" ? (
            <path
              d="M0 18Q18 0 36 18T72 18"
              fill="none"
              stroke={accent}
              strokeOpacity="0.22"
              strokeWidth="1"
            />
          ) : null}
          {style === "cross" ? (
            <path
              d="M12 6V18M6 12H18"
              fill="none"
              stroke={accent}
              strokeLinecap="round"
              strokeOpacity="0.22"
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
              strokeOpacity="0.22"
              strokeWidth="1"
            />
          ) : null}
          {style === "zigzag" ? (
            <path
              d="M0 14 7 7 14 14 21 7 28 14"
              fill="none"
              stroke={accent}
              strokeLinejoin="round"
              strokeOpacity="0.2"
              strokeWidth="1"
            />
          ) : null}
        </pattern>
      </defs>
      <rect fill={`url(#${patternId})`} height="100%" width="100%" />
    </svg>
  );
}

interface MiniWebsiteBackgroundStyleFieldProps {
  value: MiniWebsiteBackgroundStyle;
  accent: string;
  onChange: (value: MiniWebsiteBackgroundStyle) => void;
}

export function MiniWebsiteBackgroundStyleField({
  value,
  accent,
  onChange,
}: MiniWebsiteBackgroundStyleFieldProps) {
  const patternAccent = parseWebsiteColor(accent).primary;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        شێوازی پاشبنەما
      </legend>
      <div
        aria-label="شێوازی پاشبنەما"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        role="radiogroup"
      >
        {BACKGROUND_STYLE_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <button
              aria-checked={selected}
              aria-label={option.label}
              className={`group relative overflow-hidden rounded-2xl border p-2.5 text-start transition duration-200 ${
                selected
                  ? "border-blue-500 bg-blue-50/80 shadow-[0_8px_22px_rgba(37,99,235,0.12)] dark:border-blue-400 dark:bg-blue-500/10"
                  : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.07]"
              }`}
              key={option.value}
              onClick={() => onChange(option.value)}
              role="radio"
              type="button"
            >
              <span className="relative mb-2 block h-14 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950/80">
                <MiniWebsiteBackgroundPattern
                  accent={patternAccent}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  style={option.value}
                />
                {option.value === "none" ? (
                  <span className="absolute inset-0 grid place-items-center text-[11px] font-medium text-slate-400">
                    —
                  </span>
                ) : null}
              </span>
              <span className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {option.label}
                <span
                  className={`grid size-4 shrink-0 place-items-center rounded-full transition ${
                    selected
                      ? "bg-blue-600 text-white dark:bg-blue-500"
                      : "bg-slate-200/80 text-transparent dark:bg-white/10"
                  }`}
                >
                  <Check
                    aria-hidden="true"
                    className="size-2.5"
                    strokeWidth={3}
                  />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
