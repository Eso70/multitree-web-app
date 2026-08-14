"use client";

import Image from "next/image";
import { LockKeyhole, Upload } from "lucide-react";

interface BrandAssetTileProps {
  src: string;
  alt: string;
  /** Short caption printed on the tile. */
  caption: string;
  captionClassName: string;
  /** Accepted upload types, forwarded to the file input. */
  accept: string;
  /** Accessible name of the file input — specs select tiles by this. */
  inputLabel: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Positioning, shape and border for this tile's slot in the stack. */
  className: string;
  imageClassName: string;
  iconClassName: string;
  width: number;
  height: number;
  unoptimized?: boolean;
  /**
   * A locked tile is derived from another asset and takes no upload until the
   * lock is opened. Rendered as a plain element rather than a label, because a
   * label may not wrap a second interactive control.
   */
  locked?: boolean;
  onUnlock?: () => void;
  unlockLabel?: string;
}

export function BrandAssetTile({
  src,
  alt,
  caption,
  captionClassName,
  accept,
  inputLabel,
  onChange,
  className,
  imageClassName,
  iconClassName,
  width,
  height,
  unoptimized,
  locked = false,
  onUnlock,
  unlockLabel,
}: BrandAssetTileProps) {
  const image = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized={unoptimized}
      className={imageClassName}
    />
  );

  if (locked) {
    return (
      <div className={className}>
        {image}
        <button
          type="button"
          onClick={onUnlock}
          aria-label={unlockLabel}
          title={unlockLabel}
          className="absolute inset-0 flex items-center justify-center bg-white/65 text-slate-500 transition hover:bg-white/80 hover:text-slate-700 dark:bg-black/50 dark:text-slate-300 dark:hover:bg-black/60"
        >
          <LockKeyhole className={iconClassName} />
        </button>
        <span className={captionClassName}>{caption}</span>
      </div>
    );
  }

  return (
    <label className={className}>
      {image}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
        <Upload className={iconClassName} />
      </span>
      <span className={captionClassName}>{caption}</span>
      <input
        aria-label={inputLabel}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
    </label>
  );
}
