"use client";

import { ChevronDown, ChevronUp, Images, Trash2 } from "lucide-react";
import {
  MINI_WEBSITE_MAX_GALLERY_IMAGES,
  createMiniWebsiteGalleryImage,
  type MiniWebsiteGalleryImage,
} from "@linktree/types";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { MediaUpload } from "./MiniWebsiteContentStep";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");

/**
 * The gallery: photos in the order they are shown, each with an optional caption.
 *
 * Order is the whole editing model — the first photo leads the section — so the
 * list is reordered with the same up/down controls the branch cards and the link
 * rows use rather than with a drag surface only a mouse can reach.
 */
export function MiniWebsiteGalleryFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const gallery = draft.gallery;
  const room = MINI_WEBSITE_MAX_GALLERY_IMAGES - gallery.length;

  const setGallery = (next: MiniWebsiteGalleryImage[]) =>
    onChange({ ...draft, gallery: next });
  const patchAt = (index: number, patch: Partial<MiniWebsiteGalleryImage>) =>
    setGallery(
      gallery.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );

  const addImages = (urls: string[]) => {
    if (!urls.length) return;
    setGallery([
      ...gallery,
      ...urls.slice(0, room).map((url) => createMiniWebsiteGalleryImage(url)),
    ]);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= gallery.length) return;
    const next = [...gallery];
    [next[index], next[target]] = [next[target], next[index]];
    setGallery(next);
  };

  return (
    <div className="space-y-4">
      {errors.gallery && (
        <p className="text-[11px] font-bold text-red-500">{errors.gallery}</p>
      )}

      {gallery.length > 0 && (
        <div className="space-y-4">
          {gallery.map((item, index) => (
            <div
              key={item.id}
              className="mini-website-editor-item space-y-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                  <Images className="h-4 w-4" />
                </span>
                <span className="text-xs font-black text-slate-400">
                  {index + 1}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-0.5">
                  <IconActionButton
                    label="بردنە سەرەوە"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </IconActionButton>
                  <IconActionButton
                    label="بردنە خوارەوە"
                    disabled={index === gallery.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </IconActionButton>
                  <IconActionButton
                    label="سڕینەوەی وێنە"
                    tone="danger"
                    onClick={() =>
                      setGallery(
                        gallery.filter((_, entryIndex) => entryIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconActionButton>
                </span>
              </div>

              <MediaUpload
                label={`وێنەی ${index + 1}`}
                required
                wide
                value={item.image ? [item.image] : []}
                onChange={(images) =>
                  patchAt(index, { image: images[0] || "" })
                }
              />

              <label>
                <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                  ناونیشان
                </span>
                <input
                  value={item.caption}
                  onChange={(event) =>
                    patchAt(index, { caption: event.target.value })
                  }
                  maxLength={240}
                  placeholder="ناونیشانێکی کورت بۆ ئەم وێنەیە"
                  aria-label={`ناونیشانی وێنەی ${index + 1}`}
                  className={inputClass}
                  dir="auto"
                />
              </label>
            </div>
          ))}
        </div>
      )}

      {room > 0 ? (
        // Uploads land in the list rather than in the control, so the uploader
        // is always an empty "add" tile and never a second copy of the gallery.
        <MediaUpload
          label="زیادکردنی وێنە"
          value={[]}
          multiple
          wide
          onChange={addImages}
        />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          گەیشتیتە سنووری {MINI_WEBSITE_MAX_GALLERY_IMAGES} وێنە.
        </p>
      )}
    </div>
  );
}
