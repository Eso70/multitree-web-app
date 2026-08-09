"use client";

import { ChevronDown, ChevronUp, Plus, Star, Trash2 } from "lucide-react";
import {
  MINI_WEBSITE_MAX_RATING,
  MINI_WEBSITE_MAX_REVIEWS,
  createMiniWebsiteReview,
  type MiniWebsiteReview,
} from "@linktree/types";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { MediaUpload } from "./MiniWebsiteContentStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

/**
 * What customers said, entered by the business.
 *
 * Deliberately not open to the public: a page a stranger can write to needs
 * moderation, rate limiting and a spam story, none of which a review card earns
 * on its own. If visitor-submitted reviews are wanted later, that is a public
 * endpoint and a review queue, not a change to this form.
 */
export function MiniWebsiteReviewsFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const reviews = draft.reviews;

  const setReviews = (next: MiniWebsiteReview[]) =>
    onChange({ ...draft, reviews: next });

  const patchAt = (index: number, patch: Partial<MiniWebsiteReview>) =>
    setReviews(
      reviews.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= reviews.length) return;
    const next = [...reviews];
    [next[index], next[target]] = [next[target], next[index]];
    setReviews(next);
  };

  return (
    <div className="space-y-4">
      {errors.reviews && (
        <p className="text-[11px] font-bold text-red-500">{errors.reviews}</p>
      )}

      {reviews.map((review, index) => (
        <div
          key={review.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-[11px] font-black text-slate-400">
              {index + 1}
            </span>
            <label className="min-w-0 flex-1">
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ناوی کڕیار
              </MiniWebsiteFieldLabel>
            <input
              required
              value={review.author}
              onChange={(event) => patchAt(index, { author: event.target.value })}
              maxLength={240}
              placeholder="ناوی کڕیار"
              aria-label={`ناوی کڕیاری ${index + 1}`}
              className={`${inputClass} min-w-0 flex-1`}
              dir="auto"
            />
            </label>
            <span className="flex shrink-0 items-center gap-0.5">
              <IconActionButton
                label="بردنە سەرەوە"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="بردنە خوارەوە"
                disabled={index === reviews.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوەی ڕا"
                tone="danger"
                onClick={() =>
                  setReviews(
                    reviews.filter((_, entryIndex) => entryIndex !== index),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <RatingPicker
            value={review.rating}
            label={`ئەستێرەی ڕای ${index + 1}`}
            onChange={(rating) => patchAt(index, { rating })}
          />

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              دەقی ڕا
            </span>
          <textarea
            required
            value={review.text}
            onChange={(event) => patchAt(index, { text: event.target.value })}
            maxLength={2000}
            placeholder="ئەوەی کڕیارەکە گوتوویەتی..."
            aria-label={`دەقی ڕای ${index + 1}`}
            className={`${textareaClass} w-full resize-y`}
            dir="auto"
          />
          </label>

          {/* Optional: a card with no photo falls back to an avatar glyph in
              the reviewer's own colour. */}
          <MediaUpload
            label="وێنەی کڕیار (ئارەزوومەندانە)"
            wide
            value={review.image ? [review.image] : []}
            onChange={(value) => patchAt(index, { image: value[0] ?? "" })}
          />

          {errors[`review.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`review.${index}`]}
            </p>
          )}
        </div>
      ))}

      {reviews.length < MINI_WEBSITE_MAX_REVIEWS && (
        <button
          type="button"
          onClick={() => setReviews([...reviews, createMiniWebsiteReview()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {reviews.length ? "ڕایەکی تر" : "زیادکردنی ڕا"}
        </button>
      )}
    </div>
  );
}

/** Five stars, clickable. A radio group rather than a select — it is a scale. */
function RatingPicker({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (rating: number) => void;
}) {
  return (
    <div>
      <MiniWebsiteFieldLabel className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
        نمرەی ڕا
      </MiniWebsiteFieldLabel>
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {Array.from({ length: MINI_WEBSITE_MAX_RATING }, (_, index) => {
        const rating = index + 1;
        const filled = rating <= value;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${rating}`}
            onClick={() => onChange(rating)}
            className="rounded-lg p-1 transition hover:scale-110"
          >
            <Star
              className={`h-5 w-5 ${filled ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-white/20"}`}
            />
          </button>
        );
      })}
      <span className="ms-1 text-[11px] font-black text-slate-400">
        {value} / {MINI_WEBSITE_MAX_RATING}
      </span>
    </div>
    </div>
  );
}
