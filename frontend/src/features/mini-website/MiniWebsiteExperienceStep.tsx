"use client";

import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import {
  MINI_WEBSITE_MAX_EXPERIENCE_ENTRIES,
  createMiniWebsiteExperience,
  type MiniWebsiteExperience,
  type MiniWebsiteExperienceStatus,
} from "@linktree/types";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { DateInput } from "@/components/shared/DateTimeInput";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MediaUpload } from "./MiniWebsiteContentStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

export const EXPERIENCE_STATUS_LABELS: Record<
  MiniWebsiteExperienceStatus,
  string
> = {
  current: "ئێستا",
  completed: "کۆتایی هاتووە",
};

export function MiniWebsiteExperienceFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const entries = draft.experience;
  const setEntries = (experience: MiniWebsiteExperience[]) =>
    onChange({ ...draft, experience });
  const patchAt = (index: number, patch: Partial<MiniWebsiteExperience>) =>
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
      {errors.experience && (
        <p className="text-[11px] font-bold text-red-500">
          {errors.experience}
        </p>
      )}

      {entries.map((entry, index) => (
        <div key={entry.id} className="mini-website-editor-item space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
              <BriefcaseBusiness className="h-4 w-4" />
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
              <MiniWebsiteFieldLabel
                required
                className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300"
              >
                پیشە
              </MiniWebsiteFieldLabel>
              <input
                required
                value={entry.title}
                onChange={(event) =>
                  patchAt(index, { title: event.target.value })
                }
                maxLength={160}
                placeholder="ئەندازیار، پزیشک، بەڕێوەبەر..."
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <MiniWebsiteFieldLabel
                required
                className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300"
              >
                دامەزراوە
              </MiniWebsiteFieldLabel>
              <input
                required
                value={entry.organization}
                onChange={(event) =>
                  patchAt(index, { organization: event.target.value })
                }
                maxLength={240}
                placeholder="ناوی کۆمپانیا یان دامەزراوە"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <MiniWebsiteFieldLabel className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                جۆری کار
              </MiniWebsiteFieldLabel>
              <input
                value={entry.employmentType}
                onChange={(event) =>
                  patchAt(index, { employmentType: event.target.value })
                }
                maxLength={120}
                // Suggested in English because it renders as a metadata chip
                // beside the organisation, next to the English status label.
                placeholder="بۆ نموونە: تەواو، دووکەت، خاوەن..."
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <MiniWebsiteFieldLabel className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                شوێن
              </MiniWebsiteFieldLabel>
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
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <CustomSelect<MiniWebsiteExperienceStatus>
              label="دۆخ"
              required
              showRequirement
              value={entry.status}
              onChange={(status) =>
                patchAt(index, {
                  status,
                  ...(status === "current" ? { endDate: "" } : {}),
                })
              }
              options={(
                Object.entries(EXPERIENCE_STATUS_LABELS) as [
                  MiniWebsiteExperienceStatus,
                  string,
                ][]
              ).map(([value, label]) => ({ value, label }))}
              triggerClassName="h-11"
              labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
            />
            <DateInput
              label="دەستپێک"
              required
              value={entry.startDate}
              onChange={(startDate) => patchAt(index, { startDate })}
            />
            <DateInput
              label="کۆتایی"
              required={entry.status === "completed"}
              disabled={entry.status === "current"}
              min={entry.startDate || undefined}
              value={entry.endDate}
              onChange={(endDate) => patchAt(index, { endDate })}
            />
          </div>

          <label>
            <MiniWebsiteFieldLabel className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              وردەکاری
            </MiniWebsiteFieldLabel>
            <textarea
              value={entry.description}
              onChange={(event) =>
                patchAt(index, { description: event.target.value })
              }
              maxLength={2000}
              placeholder="ئەرک، بەرپرسیارێتی و دەستکەوتەکان"
              className={`${textareaClass} w-full resize-y`}
              dir="auto"
            />
          </label>

          <label>
            <MiniWebsiteFieldLabel className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              لینکی پشتڕاستکردن
            </MiniWebsiteFieldLabel>
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
            label="لۆگۆ"
            wide
            value={entry.image ? [entry.image] : []}
            onChange={(value) => patchAt(index, { image: value[0] ?? "" })}
          />

          {errors[`experience.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`experience.${index}`]}
            </p>
          )}
        </div>
      ))}

      {entries.length < MINI_WEBSITE_MAX_EXPERIENCE_ENTRIES && (
        <button
          type="button"
          onClick={() =>
            setEntries([...entries, createMiniWebsiteExperience()])
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          زیادکردنی ئەزموون
        </button>
      )}
    </div>
  );
}
