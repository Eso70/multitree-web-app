"use client";

import { useEffect, useState } from "react";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";
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
    <PublicSection
      id="testimonials"
      contentClassName="max-w-6xl"
      decorations={
        <BusinessSectionDecorations
          colors={["#f97316", "#22c55e"]}
          labels={["ڕای کڕیار", "متمانەی ڕاستەقینە"]}
          variant={0}
        />
      }
    >
        <PublicSectionHeading
          title="ڕای ئەوانەی تاقیان کردووەتەوە"
          description="ئەزموونی کڕیارانمان لەگەڵ خزمەتگوزاری سپۆنسەری تیکتۆک"
        />

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
    </PublicSection>
  );
}
