"use client";

import { ChevronDown, ChevronUp, Plus, Trash2, Users } from "lucide-react";
import {
  MINI_WEBSITE_MAX_PARTNERS,
  createMiniWebsitePartner,
  type MiniWebsitePartner,
} from "@linktree/types";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MediaUpload } from "./MiniWebsiteContentStep";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");

export function MiniWebsitePartnerFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const partners = draft.partners;
  const setPartners = (next: MiniWebsitePartner[]) =>
    onChange({ ...draft, partners: next });
  const patchAt = (index: number, patch: Partial<MiniWebsitePartner>) =>
    setPartners(
      partners.map((partner, partnerIndex) =>
        partnerIndex === index ? { ...partner, ...patch } : partner,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= partners.length) return;
    const next = [...partners];
    [next[index], next[target]] = [next[target], next[index]];
    setPartners(next);
  };

  return (
    <div className="space-y-4">
      {errors.partners && (
        <p className="text-[11px] font-bold text-red-500">{errors.partners}</p>
      )}

      {partners.map((partner, index) => (
        <div
          key={partner.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-400">
              {index + 1}
            </span>
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
                disabled={index === partners.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوە"
                tone="danger"
                onClick={() =>
                  setPartners(
                    partners.filter(
                      (_, partnerIndex) => partnerIndex !== index,
                    ),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <MediaUpload
            label="لۆگۆی براند"
            required
            wide
            value={partner.image ? [partner.image] : []}
            onChange={(value) => patchAt(index, { image: value[0] ?? "" })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ناوی براند
              </span>
              <input
                value={partner.name}
                onChange={(event) =>
                  patchAt(index, { name: event.target.value })
                }
                maxLength={160}
                placeholder="ئارەزوومەندانە، بۆ دەستگەیشتن"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                لینکی براند
              </span>
              <input
                value={partner.url}
                onChange={(event) =>
                  patchAt(index, { url: event.target.value })
                }
                maxLength={500}
                placeholder="https://..."
                className={inputClass}
                dir="ltr"
              />
            </label>
          </div>

          {errors[`partner.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`partner.${index}`]}
            </p>
          )}
        </div>
      ))}

      {partners.length < MINI_WEBSITE_MAX_PARTNERS && (
        <button
          type="button"
          onClick={() => setPartners([...partners, createMiniWebsitePartner()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {partners.length ? "براندێکی تر" : "زیادکردنی لۆگۆی براند"}
        </button>
      )}

      {!partners.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Users className="h-4 w-4 shrink-0" />
          یەکەم لۆگۆی هاوبەش یان براند زیاد بکە.
        </div>
      )}
    </div>
  );
}
