"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Quote, UserRound } from "lucide-react";
import type { AdvertisingTestimonial, AdvertisingTestimonialColor } from "../types";

export interface AdvertisingTestimonialTheme {
  ring: string;
  shadow: string;
  text: string;
  soft: string;
  dot: string;
  dotMuted: string;
}

/** Single source of testimonial colors — the public section and the dashboard editor render from this same map. */
export const TESTIMONIAL_THEME: Record<AdvertisingTestimonialColor, AdvertisingTestimonialTheme> = {
  orange: {
    ring: "border-orange-500/25 dark:border-orange-400/20",
    shadow: "shadow-[0_30px_80px_-52px_rgba(249,115,22,.4)]",
    text: "text-orange-700 dark:text-orange-300",
    soft: "bg-orange-500/10 dark:bg-orange-400/10",
    dot: "bg-orange-500 dark:bg-orange-400",
    dotMuted: "bg-orange-500/25 dark:bg-orange-400/25",
  },
  rose: {
    ring: "border-rose-500/25 dark:border-rose-400/20",
    shadow: "shadow-[0_30px_80px_-52px_rgba(244,63,94,.4)]",
    text: "text-rose-700 dark:text-rose-300",
    soft: "bg-rose-500/10 dark:bg-rose-400/10",
    dot: "bg-rose-500 dark:bg-rose-400",
    dotMuted: "bg-rose-500/25 dark:bg-rose-400/25",
  },
  emerald: {
    ring: "border-emerald-500/25 dark:border-emerald-400/20",
    shadow: "shadow-[0_30px_80px_-52px_rgba(16,185,129,.4)]",
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/10 dark:bg-emerald-400/10",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    dotMuted: "bg-emerald-500/25 dark:bg-emerald-400/25",
  },
  violet: {
    ring: "border-violet-500/25 dark:border-violet-400/20",
    shadow: "shadow-[0_30px_80px_-52px_rgba(139,92,246,.4)]",
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/10 dark:bg-violet-400/10",
    dot: "bg-violet-500 dark:bg-violet-400",
    dotMuted: "bg-violet-500/25 dark:bg-violet-400/25",
  },
  sky: {
    ring: "border-sky-500/25 dark:border-sky-400/20",
    shadow: "shadow-[0_30px_80px_-52px_rgba(14,165,233,.4)]",
    text: "text-sky-700 dark:text-sky-300",
    soft: "bg-sky-500/10 dark:bg-sky-400/10",
    dot: "bg-sky-500 dark:bg-sky-400",
    dotMuted: "bg-sky-500/25 dark:bg-sky-400/25",
  },
  amber: {
    ring: "border-amber-500/25 dark:border-amber-400/20",
    shadow: "shadow-[0_30px_80px_-52px_rgba(245,158,11,.4)]",
    text: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-500/10 dark:bg-amber-400/10",
    dot: "bg-amber-500 dark:bg-amber-400",
    dotMuted: "bg-amber-500/25 dark:bg-amber-400/25",
  },
  cyan: {
    ring: "border-cyan-500/25 dark:border-cyan-400/20",
    shadow: "shadow-[0_30px_80px_-52px_rgba(6,182,212,.4)]",
    text: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-500/10 dark:bg-cyan-400/10",
    dot: "bg-cyan-500 dark:bg-cyan-400",
    dotMuted: "bg-cyan-500/25 dark:bg-cyan-400/25",
  },
  fuchsia: {
    ring: "border-fuchsia-500/25 dark:border-fuchsia-400/20",
    shadow: "shadow-[0_30px_80px_-52px_rgba(217,70,239,.4)]",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    soft: "bg-fuchsia-500/10 dark:bg-fuchsia-400/10",
    dot: "bg-fuchsia-500 dark:bg-fuchsia-400",
    dotMuted: "bg-fuchsia-500/25 dark:bg-fuchsia-400/25",
  },
};

/** Colour-coded position dots — shared by the public section and the dashboard editor. */
export function TestimonialStackDots({
  items,
  activeIndex,
  onSelect,
  className,
}: {
  items: readonly AdvertisingTestimonial[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className ?? ""}`}>
      {items.map((item, dotIndex) => {
        const dotTheme = TESTIMONIAL_THEME[item.color];
        const isActive = dotIndex === activeIndex;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(dotIndex)}
            aria-label={item.name || "ڕا"}
            aria-current={isActive}
            className={`!h-2 !min-h-0 !min-w-0 rounded-full transition-all ${
              isActive ? `!w-6 ${dotTheme.dot}` : `!w-2 ${dotTheme.dotMuted}`
            }`}
          />
        );
      })}
    </div>
  );
}

/**
 * The stacked deck — shared so the dashboard editor previews the exact public
 * layout. Auto-advance lives in the public section only: this component never
 * pulls a card away mid-edit.
 */
export function TestimonialStackCard({
  items,
  activeIndex,
  onSelect,
  onPrevious,
  onNext,
  renderActions,
  className,
}: {
  items: readonly AdvertisingTestimonial[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Overlay rendered on the front card only (the dashboard's edit/delete controls). */
  renderActions?: (item: AdvertisingTestimonial) => ReactNode;
  className?: string;
}) {
  const total = items.length;
  const activeTheme = TESTIMONIAL_THEME[items[activeIndex].color];

  return (
    <div dir="auto" className={className ?? ""}>
      <div className="relative mx-auto max-w-lg">
        {items.map((item, itemIndex) => {
          const depth = (itemIndex - activeIndex + total) % total;
          const theme = TESTIMONIAL_THEME[item.color];
          const isFront = depth === 0;

          return (
            <motion.div
              key={item.id}
              aria-hidden={!isFront}
              className={`${isFront ? "relative" : "pointer-events-none absolute inset-0"} overflow-hidden rounded-[1.75rem] border-2 bg-white p-7 dark:bg-[#111417] sm:p-8 ${theme.ring} ${isFront ? theme.shadow : ""}`}
              style={{ zIndex: total - depth }}
              animate={{
                y: depth * -10,
                scale: 1 - depth * 0.05,
                opacity: depth < 3 ? 1 - depth * 0.32 : 0,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <Quote
                aria-hidden="true"
                className="absolute -top-4 -end-3 h-24 w-24 text-black/[0.05] dark:text-white/[0.06]"
              />

              <div className="relative flex items-center gap-3.5">
                {item.avatarUrl ? (
                  <Image
                    src={item.avatarUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-black ${theme.soft} ${theme.text}`}
                  >
                    {(item.name || "").trim().charAt(0) || <UserRound className="h-7 w-7" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-slate-900 dark:text-white" dir="auto">
                    {item.name || "بێ ناو"}
                  </p>
                  <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400" dir="auto">
                    {item.role}
                  </p>
                </div>
                {isFront && renderActions?.(item)}
              </div>

              <p
                className="relative mt-5 line-clamp-4 text-sm leading-7 text-slate-600 dark:text-slate-300"
                dir="auto"
              >
                {item.quote}
              </p>
            </motion.div>
          );
        })}
      </div>

      {total > 1 && (
        <div className="relative mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="ڕای پێشوو"
            className={`flex !h-9 !w-9 !min-h-0 !min-w-0 shrink-0 items-center justify-center rounded-full transition hover:opacity-75 active:scale-90 ${activeTheme.soft} ${activeTheme.text}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <TestimonialStackDots
            items={items}
            activeIndex={activeIndex}
            onSelect={onSelect}
          />

          <button
            type="button"
            onClick={onNext}
            aria-label="ڕای داهاتوو"
            className={`flex !h-9 !w-9 !min-h-0 !min-w-0 shrink-0 items-center justify-center rounded-full transition hover:opacity-75 active:scale-90 ${activeTheme.soft} ${activeTheme.text}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
