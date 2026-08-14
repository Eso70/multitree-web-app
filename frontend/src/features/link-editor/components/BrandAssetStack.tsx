"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import {
  AVATAR_ACCEPT,
  BUSINESS_FAVICON_PLACEHOLDER,
  BUSINESS_LOGO_PLACEHOLDER,
  DEFAULT_AVATAR,
  FAVICON_ACCEPT,
  LOGO_ACCEPT,
} from "@/lib/brand/brand-assets";
import { BrandAssetTile } from "./BrandAssetTile";

interface BrandAssetStackProps {
  logo: string | null;
  favicon: string | null;
  defaultAvatar: string | null;
  websiteColor: string;
  onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFaviconChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDefaultAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onChooseColor: () => void;
  /**
   * Locks the favicon and avatar tiles behind a lock badge. Used where those
   * two are derived automatically — the favicon from the uploaded logo, the
   * avatar from the platform default — so the logo is the only upload asked
   * for. Opening a lock restores that tile's own picker for the rest of the
   * session.
   */
  lockedAssets?: boolean;
}

export function BrandAssetStack({
  logo,
  favicon,
  defaultAvatar,
  websiteColor,
  onLogoChange,
  onFaviconChange,
  onDefaultAvatarChange,
  onChooseColor,
  lockedAssets = false,
}: BrandAssetStackProps) {
  const [faviconUnlocked, setFaviconUnlocked] = useState(false);
  const [avatarUnlocked, setAvatarUnlocked] = useState(false);
  const logoSource = logo || BUSINESS_LOGO_PLACEHOLDER;

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative flex w-full max-w-sm flex-col items-center">
        <div
          className="relative h-44 w-72 sm:h-48 sm:w-80"
          aria-label="Brand image stack"
        >
          <BrandAssetTile
            src={defaultAvatar || DEFAULT_AVATAR}
            alt="Default avatar"
            caption="ئەڤاتار"
            captionClassName="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white"
            accept={AVATAR_ACCEPT}
            inputLabel="Upload default avatar"
            onChange={onDefaultAvatarChange}
            className="group absolute left-5 top-7 z-30 h-24 w-24 rotate-[-8deg] cursor-pointer overflow-hidden rounded-full border-4 border-white bg-white shadow-xl ring-1 ring-gray-200 transition hover:rotate-0 hover:scale-105 dark:border-[#161b22] dark:bg-[#161b22] dark:ring-white/10"
            imageClassName="h-full w-full object-cover"
            iconClassName="h-5 w-5"
            width={112}
            height={112}
            locked={lockedAssets && !avatarUnlocked}
            onUnlock={() => setAvatarUnlocked(true)}
            unlockLabel="Unlock default avatar"
          />

          <BrandAssetTile
            src={favicon || BUSINESS_FAVICON_PLACEHOLDER}
            alt="Favicon"
            caption="فایڤ"
            captionClassName="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-medium text-white"
            accept={FAVICON_ACCEPT}
            inputLabel="Upload favicon"
            onChange={onFaviconChange}
            className="group absolute right-6 top-4 z-30 h-20 w-20 rotate-[10deg] cursor-pointer overflow-hidden rounded-2xl border-4 border-white bg-white p-2 shadow-lg ring-1 ring-gray-200 transition hover:rotate-0 hover:scale-105 dark:border-[#161b22] dark:bg-[#161b22] dark:ring-white/10"
            imageClassName="h-full w-full object-contain"
            iconClassName="h-4 w-4"
            width={96}
            height={96}
            locked={lockedAssets && !faviconUnlocked}
            onUnlock={() => setFaviconUnlocked(true)}
            unlockLabel="Unlock favicon"
          />

          <BrandAssetTile
            src={logoSource}
            alt="Logo"
            caption="لۆگۆ"
            captionClassName="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold text-white"
            accept={LOGO_ACCEPT}
            inputLabel="Upload logo"
            onChange={onLogoChange}
            className="group absolute left-1/2 top-12 z-20 h-32 w-32 -translate-x-1/2 cursor-pointer overflow-hidden rounded-3xl border-4 border-white bg-white p-3 shadow-2xl ring-1 ring-gray-200 transition hover:scale-105 dark:border-[#161b22] dark:bg-[#161b22] dark:ring-white/10"
            imageClassName="h-full w-full object-contain"
            iconClassName="h-6 w-6"
            width={144}
            height={144}
            unoptimized={logoSource.startsWith("blob:")}
          />
        </div>

        <div className="-mt-2 flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-gray-500 shadow-sm dark:border-white/10 dark:bg-[#161b22]/90 dark:text-gray-300">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: websiteColor }}
          />
          <span>Logo</span>
          <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-white/20" />
          <span>Avatar</span>
          <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-white/20" />
          <span>Favicon</span>
        </div>
        <button
          type="button"
          onClick={onChooseColor}
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm"
            style={{ background: websiteColor }}
          >
            <Palette className="h-3.5 w-3.5" />
          </span>
          ڕەنگی وێبسایت
        </button>
      </div>
    </div>
  );
}
