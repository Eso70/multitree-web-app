"use client";

import { Languages, Plus, Trash2 } from "lucide-react";
import {
  MINI_WEBSITE_MAX_COVERAGE_ITEMS,
  createMiniWebsiteCoverageItem,
  type MiniWebsiteCoverageItem,
} from "@linktree/types";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");

export function MiniWebsiteCoverageFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const items = draft.coverage;
  const setItems = (next: MiniWebsiteCoverageItem[]) =>
    onChange({ ...draft, coverage: next });
  const patchAt = (index: number, patch: Partial<MiniWebsiteCoverageItem>) =>
    setItems(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const add = () => {
    if (items.length >= MINI_WEBSITE_MAX_COVERAGE_ITEMS) return;
    setItems([...items, createMiniWebsiteCoverageItem("language")]);
  };

  return (
    <div className="space-y-4">
      {errors.coverage && (
        <p className="text-[11px] font-bold text-red-500">{errors.coverage}</p>
      )}

      <div className="space-y-4">
        {items.map((item, index) => {
          return (
            <div
              key={item.id}
              className="mini-website-editor-item grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                <Languages className="h-4 w-4" />
              </span>
              <label>
                <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                  زمان
                </span>
                <input
                  required
                  value={item.name}
                  onChange={(event) =>
                    patchAt(index, { name: event.target.value })
                  }
                  maxLength={240}
                  placeholder="کوردی"
                  className={inputClass}
                  dir="auto"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                  ئاست یان وردەکاری
                </span>
                <input
                  value={item.detail}
                  onChange={(event) =>
                    patchAt(index, { detail: event.target.value })
                  }
                  maxLength={500}
                  placeholder="زمانی دایک"
                  className={inputClass}
                  dir="auto"
                />
              </label>
              <IconActionButton
                label="سڕینەوە"
                tone="danger"
                onClick={() =>
                  setItems(items.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
              {errors[`coverage.${index}`] && (
                <p className="text-[10px] font-bold text-red-500 sm:col-span-4">
                  {errors[`coverage.${index}`]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {items.length < MINI_WEBSITE_MAX_COVERAGE_ITEMS && (
        <div>
          <button
            type="button"
            onClick={add}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            زیادکردنی زمان
          </button>
        </div>
      )}

      {!items.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Languages className="h-4 w-4 shrink-0" />
          یەکەم زمان زیاد بکە.
        </div>
      )}
    </div>
  );
}
