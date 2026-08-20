"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";
import {
  GLASS_CONTROL_SHADOW,
  GLASS_SURFACE_CLASS,
} from "@/components/templates/mini-website/liquid-glass/liquid-glass-utils";
import type { AdvertisingResultColor, AdvertisingResultItem } from "../types";

interface AdvertisingResultTheme {
  tone: string;
  soft: string;
  text: string;
  dot: string;
  dotMuted: string;
}

/** Single source of before/after colors — the dashboard editor renders its own deck from this same map. */
export const RESULT_THEME: Record<AdvertisingResultColor, AdvertisingResultTheme> = {
  rose: {
    tone: "#ec4899",
    soft: "bg-rose-500/10 dark:bg-rose-400/10",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500 dark:bg-rose-400",
    dotMuted: "bg-rose-500/25 dark:bg-rose-400/25",
  },
  indigo: {
    tone: "#6366f1",
    soft: "bg-indigo-500/10 dark:bg-indigo-400/10",
    text: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500 dark:bg-indigo-400",
    dotMuted: "bg-indigo-500/25 dark:bg-indigo-400/25",
  },
  amber: {
    tone: "#f59e0b",
    soft: "bg-amber-500/10 dark:bg-amber-400/10",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500 dark:bg-amber-400",
    dotMuted: "bg-amber-500/25 dark:bg-amber-400/25",
  },
  emerald: {
    tone: "#10b981",
    soft: "bg-emerald-500/10 dark:bg-emerald-400/10",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    dotMuted: "bg-emerald-500/25 dark:bg-emerald-400/25",
  },
  sky: {
    tone: "#0ea5e9",
    soft: "bg-sky-500/10 dark:bg-sky-400/10",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500 dark:bg-sky-400",
    dotMuted: "bg-sky-500/25 dark:bg-sky-400/25",
  },
  violet: {
    tone: "#8b5cf6",
    soft: "bg-violet-500/10 dark:bg-violet-400/10",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500 dark:bg-violet-400",
    dotMuted: "bg-violet-500/25 dark:bg-violet-400/25",
  },
  orange: {
    tone: "#f97316",
    soft: "bg-orange-500/10 dark:bg-orange-400/10",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500 dark:bg-orange-400",
    dotMuted: "bg-orange-500/25 dark:bg-orange-400/25",
  },
  cyan: {
    tone: "#06b6d4",
    soft: "bg-cyan-500/10 dark:bg-cyan-400/10",
    text: "text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500 dark:bg-cyan-400",
    dotMuted: "bg-cyan-500/25 dark:bg-cyan-400/25",
  },
};


function formatIqd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(value);
}

const CARD_LAYOUTS = [
  "left-[1%] w-[49%] max-[380px]:w-[47%]",
  "left-[25.5%] w-[49%] max-[380px]:left-[26.5%] max-[380px]:w-[47%]",
  "right-[1%] w-[49%] max-[380px]:w-[47%]",
] as const;

const CARD_SPRING = { type: "spring", stiffness: 165, damping: 28, mass: 0.82 } as const;
const CONTROL_SPRING = { type: "spring", stiffness: 340, damping: 24 } as const;
const AUTO_ADVANCE_MS = 4500;
const CENTER_LAYOUT_INDEX = 1;

function getCardScale(distanceFromCenter: number) {
  return distanceFromCenter === 0 ? 1.05 : 0.86;
}

// Grade each side to sell the story: the "before" shot reads flat and drained,
// the "after" reads vivid. Applied on top of whatever photos are uploaded, so
// the contrast holds even when both sides are similar source images.
const BEFORE_IMAGE_EFFECT = "grayscale-[0.75] brightness-[0.72] contrast-[0.92] blur-[0.4px]";
const AFTER_IMAGE_EFFECT = "saturate-[1.18] contrast-[1.06] brightness-[1.04]";

/** Shown for a side that has no uploaded photo yet — deliberately neutral rather than a random stock image. */
function ResultImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
      <ImageIcon aria-hidden="true" className="h-8 w-8 text-white/25" />
    </div>
  );
}

/** The before/after comparison card itself — rendered inside ResultCardFan. */
function ResultBeforeAfterCard({ item }: { item: AdvertisingResultItem }) {
  const [position, setPosition] = useState(45);
  const theme = RESULT_THEME[item.color];

  return (
    <div
      role="group"
      aria-label={`${item.category} — ${item.before} بۆ ${item.after} بینین`}
      className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-950 shadow-2xl"
    >
      {item.afterImageUrl ? (
        <Image
          src={item.afterImageUrl}
          alt=""
          fill
          sizes="20rem"
          className={`object-cover ${AFTER_IMAGE_EFFECT}`}
          unoptimized
        />
      ) : (
        <ResultImagePlaceholder />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 p-2.5 text-white">
        <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">دوای سپۆنسەر</span>
        <span className="text-xl font-black tabular-nums">{item.after}</span>
      </div>

      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {item.beforeImageUrl ? (
          <Image
            src={item.beforeImageUrl}
            alt=""
            fill
            sizes="20rem"
            className={`object-cover ${BEFORE_IMAGE_EFFECT}`}
            unoptimized
          />
        ) : (
          <ResultImagePlaceholder />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 p-2.5 text-white/80">
          <span className="text-[9px] font-bold uppercase tracking-wide opacity-60">پێش سپۆنسەر</span>
          <span className="text-sm font-bold tabular-nums">{item.before}</span>
        </div>
      </div>

      <span
        className={`pointer-events-none absolute left-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-semibold ${GLASS_SURFACE_CLASS}`}
        style={{ boxShadow: GLASS_CONTROL_SHADOW }}
        dir="auto"
      >
        {item.category}
      </span>
      <span
        className={`pointer-events-none absolute right-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-semibold ${GLASS_SURFACE_CLASS}`}
        style={{ boxShadow: GLASS_CONTROL_SHADOW }}
      >
        {formatIqd(item.price)}
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_16px_rgba(0,0,0,0.45)]"
        style={{ left: `${position}%` }}
      >
        <span
          className={`absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition group-focus-within:scale-110 ${GLASS_SURFACE_CLASS}`}
          style={{ boxShadow: `${GLASS_CONTROL_SHADOW}, 0 10px 30px -14px ${theme.tone}` }}
        >
          <ChevronLeft className="-mr-0.5 h-3 w-3" strokeWidth={2.5} />
          <ChevronRight className="-ml-0.5 h-3 w-3" strokeWidth={2.5} />
        </span>
      </span>

      <input
        aria-label={`${item.category}: پێش / دوای سپۆنسەر`}
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0"
        dir="ltr"
      />
    </div>
  );
}

/**
 * Position of a card relative to the active one: 0 centre, -1 left, +1 right,
 * null when it sits further out and should not render. Wrapping to the shortest
 * path keeps the fan correct for any number of items — the old inline maths
 * indexed CARD_LAYOUTS directly and only held for exactly three.
 */
function fanSlot(itemIndex: number, activeIndex: number, total: number): number | null {
  const wrapped = (((itemIndex - activeIndex) % total) + total) % total;
  const slot = wrapped > total / 2 ? wrapped - total : wrapped;
  return Math.abs(slot) <= 1 ? slot : null;
}

/** The three-up card fan — shared so the dashboard editor previews the exact public layout. */
export function ResultCardFan({
  items,
  activeIndex,
  onPrevious,
  onNext,
  renderActions,
  className,
}: {
  items: readonly AdvertisingResultItem[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  /** Overlay rendered on the centre card only (the dashboard's edit/delete controls). */
  renderActions?: (item: AdvertisingResultItem) => ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const total = items.length;

  return (
    <div
      role="group"
      aria-label="نموونەی ئەنجامەکان"
      className={`relative isolate mx-auto aspect-[25/18] max-w-lg ${className ?? ""}`}
    >
      {items.map((item, itemIndex) => {
        const slot = fanSlot(itemIndex, activeIndex, total);
        if (slot === null) return null;

        const distanceFromCenter = Math.abs(slot);
        const selected = distanceFromCenter === 0;
        const theme = RESULT_THEME[item.color];

        return (
          <motion.div
            key={item.id}
            layout="position"
            layoutDependency={activeIndex}
            aria-hidden={!selected}
            className={`absolute bottom-0 ${CARD_LAYOUTS[slot + CENTER_LAYOUT_INDEX]} ${selected ? "" : "pointer-events-none"}`}
            style={{ zIndex: 30 - distanceFromCenter * 10 } as CSSProperties}
            initial={false}
            transition={reduceMotion ? { duration: 0 } : CARD_SPRING}
          >
            <motion.div
              className="origin-bottom"
              initial={false}
              animate={{
                scale: getCardScale(distanceFromCenter),
                opacity: selected ? 1 : 0.55,
              }}
              transition={reduceMotion ? { duration: 0 } : CARD_SPRING}
              style={selected ? { filter: `drop-shadow(0 20px 35px ${theme.tone}45)` } : undefined}
            >
              <ResultBeforeAfterCard item={item} />
              {selected && renderActions?.(item)}
            </motion.div>
          </motion.div>
        );
      })}

      {total > 1 && (
        <>
          <div className="absolute left-1 top-1/2 z-30 -translate-y-1/2">
            <motion.button
              type="button"
              aria-label="نموونەی پێشوو"
              className="grid size-9 place-items-center rounded-full bg-white/80 text-slate-900 shadow-lg shadow-black/10 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 dark:bg-slate-900/75 dark:text-white dark:shadow-black/35"
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              transition={reduceMotion ? { duration: 0 } : CONTROL_SPRING}
              onClick={onPrevious}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </motion.button>
          </div>
          <div className="absolute right-1 top-1/2 z-30 -translate-y-1/2">
            <motion.button
              type="button"
              aria-label="نموونەی داهاتوو"
              className="grid size-9 place-items-center rounded-full bg-white/80 text-slate-900 shadow-lg shadow-black/10 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 dark:bg-slate-900/75 dark:text-white dark:shadow-black/35"
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              transition={reduceMotion ? { duration: 0 } : CONTROL_SPRING}
              onClick={onNext}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}

/** Colour-coded position dots — shared by the public section and the dashboard editor. */
export function ResultFanDots({
  items,
  activeIndex,
  onSelect,
  className,
}: {
  items: readonly AdvertisingResultItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className ?? ""}`}>
      {items.map((item, dotIndex) => {
        const theme = RESULT_THEME[item.color];
        const isActive = dotIndex === activeIndex;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(dotIndex)}
            aria-label={item.category}
            aria-current={isActive}
            className={`!h-2 !min-h-0 !min-w-0 rounded-full transition-all ${
              isActive ? `!w-6 ${theme.dot}` : `!w-2 ${theme.dotMuted}`
            }`}
          />
        );
      })}
    </div>
  );
}

export function AdvertisingResultsShowcaseSection({ items }: { items: readonly AdvertisingResultItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = items.length;

  useEffect(() => {
    // Nothing to cycle through below two items, and `% 0` would set NaN.
    if (total <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [activeIndex, total]);

  if (total === 0) return null;

  const showPrevious = () => setActiveIndex((current) => (current - 1 + total) % total);
  const showNext = () => setActiveIndex((current) => (current + 1) % total);

  return (
    <PublicSection
      id="results"
      contentClassName="max-w-6xl"
      decorations={
        <BusinessSectionDecorations
          colors={["#ec4899", "#6366f1"]}
          labels={["نموونەی ئەنجام", "سەرکەوتوو"]}
          variant={5}
        />
      }
    >
        <PublicSectionHeading
          title="نموونەی ئەنجامی ڕاستەقینە"
          description="سلایدەرەکە بجوڵێنە بۆ بەراوردکردنی بینینی پێش و دوای سپۆنسەر"
        />

        <ResultCardFan
          items={items}
          activeIndex={activeIndex}
          onPrevious={showPrevious}
          onNext={showNext}
          className="mt-14"
        />

        <ResultFanDots
          items={items}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          className="mt-6"
        />
    </PublicSection>
  );
}
