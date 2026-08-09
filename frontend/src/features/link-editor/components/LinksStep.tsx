"use client";

import { memo, useMemo, useCallback, useState } from "react";
import Image from "next/image";
import { Trash2, Plus, ChevronUp, ChevronDown, Palette } from "lucide-react";
import { SOCIAL_PLATFORMS, getPlatformNameKurdish } from "../modal-constants";
import { IconPicker } from "@/components/ui/IconPicker";
import { CUSTOM_ICONS_MAP } from "@/lib/config/icons";
import { ColorGradientModal } from "../ColorGradientModal";
import { modalInputClass } from "../modal-input-styles";
import { StandardPlatformInput } from "./StandardPlatformInput";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { RequiredMark } from "@/components/shared/RequiredMark";
import React from "react";
import type { SocialLink } from "@/features/link-editor/types";
import { parseUploadedIconValue } from "@/features/link-editor/custom-icon-value";
import { PlatformIcon } from "@/lib/brand/PlatformVisuals";
import { markFillsChip } from "@/lib/brand/platform-brands";

interface LinkItemProps {
  linkId: string;
  platform: typeof SOCIAL_PLATFORMS[0];
  isGps: boolean;
  currentValue: string;
  countryCode?: string;
  displayName?: string;
  customColor?: string;
  customIcon?: string;
  error?: string;
  onUpdate: (id: string, value: string) => void;
  onUpdateCountryCode: (id: string, countryCode: string) => void;
  onUpdateDisplayName: (id: string, displayName: string) => void;
  onUpdateCustomColor: (id: string, customColor: string) => void;
  onUpdateCustomIcon: (id: string, customIcon: string) => void;
  onRemove: (id: string) => void;
  onAdd: (platformId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onBlurLink: (id: string) => void;
  iconUploadUrl?: string;
}

const LinkItem = memo(function LinkItem({
  linkId,
  platform,
  isGps,
  currentValue,
  countryCode,
  displayName,
  customColor,
  customIcon,
  error,
  onUpdate,
  onUpdateCountryCode,
  onUpdateDisplayName,
  onUpdateCustomColor,
  onUpdateCustomIcon,
  onRemove,
  onAdd,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onBlurLink,
  iconUploadUrl,
}: LinkItemProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const uploadedIcon = parseUploadedIconValue(customIcon);
  const colorDisabled = uploadedIcon?.hasBackground === true;
  const marksOwnChip =
    markFillsChip(platform.id, customColor) && !uploadedIcon && !customIcon;

  // Memoize handlers to prevent re-renders
  const handleUpdate = useCallback((value: string) => {
    onUpdate(linkId, value);
  }, [linkId, onUpdate]);

  const handleCountryCodeChange = useCallback((code: string) => {
    onUpdateCountryCode(linkId, code);
  }, [linkId, onUpdateCountryCode]);

  const handleDisplayNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateDisplayName(linkId, e.target.value);
  }, [linkId, onUpdateDisplayName]);

  const handleToggleDisplayName = useCallback(() => {
    const kurdishName = getPlatformNameKurdish(platform.id);
    const englishName = platform.name;
    const currentName = (displayName || "").trim();
    const nextName = currentName === kurdishName ? englishName : kurdishName;
    onUpdateDisplayName(linkId, nextName);
  }, [linkId, platform.id, platform.name, displayName, onUpdateDisplayName]);

  const handleCustomColorChange = useCallback((value: string) => {
    onUpdateCustomColor(linkId, value);
  }, [linkId, onUpdateCustomColor]);

  const handleRemove = useCallback(() => {
    onRemove(linkId);
  }, [linkId, onRemove]);

  const handleAdd = useCallback(() => {
    onAdd(platform.id);
  }, [platform.id, onAdd]);

  const handleBlur = useCallback(() => {
    onBlurLink(linkId);
  }, [linkId, onBlurLink]);

  return (
    <div
      className="flex flex-col gap-3 rounded-lg sm:rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 flex-1">
          {/* Move Up/Down Buttons */}
          <div className="flex flex-col gap-1">
            <IconActionButton
              onClick={onMoveUp}
              disabled={!canMoveUp}
              label="بەرزکردنەوە"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </IconActionButton>
            <IconActionButton
              onClick={onMoveDown}
              disabled={!canMoveDown}
              label="نزمکردنەوە"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </IconActionButton>
          </div>
          <label className="block text-xs sm:text-sm font-medium text-gray-900 select-none flex-1">
            {platform.name}
            <RequiredMark />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <IconActionButton
            onClick={handleRemove}
            tone="danger"
            label={`سڕینەوەی ${platform.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconActionButton>
          {!isGps && (
            <IconActionButton
              onClick={handleAdd}
              label={`زیادکردنی لینکی تر بۆ ${platform.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </IconActionButton>
          )}
        </div>
      </div>
      
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 flex items-start gap-2   duration-200">
          <p className="text-xs text-red-600 font-medium font-kurdish leading-relaxed">{error}</p>
        </div>
      )}
      
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        {/* Custom Color Background overlay or just static icon container */}
        <IconPicker
          value={customIcon || ""}
          onChange={(icon) => onUpdateCustomIcon(linkId, icon)}
          uploadUrl={iconUploadUrl}
          customTrigger={
            <div
              // A full-color mark is the whole chip, so it loses the padding and
              // fills the box instead of floating inside it.
              className={`${marksOwnChip ? "h-8 w-8 sm:h-11 sm:w-11 md:h-14 md:w-14" : "p-2 sm:p-3 md:p-4"} rounded-lg sm:rounded-xl shrink-0 relative overflow-hidden`}
              style={
                colorDisabled
                  ? undefined
                  : customColor
                    ? { background: customColor }
                    : { background: 'var(--tw-gradient-from)' }
              }
            >
              {/* We apply the custom color as plain background style, or default to gradients */}
              {!colorDisabled && !customColor && (
                <div className="absolute inset-0" style={{ background: platform.background }} />
              )}
              {/* If customIcon is provided, render it instead of the default icon */}
              {uploadedIcon ? (
                <Image
                  src={uploadedIcon.url}
                  alt=""
                  width={48}
                  height={48}
                  className={
                    uploadedIcon.hasBackground
                      ? "absolute inset-0 z-10 h-full w-full object-cover"
                      : "relative z-10 h-4 w-4 object-contain sm:h-5 sm:w-5 md:h-6 md:w-6"
                  }
                  unoptimized
                />
              ) : customIcon && CUSTOM_ICONS_MAP[customIcon] ? (
                React.createElement(CUSTOM_ICONS_MAP[customIcon], { className: "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white relative z-10" })
              ) : (
                <PlatformIcon
                  platform={platform.id}
                  customColor={customColor}
                  className={
                    marksOwnChip
                      ? "relative z-10 h-full w-full"
                      : "relative z-10 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"
                  }
                />
              )}
            </div>
          }
        />
        <div className="flex flex-col gap-2 flex-1 w-full">
          {/* URL/Phone Input Row */}
          <div className="w-full">
            <StandardPlatformInput
              platform={platform.id}
              value={currentValue}
              onChange={handleUpdate}
              countryCode={countryCode || "964"}
              onCountryCodeChange={handleCountryCodeChange}
              error={error}
              onBlur={handleBlur}
            />
          </div>
          
          {/* Display Name and Color Customization Input Row */}
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsColorPickerOpen(true)}
              disabled={colorDisabled}
              className="relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:h-12 overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl border border-gray-300 bg-white shadow-sm transition-all duration-200 cursor-pointer group hover:border-gray-400 focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-[#161B22] dark:hover:border-white/20"
              title={colorDisabled ? "ئەم وێنەیە پاشبنەمای خۆی هەیە" : "ڕەنگی دوگمە"}
            >
              {!colorDisabled && customColor ? (
                <span className="absolute inset-0" style={{ background: customColor }} />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-500 transition-colors group-hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:group-hover:bg-white/10">
                  <Palette className="h-4 w-4" />
                </span>
              )}
            </button>
            <ColorGradientModal
              isOpen={isColorPickerOpen}
              value={customColor || "#000000"}
              onChange={handleCustomColorChange}
              onClose={() => setIsColorPickerOpen(false)}
              solidFallback="#000000"
              gradientFallback="#0066ff"
            />
            <input
              type="text"
              value={displayName || ""}
              onChange={handleDisplayNameChange}
              placeholder="ئەگەر بەتاڵ بێت ناوی ئینگلیزی بەکاردێت"
              className={modalInputClass(!!error, "flex-1 md:rounded-2xl md:px-5 md:py-3.5 text-xs sm:text-sm md:text-base font-kurdish")}
            />
            <button
              type="button"
              onClick={handleToggleDisplayName}
              className="shrink-0 px-2 sm:px-3 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl md:rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors text-xs sm:text-sm md:text-base font-kurdish"
              title="Kurdish/English"
            >
              {((displayName || "").trim() === getPlatformNameKurdish(platform.id)) ? "English" : "کوردی"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

interface LinksStepProps {
  selectedPlatforms: string[];
  socialLinks: SocialLink[];
  linkErrors: Record<string, string>;
  error?: string;
  touched?: boolean;
  onUpdateLink: (id: string, value: string) => void;
  onUpdateCountryCode: (id: string, countryCode: string) => void;
  onUpdateDisplayName: (id: string, displayName: string) => void;
  onUpdateCustomColor: (id: string, customColor: string) => void;
  onUpdateCustomIcon: (id: string, customIcon: string) => void;
  onRemoveLink: (id: string) => void;
  onAddPlatformInstance: (platformId: string) => void;
  onMoveLink: (linkId: string, direction: 'up' | 'down') => void;
  onBlurLink: (id: string) => void;
  iconUploadUrl?: string;
}

export const LinksStep = memo(function LinksStep({
  selectedPlatforms,
  socialLinks,
  linkErrors,
  error,
  touched,
  onUpdateLink,
  onUpdateCountryCode,
  onUpdateDisplayName,
  onUpdateCustomColor,
  onUpdateCustomIcon,
  onRemoveLink,
  onAddPlatformInstance,
  onMoveLink,
  onBlurLink,
  iconUploadUrl,
}: LinksStepProps) {
  // Create lookup maps for O(1) access
  const linksMap = useMemo(() => {
    return new Map(socialLinks.map(link => [link.id, link]));
  }, [socialLinks]);

  const platformsMap = useMemo(() => {
    return new Map(SOCIAL_PLATFORMS.map(platform => [platform.id, platform]));
  }, []);

  const sortedLinks = useMemo(() => {
    return selectedPlatforms
      .map(linkId => {
        const link = linksMap.get(linkId);
        if (!link) return null;
        const platform = platformsMap.get(link.platform);
        if (!platform) return null;
        return { linkId, platform, link };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        if (a.platform.id === "gps") return 1;
        if (b.platform.id === "gps") return -1;
        return (a.link.order ?? 0) - (b.link.order ?? 0);
      });
  }, [selectedPlatforms, linksMap, platformsMap]);

  if (sortedLinks.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-center text-xs sm:text-sm text-gray-600 py-8">
          هیچ پلاتفۆڕمەکانێک هەڵنەبژێردراوە
        </p>
        {error && touched && (
          <p className="text-xs text-red-600 text-center font-kurdish">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-600 sm:text-sm">
          لینک بۆ پلاتفۆڕمە هەڵبژێردراوەکان زیاد بکە
        </p>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {sortedLinks.length} لینک
        </span>
      </div>
      
      <div className="space-y-2 sm:space-y-3">
        {sortedLinks.map(({ linkId, platform, link }, index) => {
          if (!platform || !link) return null;
          const isGps = platform.id === "gps";
          const currentValue = link.value || "";
          const linkError = linkErrors[linkId];
          const nextIsGps = sortedLinks[index + 1]?.platform.id === "gps";

          return (
            <LinkItem
              key={linkId}
              linkId={linkId}
              platform={platform}
              isGps={isGps}
              currentValue={currentValue}
              countryCode={link.countryCode || "964"}
              displayName={link.displayName}
              customColor={link.customColor}
              customIcon={link.customIcon}
              error={linkError}
              onUpdate={onUpdateLink}
              onUpdateCountryCode={onUpdateCountryCode}
              onUpdateDisplayName={onUpdateDisplayName}
              onUpdateCustomColor={onUpdateCustomColor}
              onUpdateCustomIcon={onUpdateCustomIcon}
              onRemove={onRemoveLink}
              onAdd={onAddPlatformInstance}
              onMoveUp={() => onMoveLink(linkId, 'up')}
              onMoveDown={() => onMoveLink(linkId, 'down')}
              canMoveUp={!isGps && index > 0}
              canMoveDown={!isGps && index < sortedLinks.length - 1 && !nextIsGps}
              onBlurLink={onBlurLink}
              iconUploadUrl={iconUploadUrl}
            />
          );
        })}
      </div>
      
      {error && touched && (
        <p className="text-xs text-red-600 mt-2 text-center font-kurdish">{error}</p>
      )}
    </div>
  );
});
