"use client";

import {
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import {
  MINI_WEBSITE_MAX_EDUCATION_ENTRIES,
  createMiniWebsiteEducation,
  type MiniWebsiteEducation,
  type MiniWebsiteEducationStatus,
} from "@linktree/types";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MediaUpload } from "./MiniWebsiteContentStep";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

export const EDUCATION_STATUS_LABELS: Record<
  MiniWebsiteEducationStatus,
  string
> = {
  studying: "لە خوێندندایە",
  graduated: "دەرچووە",
  paused: "وەستاوە",
  other: "هی تر",
};

export function MiniWebsiteEducationFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const entries = draft.education;
  const setEntries = (education: MiniWebsiteEducation[]) =>
    onChange({ ...draft, education });
  const patchAt = (index: number, patch: Partial<MiniWebsiteEducation>) =>
    setEntries(
      entries.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    [next[index], next[target]] = [next[target], next[index]];
    setEntries(next);
  };

  return (
    <div className="space-y-4">
      {errors.education && (
        <p className="text-[11px] font-bold text-red-500">{errors.education}</p>
      )}

      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="text-xs font-black text-slate-400">
              {index + 1}
            </span>
            <span className="ml-auto flex items-center gap-0.5">
              <IconActionButton
                label="بردنە سەرەوە"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="بردنە خوارەوە"
                disabled={index === entries.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوە"
                tone="danger"
                onClick={() =>
                  setEntries(
                    entries.filter((_, entryIndex) => entryIndex !== index),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                دامەزراوە
              </span>
              <input
                required
                value={entry.institution}
                onChange={(event) =>
                  patchAt(index, { institution: event.target.value })
                }
                maxLength={240}
                placeholder="بۆ نموونە: زانکۆی سلێمانی"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                بڕوانامە
              </span>
              <input
                required
                value={entry.degree}
                onChange={(event) =>
                  patchAt(index, { degree: event.target.value })
                }
                maxLength={160}
                placeholder="بەکالۆریۆس، دبلۆم..."
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                بوار
              </span>
              <input
                value={entry.fieldOfStudy}
                onChange={(event) =>
                  patchAt(index, { fieldOfStudy: event.target.value })
                }
                maxLength={160}
                placeholder="ئەندازیاری شارستانی"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                شوێن
              </span>
              <input
                value={entry.location}
                onChange={(event) =>
                  patchAt(index, { location: event.target.value })
                }
                maxLength={160}
                placeholder="هەولێر، عێراق"
                className={inputClass}
                dir="auto"
              />
            </label>
            <CustomSelect<MiniWebsiteEducationStatus>
              label="دۆخ"
              required
              showRequirement
              value={entry.status}
              onChange={(status) =>
                patchAt(index, {
                  status,
                  ...(status === "studying" ? { endYear: "" } : {}),
                })
              }
              options={(
                Object.entries(EDUCATION_STATUS_LABELS) as [
                  MiniWebsiteEducationStatus,
                  string,
                ][]
              ).map(([value, label]) => ({ value, label }))}
              triggerClassName="h-11"
              labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
            />
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                نمرە
              </span>
              <input
                value={entry.grade}
                onChange={(event) =>
                  patchAt(index, { grade: event.target.value })
                }
                maxLength={120}
                placeholder="ئارەزوومەندانە"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                دەستپێک
              </span>
              <input
                required
                value={entry.startYear}
                onChange={(event) =>
                  patchAt(index, { startYear: event.target.value })
                }
                maxLength={40}
                placeholder="2021"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                کۆتایی
              </span>
              <input
                required={entry.status === "graduated"}
                value={entry.status === "studying" ? "ئێستا" : entry.endYear}
                onChange={(event) =>
                  patchAt(index, { endYear: event.target.value })
                }
                disabled={entry.status === "studying"}
                maxLength={40}
                placeholder="2025"
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
            value={entry.description}
            onChange={(event) =>
              patchAt(index, { description: event.target.value })
            }
            maxLength={2000}
            placeholder="چالاکی، خەڵات، توێژینەوە یان وردەکارییەکی کورت"
            className={`${textareaClass} w-full resize-y`}
            dir="auto"
          />
          </label>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              لینکی پشتڕاستکردن
            </span>
            <input
              value={entry.verificationUrl}
              onChange={(event) =>
                patchAt(index, { verificationUrl: event.target.value })
              }
              maxLength={2048}
              placeholder="https://..."
              className={inputClass}
              dir="ltr"
            />
          </label>

          <MediaUpload
            label="لۆگۆی دامەزراوە"
            wide
            value={entry.image ? [entry.image] : []}
            onChange={(value) => patchAt(index, { image: value[0] ?? "" })}
          />

          {errors[`education.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`education.${index}`]}
            </p>
          )}
        </div>
      ))}

      {entries.length < MINI_WEBSITE_MAX_EDUCATION_ENTRIES && (
        <button
          type="button"
          onClick={() => setEntries([...entries, createMiniWebsiteEducation()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          زیادکردنی خوێندن
        </button>
      )}

      {!entries.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <GraduationCap className="h-4 w-4 shrink-0" />
          یەکەم قوتابخانە، زانکۆ، بڕوانامە یان خوێندنی ئێستا زیاد بکە.
        </div>
      )}
    </div>
  );
}
