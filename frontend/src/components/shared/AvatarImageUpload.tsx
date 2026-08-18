"use client";

import Image from "next/image";
import { Upload, X } from "lucide-react";
import { DEFAULT_AVATAR } from "@/lib/brand/brand-assets";

interface AvatarImageUploadProps {
  imageUrl?: string | null;
  alt?: string;
  fallbackSrc?: string;
  sizeClass?: string;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadClick?: () => void;
  onRemove?: () => void;
  hideRemove?: boolean;
  error?: string;
  uploadLabel?: string;
}

/**
 * Circular profile-image upload shared by the linktree editor's first step and
 * the advertising testimonials modal. Clicking the avatar or the full-width
 * button opens the picker; the remove badge only appears for a non-default image.
 */
export function AvatarImageUpload({
  imageUrl,
  alt = "Profile preview",
  fallbackSrc = DEFAULT_AVATAR,
  sizeClass = "h-32 w-32",
  fileInputRef,
  onFileChange,
  onUploadClick,
  onRemove,
  hideRemove = false,
  error,
  uploadLabel = "وێنەی پڕۆفایل هەڵبژێرە",
}: AvatarImageUploadProps) {
  const showRemove = !onUploadClick && !hideRemove && !!imageUrl && imageUrl !== fallbackSrc;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {onUploadClick ? (
          <button
            type="button"
            onClick={onUploadClick}
            className={`relative ${sizeClass} block overflow-hidden rounded-full border-2 border-gray-300 bg-white shadow-md cursor-pointer transition-all duration-200 group hover:scale-105 hover:border-gray-400`}
          >
            <Image
              src={imageUrl || fallbackSrc}
              alt={alt}
              width={128}
              height={128}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Upload className="h-8 w-8 text-white" />
            </div>
          </button>
        ) : (
          <label className={`relative ${sizeClass} block overflow-hidden rounded-full border-2 border-gray-300 bg-white shadow-md cursor-pointer transition-all duration-200 group hover:scale-105 hover:border-gray-400`}>
            <Image
              src={imageUrl || fallbackSrc}
              alt={alt}
              width={128}
              height={128}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        )}
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-red-600"
            aria-label="Remove image"
            title="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="text-center font-kurdish text-xs text-red-500">{error}</p>}
      {onUploadClick ? (
        <button
          type="button"
          onClick={onUploadClick}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          <span>{uploadLabel}</span>
        </button>
      ) : (
        <label
          className="group relative flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95"
        >
          <Upload className="h-4 w-4" />
          <span>{uploadLabel}</span>
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      )}
    </div>
  );
}
