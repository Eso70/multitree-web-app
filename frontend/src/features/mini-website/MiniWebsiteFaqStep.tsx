"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  MINI_WEBSITE_MAX_FAQ_ENTRIES,
  createMiniWebsiteFaqEntry,
  type MiniWebsiteFaqEntry,
} from "@linktree/types";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

/**
 * Questions and answers, in the order they are shown.
 *
 * Both halves are required — a question with no answer publishes a row that
 * tells the reader nothing — so the two fields sit in one card and are validated
 * together rather than as separate lists that could fall out of step.
 */
export function MiniWebsiteFaqFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const faq = draft.faq;

  const setFaq = (next: MiniWebsiteFaqEntry[]) =>
    onChange({ ...draft, faq: next });

  const patchAt = (index: number, patch: Partial<MiniWebsiteFaqEntry>) =>
    setFaq(
      faq.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= faq.length) return;
    const next = [...faq];
    [next[index], next[target]] = [next[target], next[index]];
    setFaq(next);
  };

  return (
    <div className="space-y-4">
      {errors.faq && (
        <p className="text-[11px] font-bold text-red-500">{errors.faq}</p>
      )}

      {faq.map((entry, index) => (
        <div
          key={entry.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-[11px] font-black text-slate-400">
              {index + 1}
            </span>
            <label className="min-w-0 flex-1">
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                پرسیار
              </MiniWebsiteFieldLabel>
            <input
              required
              value={entry.question}
              onChange={(event) => patchAt(index, { question: event.target.value })}
              maxLength={240}
              placeholder="پرسیار بنووسە..."
              aria-label={`پرسیاری ${index + 1}`}
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
                disabled={index === faq.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوەی پرسیار"
                tone="danger"
                onClick={() =>
                  setFaq(faq.filter((_, entryIndex) => entryIndex !== index))
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              وەڵام
            </span>
          <textarea
            required
            value={entry.answer}
            onChange={(event) => patchAt(index, { answer: event.target.value })}
            maxLength={2000}
            placeholder="وەڵام بنووسە..."
            aria-label={`وەڵامی پرسیاری ${index + 1}`}
            className={`${textareaClass} w-full resize-y`}
            dir="auto"
          />
          </label>

          {errors[`faq.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`faq.${index}`]}
            </p>
          )}
        </div>
      ))}

      {faq.length < MINI_WEBSITE_MAX_FAQ_ENTRIES && (
        <button
          type="button"
          onClick={() => setFaq([...faq, createMiniWebsiteFaqEntry()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {faq.length ? "پرسیارێکی تر" : "زیادکردنی پرسیار"}
        </button>
      )}
    </div>
  );
}
