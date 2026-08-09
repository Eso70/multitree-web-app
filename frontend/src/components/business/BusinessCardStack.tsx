"use client";

import { useEffect, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { getMultiTreeAccentInk } from "@/lib/multitree-theme";

export interface BusinessCardStackItem {
  title: string;
  label: string;
  color: string;
  surfaceFrom: string;
  surfaceTo: string;
  foreground: string;
  icon: LucideIcon;
}

interface BusinessCardStackProps {
  businessName: string;
  items: ReadonlyArray<BusinessCardStackItem>;
  activeIndex: number;
  onSelect: (index: number) => void;
  intervalMs?: number;
}

const stackPositions = [
  { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
  { x: 30, y: 38, rotate: 5, scale: 0.92, opacity: 0.72 },
  { x: -24, y: 68, rotate: -5, scale: 0.84, opacity: 0.48 },
] as const;

export function BusinessCardStack({
  businessName,
  items,
  activeIndex,
  onSelect,
  intervalMs = 4800,
}: BusinessCardStackProps) {
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (reduceMotion || items.length < 2) return;
    const timer = window.setInterval(
      () => onSelect((activeIndex + 1) % items.length),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [activeIndex, intervalMs, items.length, onSelect, reduceMotion]);

  if (items.length === 0) return null;

  return (
    <div
      aria-label="تایبەتمەندییەکانی پەڕە"
      className="relative mx-auto h-[25rem] w-full max-w-[32rem] sm:h-[31rem]"
    >
      {items.map((item, index) => {
        const position =
          stackPositions[(index - activeIndex + items.length) % items.length] ??
          stackPositions[stackPositions.length - 1];
        const selected = index === activeIndex;
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ zIndex: items.length - ((index - activeIndex + items.length) % items.length) }}
          >
            <motion.button
              type="button"
              aria-pressed={selected}
              aria-controls="business-feature-detail"
              aria-label={item.title}
              onClick={() => onSelect(index)}
              className="pointer-events-auto relative aspect-[1.586/1] w-[82%] overflow-hidden rounded-[1.45rem] border p-6 text-left shadow-[0_30px_70px_-38px_rgba(15,23,42,.55)] outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f8f9fa] dark:shadow-[0_34px_80px_-34px_rgba(0,0,0,.75)] dark:focus-visible:ring-offset-[#0b0d0e] sm:w-[84%] sm:p-7"
              style={{
                background: `linear-gradient(145deg, ${item.surfaceFrom}, ${item.surfaceTo})`,
                color: item.foreground,
                borderColor: `color-mix(in srgb, ${item.color} 28%, transparent)`,
                boxShadow: `0 30px 70px -38px color-mix(in srgb, ${item.color} 58%, #0f172a), inset 0 1px 0 rgba(255,255,255,.58)`,
                "--tw-ring-color": item.color,
              } as CSSProperties}
              animate={position}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 210, damping: 24, mass: 0.85 }
              }
              whileHover={reduceMotion ? undefined : { y: position.y - 6 }}
              whileTap={reduceMotion ? undefined : { scale: position.scale * 0.98 }}
            >
              <span
                aria-hidden="true"
                className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[2rem] border-white/10"
              />
              <span className="relative flex h-full flex-col justify-between gap-6">
                <span className="flex items-start justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                    {item.label}
                  </span>
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-md"
                    style={{ color: getMultiTreeAccentInk(item.color), backgroundColor: item.color }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                </span>
                <span>
                  <span className="block text-sm font-medium opacity-65">{businessName}</span>
                  <span className="mt-2 block max-w-[85%] text-xl font-semibold leading-snug sm:text-2xl">
                    {item.title}
                  </span>
                </span>
              </span>
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}
