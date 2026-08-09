"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  MINI_WEBSITE_MAX_STORIES,
  createMiniWebsiteStory,
  type MiniWebsiteStory,
  type MiniWebsiteStoryMediaType,
  type MiniWebsiteStoryPlatform,
} from "@linktree/types";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MediaUpload } from "./MiniWebsiteContentStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const platformOptions: Array<{ value: MiniWebsiteStoryPlatform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "facebook", label: "Facebook" },
  { value: "snapchat", label: "Snapchat" },
  { value: "tiktok", label: "TikTok" },
  { value: "other", label: "پلاتفۆڕمێکی تر" },
];
const mediaOptions: Array<{ value: MiniWebsiteStoryMediaType; label: string }> = [
  { value: "image", label: "ستۆری وێنە" },
  { value: "video", label: "ستۆری ڤیدیۆ" },
];

export function MiniWebsiteStoryFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const stories = draft.stories;
  const setStories = (next: MiniWebsiteStory[]) =>
    onChange({ ...draft, stories: next });
  const patchAt = (index: number, patch: Partial<MiniWebsiteStory>) =>
    setStories(
      stories.map((story, storyIndex) =>
        storyIndex === index ? { ...story, ...patch } : story,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stories.length) return;
    const next = [...stories];
    [next[index], next[target]] = [next[target], next[index]];
    setStories(next);
  };

  return (
    <div className="space-y-4">
      {errors.stories && (
        <p className="text-[11px] font-bold text-red-500">{errors.stories}</p>
      )}
      {stories.map((story, index) => (
        <div key={story.id} className="mini-website-editor-item space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-[11px] font-black text-slate-400">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-xs font-black text-slate-600 dark:text-slate-300">
              ستۆریی سۆشیال میدیا
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              <IconActionButton label="بردنە سەرەوە" disabled={index === 0} onClick={() => move(index, -1)}>
                <ChevronUp className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton label="بردنە خوارەوە" disabled={index === stories.length - 1} onClick={() => move(index, 1)}>
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton label="سڕینەوەی ستۆری" tone="danger" onClick={() => setStories(stories.filter((_, storyIndex) => storyIndex !== index))}>
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CustomSelect
              label="پلاتفۆڕم"
              required
              showRequirement
              value={story.platform}
              options={platformOptions}
              onChange={(platform) => patchAt(index, { platform })}
              triggerClassName="h-11 rounded-xl"
            />
            <CustomSelect
              label="جۆری ستۆری"
              required
              showRequirement
              value={story.mediaType}
              options={mediaOptions}
              onChange={(mediaType) =>
                patchAt(index, {
                  mediaType,
                  ...(mediaType === "image" ? { url: "" } : { image: "" }),
                })
              }
              triggerClassName="h-11 rounded-xl"
            />
          </div>

          <label>
            <MiniWebsiteFieldLabel className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              ناونیشان
            </MiniWebsiteFieldLabel>
            <input
              value={story.title}
              maxLength={120}
              onChange={(event) => patchAt(index, { title: event.target.value })}
              placeholder="بۆ نموونە: نوێترین کارمان"
              className={inputClass}
              dir="auto"
            />
          </label>

          {story.mediaType === "image" ? (
            <MediaUpload
              label="وێنەی ستۆری"
              required
              wide
              value={story.image ? [story.image] : []}
              onChange={(images) => patchAt(index, { image: images[0] || "" })}
            />
          ) : (
            <label>
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                لینکی ڤیدیۆی ستۆری
              </MiniWebsiteFieldLabel>
              <input
                value={story.url}
                maxLength={2048}
                onChange={(event) => patchAt(index, { url: event.target.value })}
                placeholder="https://instagram.com/stories/... یان لینکی ڤیدیۆ"
                className={inputClass}
                dir="ltr"
              />
            </label>
          )}

          {errors[`story.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`story.${index}`]}
            </p>
          )}
        </div>
      ))}

      {stories.length < MINI_WEBSITE_MAX_STORIES && (
        <button
          type="button"
          onClick={() => setStories([...stories, createMiniWebsiteStory()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {stories.length ? "ستۆرییەکی تر" : "زیادکردنی ستۆری"}
        </button>
      )}
    </div>
  );
}
