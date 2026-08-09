"use client";

import { ChevronDown, ChevronUp, Columns2, Plus, Trash2 } from "lucide-react";
import {
  MINI_WEBSITE_MAX_BEFORE_AFTER,
  createMiniWebsiteBeforeAfter,
  type MiniWebsiteBeforeAfter,
} from "@linktree/types";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MediaUpload } from "./MiniWebsiteContentStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

export function MiniWebsiteBeforeAfterFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const comparisons = draft.beforeAfter;
  const setComparisons = (next: MiniWebsiteBeforeAfter[]) =>
    onChange({ ...draft, beforeAfter: next });
  const patchAt = (index: number, patch: Partial<MiniWebsiteBeforeAfter>) =>
    setComparisons(
      comparisons.map((comparison, comparisonIndex) =>
        comparisonIndex === index ? { ...comparison, ...patch } : comparison,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= comparisons.length) return;
    const next = [...comparisons];
    [next[index], next[target]] = [next[target], next[index]];
    setComparisons(next);
  };

  return (
    <div className="space-y-4">
      {errors.beforeAfter && (
        <p className="text-[11px] font-bold text-red-500">
          {errors.beforeAfter}
        </p>
      )}

      {comparisons.map((comparison, index) => (
        <div
          key={comparison.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-[11px] font-black text-slate-400">
              {index + 1}
            </span>
            <label className="min-w-0 flex-1">
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ناونیشان
              </MiniWebsiteFieldLabel>
            <input
              required
              value={comparison.title}
              onChange={(event) =>
                patchAt(index, { title: event.target.value })
              }
              maxLength={240}
              placeholder="ناونیشانی بەراوردەکە"
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
                disabled={index === comparisons.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوە"
                tone="danger"
                onClick={() =>
                  setComparisons(
                    comparisons.filter(
                      (_, comparisonIndex) => comparisonIndex !== index,
                    ),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MediaUpload
              label="وێنەی پێش"
              required
              wide
              value={comparison.beforeImage ? [comparison.beforeImage] : []}
              onChange={(value) =>
                patchAt(index, { beforeImage: value[0] ?? "" })
              }
            />
            <MediaUpload
              label="وێنەی دوا"
              required
              wide
              value={comparison.afterImage ? [comparison.afterImage] : []}
              onChange={(value) =>
                patchAt(index, { afterImage: value[0] ?? "" })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                پێش
              </span>
              <input
                value={comparison.beforeLabel}
                onChange={(event) =>
                  patchAt(index, { beforeLabel: event.target.value })
                }
                maxLength={80}
                placeholder="پێش"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                دوا
              </span>
              <input
                value={comparison.afterLabel}
                onChange={(event) =>
                  patchAt(index, { afterLabel: event.target.value })
                }
                maxLength={80}
                placeholder="دوا"
                className={inputClass}
                dir="auto"
              />
            </label>
          </div>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              وردەکاری
            </span>
          <textarea
            value={comparison.description}
            onChange={(event) =>
              patchAt(index, { description: event.target.value })
            }
            maxLength={2000}
            placeholder="وردەکارییەکی کورت"
            className={`${textareaClass} w-full resize-y`}
            dir="auto"
          />
          </label>

          {errors[`beforeAfter.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`beforeAfter.${index}`]}
            </p>
          )}
        </div>
      ))}

      {comparisons.length < MINI_WEBSITE_MAX_BEFORE_AFTER && (
        <button
          type="button"
          onClick={() =>
            setComparisons([...comparisons, createMiniWebsiteBeforeAfter()])
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          زیادکردنی بەراوردی پێش و دوا
        </button>
      )}

      {!comparisons.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Columns2 className="h-4 w-4 shrink-0" />
          یەکەم بەراوردی پێش و دوا زیاد بکە.
        </div>
      )}
    </div>
  );
}
