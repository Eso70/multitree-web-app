"use client";

import { ChevronDown, ChevronUp, Plus, Trash2, Video } from "lucide-react";
import {
  MINI_WEBSITE_MAX_VIDEOS,
  MINI_WEBSITE_MAX_YOUTUBE_VIDEOS,
  createMiniWebsiteVideo,
  createMiniWebsiteYoutubeVideo,
  type MiniWebsiteVideo,
} from "@linktree/types";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";
import { detectVideoPlatform, VIDEO_PLATFORM_LABELS } from "./video-links";

const inputClass = modalInputClass(false, "h-11 py-0");

type VideoCollectionFieldsProps = {
  videos: MiniWebsiteVideo[];
  setVideos: (videos: MiniWebsiteVideo[]) => void;
  max: number;
  createVideo: () => MiniWebsiteVideo;
  errors: MiniWebsiteValidationErrors;
  summaryErrorKey: "videos" | "youtubeVideos";
  itemErrorPrefix: "video" | "youtubeVideo";
  youtubeOnly?: boolean;
};

export function MiniWebsiteVideoFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  return (
    <VideoCollectionFields
      videos={draft.videos}
      setVideos={(videos) => onChange({ ...draft, videos })}
      max={MINI_WEBSITE_MAX_VIDEOS}
      createVideo={createMiniWebsiteVideo}
      errors={errors}
      summaryErrorKey="videos"
      itemErrorPrefix="video"
    />
  );
}

export function MiniWebsiteYoutubeVideoFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  return (
    <VideoCollectionFields
      videos={draft.youtubeVideos}
      setVideos={(videos) =>
        onChange({
          ...draft,
          youtubeVideos: videos.map((video) => ({
            ...video,
            platform: "youtube",
          })),
        })
      }
      max={MINI_WEBSITE_MAX_YOUTUBE_VIDEOS}
      createVideo={createMiniWebsiteYoutubeVideo}
      errors={errors}
      summaryErrorKey="youtubeVideos"
      itemErrorPrefix="youtubeVideo"
      youtubeOnly
    />
  );
}

function VideoCollectionFields({
  videos,
  setVideos,
  max,
  createVideo,
  errors,
  summaryErrorKey,
  itemErrorPrefix,
  youtubeOnly = false,
}: VideoCollectionFieldsProps) {
  const patchAt = (index: number, patch: Partial<MiniWebsiteVideo>) =>
    setVideos(
      videos.map((video, videoIndex) =>
        videoIndex === index ? { ...video, ...patch } : video,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= videos.length) return;
    const next = [...videos];
    [next[index], next[target]] = [next[target], next[index]];
    setVideos(next);
  };
  const summaryError = errors[summaryErrorKey];

  return (
    <div className="space-y-4">
      {summaryError && (
        <p className="text-[11px] font-bold text-red-500">{summaryError}</p>
      )}

      {videos.map((video, index) => {
        const itemError = errors[`${itemErrorPrefix}.${index}`];
        return (
          <div key={video.id} className="mini-website-editor-item space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-[11px] font-black text-slate-400">
                {index + 1}
              </span>
              <label className="min-w-0 flex-1">
                <MiniWebsiteFieldLabel
                  required
                  className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300"
                >
                  ناونیشان
                </MiniWebsiteFieldLabel>
                <input
                  required
                  value={video.title}
                  onChange={(event) =>
                    patchAt(index, { title: event.target.value })
                  }
                  maxLength={240}
                  placeholder="ناونیشانی ڤیدیۆ"
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
                  disabled={index === videos.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </IconActionButton>
                <IconActionButton
                  label="سڕینەوە"
                  tone="danger"
                  onClick={() =>
                    setVideos(
                      videos.filter((_, videoIndex) => videoIndex !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </IconActionButton>
              </span>
            </div>

            <label>
              <span className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-black text-slate-600 dark:text-slate-300">
                <span>لینک</span>
                <span className="font-bold text-slate-400" dir="ltr">
                  {youtubeOnly
                    ? "YouTube videos only — no Shorts"
                    : VIDEO_PLATFORM_LABELS[video.platform]}
                </span>
              </span>
              <input
                required
                value={video.url}
                onChange={(event) => {
                  const url = event.target.value;
                  patchAt(index, {
                    url,
                    platform: youtubeOnly
                      ? "youtube"
                      : detectVideoPlatform(url),
                  });
                }}
                maxLength={500}
                placeholder={
                  youtubeOnly
                    ? "https://youtube.com/watch?v=..."
                    : "YouTube Shorts / TikTok / Instagram Reels"
                }
                className={inputClass}
                dir="ltr"
              />
            </label>

            {itemError && (
              <p className="text-[10px] font-bold text-red-500">{itemError}</p>
            )}
          </div>
        );
      })}

      {videos.length < max && (
        <button
          type="button"
          onClick={() => setVideos([...videos, createVideo()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {videos.length ? "ڤیدیۆیەکی تر" : "زیادکردنی ڤیدیۆ"}
        </button>
      )}

      {!videos.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Video className="h-4 w-4 shrink-0" />
          {youtubeOnly
            ? "یەکەم ڤیدیۆی YouTube زیاد بکە."
            : "یەکەم ڤیدیۆ یان ڕیل زیاد بکە."}
        </div>
      )}
    </div>
  );
}
