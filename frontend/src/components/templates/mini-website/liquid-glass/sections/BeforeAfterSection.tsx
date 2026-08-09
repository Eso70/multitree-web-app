import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SnapRail } from "../ui";
import {
  GLASS_CONTROL_CLASS,
  GLASS_CONTROL_SHADOW,
  GLASS_SURFACE_CLASS,
  SWISS_ACCENT,
} from "../liquid-glass-utils";
import type { MiniWebsiteBeforeAfter } from "@/features/mini-website/types";

function BeforeAfterComparison({
  comparison,
  fullPage,
  interactive,
  tone,
}: {
  comparison: MiniWebsiteBeforeAfter;
  fullPage: boolean;
  interactive: boolean;
  tone: string;
}) {
  const [position, setPosition] = useState(50);

  return (
    <article className={fullPage ? "w-full min-w-0" : "w-[18rem]"}>
      {/* Taller on a phone, where a wide crop would leave the subject tiny;
          wider once there is horizontal room to spend. */}
      <div
        className={`group relative overflow-hidden rounded-2xl bg-slate-950 ${
          fullPage
            ? "aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/10]"
            : "aspect-[4/3]"
        }`}
      >
        <Image
          src={comparison.afterImage}
          alt={comparison.afterLabel || "After"}
          fill
          sizes={fullPage ? "100vw" : "18rem"}
          className="object-cover"
          unoptimized
        />
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={comparison.beforeImage}
            alt={comparison.beforeLabel || "Before"}
            fill
            sizes={fullPage ? "100vw" : "18rem"}
            className="object-cover"
            unoptimized
          />
        </div>

        <span
          className={`pointer-events-none absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide sm:text-[10px] ${GLASS_SURFACE_CLASS}`}
          style={{ boxShadow: GLASS_CONTROL_SHADOW }}
        >
          {comparison.beforeLabel || "Before"}
        </span>
        <span
          className={`pointer-events-none absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide sm:text-[10px] ${GLASS_SURFACE_CLASS}`}
          style={{ boxShadow: GLASS_CONTROL_SHADOW }}
        >
          {comparison.afterLabel || "After"}
        </span>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_16px_rgba(0,0,0,0.45)]"
          style={{ left: `${position}%` }}
        >
          <span
            className={`absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition group-focus-within:scale-110 ${GLASS_SURFACE_CLASS}`}
            // The grip keeps a trace of the section's tone in its glow, which
            // the arrows and labels have no reason to carry.
            style={{
              boxShadow: `${GLASS_CONTROL_SHADOW}, 0 10px 30px -14px ${tone}`,
            }}
          >
            <ChevronLeft className="-mr-1 h-4 w-4" strokeWidth={2.5} />
            <ChevronRight className="-ml-1 h-4 w-4" strokeWidth={2.5} />
          </span>
        </span>

        {interactive && (
          <>
            <button
              type="button"
              data-mini-image-src={comparison.beforeImage}
              data-mini-image-alt={`${comparison.title} — ${comparison.beforeLabel || "پێش"}`}
              data-mini-image-group="before-after"
              className={`absolute bottom-3 left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full ${GLASS_CONTROL_CLASS}`}
              style={{ boxShadow: GLASS_CONTROL_SHADOW }}
              aria-label={`کردنەوەی ${comparison.beforeLabel || "پێش"}`}
            >
              <Eye className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              data-mini-image-src={comparison.afterImage}
              data-mini-image-alt={`${comparison.title} — ${comparison.afterLabel || "دوا"}`}
              data-mini-image-group="before-after"
              className={`absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full ${GLASS_CONTROL_CLASS}`}
              style={{ boxShadow: GLASS_CONTROL_SHADOW }}
              aria-label={`کردنەوەی ${comparison.afterLabel || "دوا"}`}
            >
              <Eye className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </>
        )}

        <input
          aria-label={`${comparison.title}: ${comparison.beforeLabel || "پێش"} / ${comparison.afterLabel || "دوا"}`}
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0"
          dir="ltr"
        />
      </div>

      <div className="mt-3 px-0.5" dir="rtl">
        <h3 className="text-sm font-black sm:text-base" dir="auto">
          {comparison.title}
        </h3>
        {comparison.description && (
          <p
            className="mt-1 text-[11px] leading-5 opacity-55 sm:text-xs"
            dir="auto"
          >
            {comparison.description}
          </p>
        )}
      </div>
    </article>
  );
}

export function BeforeAfterSection({
  comparisons,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  comparisons: MiniWebsiteBeforeAfter[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = comparisons.filter(
    (comparison) => comparison.beforeImage && comparison.afterImage,
  );
  if (!shown.length) return null;
  return (
    <SectionFrame tone={tone} {...frame}>
      {frame.fullPage ? (
        // One per row at every width: a before and an after are read against
        // each other, so the pair gets the section's whole width.
        <div className="grid gap-5 sm:gap-6">
          {shown.map((comparison) => (
            <BeforeAfterComparison
              key={comparison.id}
              comparison={comparison}
              fullPage
              interactive={interactive}
              tone={tone}
            />
          ))}
        </div>
      ) : (
        // The narrow preview keeps the rail: fixed-width cards are what make a
        // horizontal swipe legible inside a phone-sized frame.
        <SnapRail
          label="پێش و دوا"
          items={shown}
          renderItem={(comparison) => (
            <BeforeAfterComparison
              comparison={comparison}
              fullPage={false}
              interactive={interactive}
              tone={tone}
            />
          )}
        />
      )}
    </SectionFrame>
  );
}
