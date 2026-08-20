"use client";

import Image from "next/image";
import { useState } from "react";
import { MotionPulseIcon } from "@/components/motion/MotionPrimitives";
import { ImagePlus, Images, Palette, Trash2, Video } from "lucide-react";
import { type MiniWebsiteContent, type MiniWebsiteDraft } from "./types";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import { MiniWebsiteBackgroundStyleField } from "./MiniWebsiteBackgroundStyleField";
import { ColorGradientField } from "@/features/link-editor/ColorGradientField";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { InlineRequestError } from "@/components/shared/InlineRequestError";
import {
  createUploadFailureError,
  inlineRequestErrorFromResponse,
  type InlineRequestErrorData,
  validateUploadFile,
} from "@/lib/api/inline-request-error";
import { enqueueImageUpload } from "@/lib/api/enqueue-image-upload";
import { useMiniWebsiteWorkspace } from "./workspace-config";

const inputClass = modalInputClass(false, "h-11 py-0");

export function MiniWebsiteHeroMediaFields({
  draft,
  onChange,
  defaultAvatar,
  avatarError,
  bannerError,
  accentError,
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  defaultAvatar: string;
  avatarError?: string;
  bannerError?: string;
  accentError?: string;
}) {
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [paletteModalOpen, setPaletteModalOpen] = useState(false);
  const setContent = <K extends keyof MiniWebsiteContent>(
    key: K,
    value: MiniWebsiteContent[K],
  ) =>
    onChange({
      ...draft,
      content: { ...draft.content, [key]: value },
    });

  return (
    <div className="border-b border-slate-100 pb-5 dark:border-white/5">
      <div className="space-y-5">
        <div>
          <MiniWebsiteFieldLabel
            required
            className="mb-2 block text-center text-[11px] font-black text-slate-600 dark:text-slate-300"
          >
            وێنەی پڕۆفایل
          </MiniWebsiteFieldLabel>
          <MediaUpload
            label="وێنەی پڕۆفایل هەڵبژێرە"
            value={draft.avatar ? [draft.avatar] : []}
            onChange={(items) =>
              onChange({
                ...draft,
                avatar: items[0] || defaultAvatar,
              })
            }
            defaultValue={defaultAvatar}
            profile
          />
          {avatarError && (
            <div className="text-center">
              <MediaFieldError message={avatarError} />
            </div>
          )}
        </div>
        <div>
          <div className="mb-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200">
              جۆری بانەر{" "}
              <span style={{ color: "var(--theme-primary, #64748b)" }}>*</span>
            </h3>
            <p className="mt-1 text-[10px] text-slate-400">
              وێنە، ڕەنگ یان ڤیدیۆ هەڵبژێرە.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <BannerChoice
              icon={Images}
              label="وێنەی بانەر"
              selected={draft.content.heroBackgroundType === "image"}
              onClick={() => setContent("heroBackgroundType", "image")}
            />
            <BannerChoice
              icon={Palette}
              label="ڕەنگی بانەر"
              selected={draft.content.heroBackgroundType === "color"}
              onClick={() => setContent("heroBackgroundType", "color")}
            />
            <BannerChoice
              icon={Video}
              label="ڤیدیۆی بانەر"
              selected={draft.content.heroBackgroundType === "video"}
              onClick={() => setContent("heroBackgroundType", "video")}
            />
          </div>
        </div>
        {draft.content.heroBackgroundType === "image" && (
          <div>
            <MediaUpload
              label="وێنەی بانەر"
              required
              value={draft.cover ? [draft.cover] : []}
              onChange={(items) =>
                onChange({ ...draft, cover: items[0] || null })
              }
              wide
            />
            {bannerError && <MediaFieldError message={bannerError} />}
          </div>
        )}
        <div
          className={
            draft.content.heroBackgroundType === "color"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-3"
              : "grid grid-cols-1 gap-3 sm:grid-cols-2"
          }
        >
          {draft.content.heroBackgroundType === "color" && (
            <Field label="ڕەنگی بانەر" required>
              <ColorGradientField
                isOpen={colorModalOpen}
                value={draft.content.heroBackgroundColor}
                onChange={(value) => setContent("heroBackgroundColor", value)}
                onOpen={() => setColorModalOpen(true)}
                onClose={() => setColorModalOpen(false)}
                solidFallback="#334155"
                gradientFallback="#64748b"
                title="ڕەنگی بانەر"
                subtitle="ڕەنگی تاک یان گرادیێنت بۆ بانەر هەڵبژێرە"
                error={bannerError}
              />
            </Field>
          )}
          <Field label="ڕەنگی سەرەکی مینی وێبسایت" required>
            <ColorGradientField
              isOpen={paletteModalOpen}
              value={draft.accentColor}
              onChange={(accentColor) => onChange({ ...draft, accentColor })}
              onOpen={() => setPaletteModalOpen(true)}
              onClose={() => setPaletteModalOpen(false)}
              solidFallback="#64748b"
              gradientFallback="#8b5cf6"
              title="ڕەنگی سەرەکی مینی وێبسایت"
              subtitle="ڕەنگی تاک یان گرادیێنت بۆ مینی وێبسایت هەڵبژێرە"
              error={accentError}
            />
          </Field>
          <Field label="شێوازی پاشبنەما">
            <MiniWebsiteBackgroundStyleField
              onChange={(backgroundStyle) =>
                onChange({ ...draft, backgroundStyle })
              }
              value={draft.backgroundStyle}
            />
          </Field>
        </div>
        {draft.content.heroBackgroundType === "video" && (
          <Field
            label="لینکی ڤیدیۆی بانەر"
            required
            hint="YouTube، Vimeo یان لینکی ڤیدیۆ"
          >
            <VideoUrlInput
              value={draft.content.heroYoutubeUrl}
              onChange={(value) => setContent("heroYoutubeUrl", value)}
            />
            {bannerError && <MediaFieldError message={bannerError} />}
          </Field>
        )}
      </div>
    </div>
  );
}

function MediaFieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 text-[10px] font-semibold leading-4 text-rose-500">
      {message}
    </p>
  );
}

function BannerChoice({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: typeof Images;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center gap-3 rounded-xl border px-3 text-left text-[11px] font-bold transition ${selected ? "shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-[var(--theme-primary)] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}
      style={
        selected
          ? {
              borderColor: "var(--theme-primary, #64748b)",
              background:
                "color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)",
              color: "var(--theme-primary, #64748b)",
            }
          : undefined
      }
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={
          selected
            ? {
                background:
                  "color-mix(in srgb, var(--theme-primary, #64748b) 16%, transparent)",
              }
            : undefined
        }
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>{label}</span>
    </button>
  );
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">
        <MiniWebsiteFieldLabel required={required}>
          {label}
        </MiniWebsiteFieldLabel>
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function VideoUrlInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  let valid = false;
  try {
    const url = new URL(value);
    valid = url.protocol === "http:" || url.protocol === "https:";
  } catch {
    valid = false;
  }
  const showError = touched && !valid;
  return (
    <>
      <div className="relative">
        <Video
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--theme-primary, #64748b)" }}
        />
        <input
          type="url"
          dir="ltr"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setTouched(true)}
          className={`${inputClass} text-left ${showError ? "border-rose-300 bg-rose-50/40 focus:ring-rose-200 dark:border-rose-500/40 dark:bg-rose-500/10" : ""}`}
          style={{ paddingLeft: "3rem" }}
          placeholder="https://youtube.com/watch?v=..."
          aria-invalid={showError}
        />
      </div>
      {showError && (
        <p className="mt-1.5 text-[10px] font-semibold text-rose-500">
          لینکی ڤیدیۆیەکی دروست بنووسە.
        </p>
      )}
    </>
  );
}

export function MediaUpload({
  label,
  value,
  onChange,
  multiple = false,
  wide = false,
  profile = false,
  required = false,
  defaultValue = "/images/DefaultAvatar.png",
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  wide?: boolean;
  profile?: boolean;
  required?: boolean;
  defaultValue?: string;
}) {
  const { api } = useMiniWebsiteWorkspace();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<InlineRequestErrorData | null>(null);
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files);
    const validationError = accepted
      .map((file) =>
        validateUploadFile(file, {
          allowedMimeTypes: ["image/png", "image/jpeg"],
          maxBytes: 5 * 1024 * 1024,
        }),
      )
      .find((item) => item !== null);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of accepted) {
        const url = await enqueueImageUpload(async () => {
          const form = new FormData();
          form.append("file", file);
          const response = await fetch(api.uploadImage, {
            method: "POST",
            body: form,
            credentials: "include",
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            setError(inlineRequestErrorFromResponse(response));
            return null;
          }
          const fileUrl = payload?.data?.url || payload?.url;
          if (typeof fileUrl !== "string")
            throw new Error("Upload URL is missing");
          return fileUrl;
        });
        if (url === null) return;
        uploaded.push(url);
      }
      onChange(
        multiple ? [...value, ...uploaded].slice(0, 8) : uploaded.slice(0, 1),
      );
    } catch {
      setError(createUploadFailureError());
    } finally {
      setUploading(false);
    }
  };
  if (profile) {
    const preview = value[0] || defaultValue;
    const usingDefault = preview === defaultValue;
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <label
            className={`group relative block h-32 w-32 overflow-hidden rounded-full border-2 bg-white shadow-md transition duration-200 hover:scale-105 ${uploading ? "cursor-wait opacity-60" : "cursor-pointer hover:border-[var(--theme-primary)]"} ${value.length ? "border-slate-300" : "border-dashed border-slate-300"}`}
          >
            <Image
              src={preview}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus className="h-8 w-8 text-white" />
            </span>
            <input
              disabled={uploading}
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              onChange={(event) => void addFiles(event.target.files)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          {value.length > 0 && !usingDefault && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition hover:scale-110 hover:bg-rose-600"
              aria-label="گەڕانەوە بۆ وێنەی بنەڕەتی"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <label
          className={`relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-medium text-white shadow-md transition hover:opacity-90 hover:shadow-lg ${uploading ? "pointer-events-none opacity-60" : ""}`}
          style={{ background: "var(--theme-css, #64748b)" }}
        >
          <ImagePlus className="h-4 w-4" />
          <span>{uploading ? "بارکردن..." : label}</span>
          <input
            disabled={uploading}
            type="file"
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            onChange={(event) => void addFiles(event.target.files)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        {error && <InlineRequestError className="w-full" error={error} />}
      </div>
    );
  }
  return (
    <div>
      <MiniWebsiteFieldLabel
        required={required}
        className="mb-1.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400"
      >
        {label}
      </MiniWebsiteFieldLabel>
      <div className={`grid gap-2 ${wide ? "grid-cols-1" : "grid-cols-3"}`}>
        {value.map((src, index) => (
          <div
            key={`${src.slice(0, 24)}-${index}`}
            className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 ${wide ? "aspect-[3/1]" : "aspect-square"}`}
          >
            <Image
              src={src}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() =>
                onChange(value.filter((_, itemIndex) => itemIndex !== index))
              }
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-rose-500 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
              aria-label="سڕینەوەی وێنە"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {(multiple || value.length === 0) && (
          <label
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center transition dark:border-white/15 dark:bg-white/[0.025] ${wide ? "min-h-32" : "aspect-square"} ${uploading ? "cursor-wait opacity-60" : "cursor-pointer hover:border-[var(--theme-primary)] hover:bg-white dark:hover:bg-white/5"}`}
          >
            <MotionPulseIcon active={uploading}>
              <ImagePlus className="h-5 w-5 text-slate-400" />
            </MotionPulseIcon>
            <span className="px-2 text-[9px] font-bold text-slate-400">
              {uploading ? (
                "بارکردن..."
              ) : (
                <>
                  PNG/JPG
                  <br />
                  تا 5MB
                </>
              )}
            </span>
            <input
              disabled={uploading}
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              multiple={multiple}
              onChange={(event) => void addFiles(event.target.files)}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {error && <InlineRequestError className="mt-2" error={error} />}
    </div>
  );
}
