"use client";

import type { MiniWebsiteBackgroundStyle } from "@/features/mini-website/types";
import { MiniWebsiteBackgroundPattern } from "@/features/mini-website/MiniWebsiteBackgroundStyleField";
import { toneWash } from "../liquid-glass-utils";

/**
 * Page-level pattern and ornaments using the selected portfolio colour.
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

      <span
        className="absolute -left-20 top-[10rem] h-44 w-44 rounded-full border sm:-left-24 sm:h-56 sm:w-56"
        style={{
          borderColor: toneWash(accent, 25),
          backgroundColor: toneWash(accent, 2),
        }}
      />
      <span
        className="absolute -right-10 top-[24%] h-28 w-28 rounded-[2.25rem] border sm:-right-14 sm:h-36 sm:w-36"
        style={{
          borderColor: toneWash(accent, 20),
          backgroundColor: toneWash(accent, 3),
        }}
      />
      <span
        className="absolute left-[7%] top-[36%] h-3 w-3 rounded-full sm:h-4 sm:w-4"
        style={{ backgroundColor: toneWash(accent, 58) }}
      />

      <span
        className="absolute -left-14 top-[49%] h-32 w-32 rounded-full border sm:-left-20 sm:h-44 sm:w-44"
        style={{
          borderColor: toneWash(accent, 18),
          boxShadow: `inset 0 0 0 10px ${toneWash(accent, 2)}`,
        }}
      />
      <span
        className="absolute -right-12 top-[68%] h-32 w-32 rounded-[2.5rem] border sm:-right-16 sm:h-44 sm:w-44"
        style={{
          borderColor: toneWash(accent, 20),
          backgroundColor: toneWash(accent, 2),
        }}
      />
      <span
        className="absolute -left-12 top-[88%] h-28 w-28 rounded-[2rem] border sm:-left-16 sm:h-36 sm:w-36"
        style={{
          borderColor: toneWash(accent, 17),
          backgroundColor: toneWash(accent, 2),
        }}
      />

      {[18, 42, 59, 81, 95].map((top, groupIndex) => (
        <div
          key={top}
          className={`absolute grid grid-cols-3 gap-2 opacity-25 ${
            groupIndex % 2 === 0 ? "right-[3%]" : "left-[3%]"
          }`}
          style={{ top: `${top}%` }}
        >
          {Array.from({ length: 9 }, (_, dotIndex) => (
            <span
              key={dotIndex}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
