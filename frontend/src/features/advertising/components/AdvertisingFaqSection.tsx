"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, CircleHelp } from "lucide-react";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import type { AdvertisingFaq } from "../types";

type FaqColor = "cyan" | "orange" | "violet" | "emerald";

const COLOR_CYCLE: readonly FaqColor[] = ["cyan", "orange", "violet", "emerald"];

const THEME: Record<
  FaqColor,
  { ring: string; shadow: string; text: string; soft: string; dot: string; dotMuted: string }
> = {
  cyan: {
    ring: "border-cyan-500/20 dark:border-cyan-400/15",
    shadow: "shadow-[0_30px_80px_-52px_rgba(6,182,212,.35)]",
    text: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-500/10 dark:bg-cyan-400/10",
    dot: "bg-cyan-500 dark:bg-cyan-400",
    dotMuted: "bg-cyan-500/25 dark:bg-cyan-400/25",
  },
  orange: {
    ring: "border-orange-500/20 dark:border-orange-400/15",
    shadow: "shadow-[0_30px_80px_-52px_rgba(249,115,22,.35)]",
    text: "text-orange-700 dark:text-orange-300",
    soft: "bg-orange-500/10 dark:bg-orange-400/10",
    dot: "bg-orange-500 dark:bg-orange-400",
    dotMuted: "bg-orange-500/25 dark:bg-orange-400/25",
  },
  violet: {
    ring: "border-violet-500/20 dark:border-violet-400/15",
    shadow: "shadow-[0_30px_80px_-52px_rgba(139,92,246,.35)]",
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/10 dark:bg-violet-400/10",
    dot: "bg-violet-500 dark:bg-violet-400",
    dotMuted: "bg-violet-500/25 dark:bg-violet-400/25",
  },
  emerald: {
    ring: "border-emerald-500/20 dark:border-emerald-400/15",
    shadow: "shadow-[0_30px_80px_-52px_rgba(16,185,129,.35)]",
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/10 dark:bg-emerald-400/10",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    dotMuted: "bg-emerald-500/25 dark:bg-emerald-400/25",
  },
};

/** Colour for a card at this position — cycles, so neighbouring questions never share a tone. */
function faqThemeAt(index: number) {
  return THEME[COLOR_CYCLE[index % COLOR_CYCLE.length]];
}

/**
 * One-question-at-a-time card with its nav row. Shared so the dashboard editor
 * previews the exact public card rather than a lookalike; it passes
 * `renderActions` to overlay its edit/delete controls.
 */
export function FaqCarousel({
  items,
  activeIndex,
  onSelect,
  onPrevious,
  onNext,
  renderActions,
  className,
}: {
  items: readonly AdvertisingFaq[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  renderActions?: (faq: AdvertisingFaq) => ReactNode;
  className?: string;
}) {
  const active = items[activeIndex];
  const theme = faqThemeAt(activeIndex);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        className={`relative overflow-hidden rounded-3xl border bg-white transition-colors dark:bg-white/[0.03] ${theme.ring} ${theme.shadow}`}
      >
        <div className="relative px-7 py-7">
          <div className="flex items-center justify-between gap-3">
            {renderActions ? renderActions(active) : <span />}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black transition-colors ${theme.soft} ${theme.text}`}
            >
              <CircleHelp className="h-3.5 w-3.5" /> پرسیار {activeIndex + 1} / {items.length}
            </span>
          </div>
          <h3
            className="mt-4 min-h-16 text-lg font-black leading-8 text-slate-900 dark:text-white"
            dir="auto"
          >
            {active.question}
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400" dir="auto">
            {active.answer}
          </p>
        </div>

        {items.length > 1 && (
          <div className="flex items-center justify-center gap-4 border-t border-black/6 py-4 dark:border-white/8">
            <button
              type="button"
              onClick={onPrevious}
              aria-label="پرسیاری پێشوو"
              className={`flex !h-9 !w-9 !min-h-0 !min-w-0 shrink-0 items-center justify-center rounded-full transition hover:opacity-75 active:scale-90 ${theme.soft} ${theme.text}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-1.5">
              {items.map((faq, dotIndex) => {
                const dotTheme = faqThemeAt(dotIndex);
                const isActive = dotIndex === activeIndex;
                return (
                  <button
                    key={faq.id}
                    type="button"
                    onClick={() => onSelect(dotIndex)}
                    aria-label={faq.question}
                    aria-current={isActive}
                    className={`!h-2 !min-h-0 !min-w-0 rounded-full transition-all ${
                      isActive ? `!w-6 ${dotTheme.dot}` : `!w-2 ${dotTheme.dotMuted}`
                    }`}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={onNext}
              aria-label="پرسیاری داهاتوو"
              className={`flex !h-9 !w-9 !min-h-0 !min-w-0 shrink-0 items-center justify-center rounded-full transition hover:opacity-75 active:scale-90 ${theme.soft} ${theme.text}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdvertisingFaqSection({ items }: { items: readonly AdvertisingFaq[] }) {
  const [index, setIndex] = useState(0);

  if (items.length === 0) return null;

  const activeIndex = index % items.length;

  return (
    <section
      id="faq"
      className="relative scroll-mt-24 overflow-hidden bg-transparent px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <BusinessSectionDecorations
        colors={["#22d3ee", "#f97316"]}
        labels={["وەڵامی ڕوون", "پێش داواکاری"]}
        variant={3}
      />
      <div className="relative mx-auto max-w-2xl">
        <div className="text-center">
          <h2 className="break-words text-[clamp(2.35rem,5vw,4.9rem)] font-medium leading-[1.06] tracking-[-0.04em] text-balance [overflow-wrap:anywhere]">
            پرسیارە باوەکان
          </h2>
          <p className="mx-auto mt-4 max-w-xl break-words text-sm leading-7 text-black/52 [overflow-wrap:anywhere] dark:text-white/52">
            وەڵامی هەموو ئەو پرسیارانەی پێش دەستپێکردنی سپۆنسەر پێویستە بیزانیت.
          </p>
        </div>

        <FaqCarousel
          items={items}
          activeIndex={activeIndex}
          onSelect={setIndex}
          onPrevious={() => setIndex((current) => (current - 1 + items.length) % items.length)}
          onNext={() => setIndex((current) => (current + 1) % items.length)}
          className="mt-10"
        />
      </div>
    </section>
  );
}
