"use client";

import { useEffect, useState } from "react";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import type { AdvertisingTestimonial } from "../types";
import {
  TestimonialStackCard,
  TestimonialStackDots,
  TESTIMONIAL_THEME,
} from "./AdvertisingTestimonialStack";

/** Re-exported for callers that import the color map from this section (the dashboard editor). */
export { TESTIMONIAL_THEME };

const AUTO_ADVANCE_MS = 5000;

export function AdvertisingTestimonialsSection({ items }: { items: readonly AdvertisingTestimonial[] }) {
  const [index, setIndex] = useState(0);
  const total = items.length;

  useEffect(() => {
    // Nothing to cycle through below two items, and `% 0` would set NaN.
    if (total <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [index, total]);

  if (total === 0) return null;

  const goPrev = () => setIndex((current) => (current - 1 + total) % total);
  const goNext = () => setIndex((current) => (current + 1) % total);
  const activeIndex = index % total;

  return (
    <section
      id="testimonials"
      className="relative scroll-mt-24 overflow-hidden bg-transparent px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <BusinessSectionDecorations
        colors={["#f97316", "#22c55e"]}
        labels={["ڕای کڕیار", "متمانەی ڕاستەقینە"]}
        variant={0}
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="break-words text-[clamp(2.35rem,5vw,4.9rem)] font-medium leading-[1.06] tracking-[-0.04em] text-balance [overflow-wrap:anywhere]">
            ڕای ئەوانەی تاقیان کردووەتەوە
          </h2>
          <p className="mx-auto mt-4 max-w-2xl break-words text-sm leading-7 text-black/52 [overflow-wrap:anywhere] dark:text-white/52">
            ئەزموونی کڕیارانمان لەگەڵ خزمەتگوزاری سپۆنسەری تیکتۆک.
          </p>
        </div>

        <TestimonialStackCard
          items={items}
          activeIndex={activeIndex}
          onSelect={setIndex}
          onPrevious={goPrev}
          onNext={goNext}
          className="mt-14"
        />

        {total > 1 && (
          <TestimonialStackDots
            items={items}
            activeIndex={activeIndex}
            onSelect={setIndex}
            className="mt-6"
          />
        )}
      </div>
    </section>
  );
}
