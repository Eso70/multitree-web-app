import Image from "next/image";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import { REVIEW_TONES } from "./section-tokens";
import { usePagedItems } from "./use-paged-items";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { latinDigits } from "@/features/mini-website/hours";
import type { MiniWebsiteReview } from "@/features/mini-website/types";

function ReviewPageButton({
  side,
  label,
  onClick,
}: {
  side: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // Sits on the section surface rather than on a photo, so it takes a
      // plain outline instead of the smoked glass the image controls use.
      className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-current/20 transition duration-300 hover:ring-current/45 focus-visible:outline-none focus-visible:ring-2"
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
    </button>
  );
}

export function ReviewsSection({
  reviews,
  tone = SWISS_ACCENT,
  ...frame
}: {
  reviews: MiniWebsiteReview[];
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = reviews.filter(
    (review) => review.author.trim() && review.text.trim(),
  );
  // Two at a time on a wide screen, one on a phone. Declared before the early
  // return so the hook order never depends on whether a page has reviews.
  const perPage = useMediaQuery("(min-width: 768px)") ? 2 : 1;
  const { visible, next, previous } = usePagedItems(shown, perPage);

  if (!shown.length) return null;

  const average =
    shown.reduce((total, review) => total + review.rating, 0) / shown.length;
  const paged = shown.length > perPage;

  return (
    <SectionFrame
      tone={tone}
      {...frame}
      trailing={
        // The score belongs beside the heading, not above the first card.
        <span className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black"
            style={{ background: toneWash(tone, 12), color: tone }}
            dir="ltr"
          >
            <Star className="h-4 w-4 fill-current" />
            {latinDigits(average.toFixed(1))}
          </span>
          <span className="text-[11px] font-bold opacity-50" dir="auto">
            {latinDigits(String(shown.length))} ڕا
          </span>
          {paged && (
            <span className="flex items-center gap-1.5">
              <ReviewPageButton side="prev" label="ڕای پێشوو" onClick={previous} />
              <ReviewPageButton side="next" label="ڕای دواتر" onClick={next} />
            </span>
          )}
        </span>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {visible.map((review) => {
          const reviewTone =
            REVIEW_TONES[
              shown.indexOf(review) % REVIEW_TONES.length
            ];
          return (
            <figure
              key={review.id}
              className="group flex min-w-0 gap-4 rounded-[1.25rem] p-4 transition duration-300 hover:-translate-y-0.5 sm:p-5"
              style={{
                backgroundImage: `linear-gradient(150deg, ${toneWash(reviewTone, 12)}, ${toneWash(reviewTone, 3)})`,
              }}
              dir="rtl"
            >
              {review.image ? (
                <span
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl transition duration-500 group-hover:scale-[1.03] sm:h-20 sm:w-20"
                  style={{
                    boxShadow: `0 0 0 2px ${toneWash(reviewTone, 40)}, 0 14px 30px -20px ${reviewTone}`,
                  }}
                >
                  <Image
                    src={review.image}
                    alt={review.author}
                    fill
                    sizes="5rem"
                    className="object-cover"
                    unoptimized
                  />
                </span>
              ) : (
                // No photo uploaded: the reviewer's initial in their own tone.
                <span
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black transition duration-500 group-hover:scale-[1.03] sm:h-20 sm:w-20 sm:text-2xl"
                  style={{
                    background: toneWash(reviewTone, 16),
                    color: reviewTone,
                    boxShadow: `0 0 0 1px ${toneWash(reviewTone, 30)}`,
                  }}
                  aria-hidden="true"
                >
                  {review.author.trim().slice(0, 1)}
                </span>
              )}

              <span className="flex min-w-0 flex-1 flex-col">
                <figcaption
                  className="text-sm font-semibold leading-snug sm:text-base"
                  dir="auto"
                >
                  {review.author}
                </figcaption>

                <span
                  className="mt-1 flex items-center gap-0.5"
                  dir="ltr"
                  aria-label={`${review.rating} / 5`}
                >
                  {Array.from({ length: 5 }, (_, starIndex) => (
                    <Star
                      key={starIndex}
                      className="h-3.5 w-3.5"
                      style={{
                        fill:
                          starIndex < review.rating ? reviewTone : "transparent",
                        color:
                          starIndex < review.rating
                            ? reviewTone
                            : toneWash(reviewTone, 30),
                      }}
                    />
                  ))}
                </span>

                <blockquote
                  className="mt-2.5 text-xs leading-6 opacity-70 sm:text-[13px]"
                  dir="auto"
                >
                  {review.text}
                </blockquote>
              </span>
            </figure>
          );
        })}
      </div>
    </SectionFrame>
  );
}
