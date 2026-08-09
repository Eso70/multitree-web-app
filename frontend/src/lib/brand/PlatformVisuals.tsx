"use client";

import Image from "next/image";
import { createElement, memo, type CSSProperties, type ReactNode } from "react";
import { CUSTOM_ICONS_MAP } from "@/lib/config/icons";
import { parseUploadedIconValue } from "@/features/link-editor/custom-icon-value";
import {
  getPlatformBrand,
  markFillsChip,
  platformBackground,
  platformBorder,
  platformIconClass,
  platformIconStyle,
  platformTextStyle,
  type PlatformIconTone,
} from "./platform-brands";

interface PlatformVisualProps {
  platform: string;
  /** Business-supplied color override. Wins over brand paint when set. */
  customColor?: string;
  /** Business-supplied icon override — an icon name or an uploaded image value. */
  customIconName?: string;
  className?: string;
}

interface PlatformIconProps extends PlatformVisualProps {
  /**
   * `brand` (default) fills the glyph with the platform's foreground, for glyphs
   * drawn on the brand background. `inherit` lets the surrounding context set
   * the fill, for templates that tint glyphs to their own palette.
   */
  tone?: PlatformIconTone;
}

/**
 * A platform's glyph, painted in its brand foreground with any keyline the brand
 * needs. Honors uploaded and hand-picked icon overrides, which are rendered as
 * chosen rather than brand-corrected.
 */
export const PlatformIcon = memo(function PlatformIcon({
  platform,
  customColor,
  customIconName,
  className = "h-6 w-6",
  tone = "brand",
}: PlatformIconProps) {
  const uploadedIcon = parseUploadedIconValue(customIconName);
  if (uploadedIcon) {
    return (
      <Image
        src={uploadedIcon.url}
        alt=""
        width={48}
        height={48}
        className={`${className} ${uploadedIcon.hasBackground ? "rounded-md object-cover" : "object-contain"}`}
        unoptimized
      />
    );
  }

  // A hand-picked icon is the business's choice, so it is drawn plainly.
  if (customIconName) {
    const PickedIcon = CUSTOM_ICONS_MAP[customIconName];
    return PickedIcon ? createElement(PickedIcon, { className }) : null;
  }

  const { icon: BrandIcon } = getPlatformBrand(platform);
  return (
    <BrandIcon
      className={`${className} ${platformIconClass(platform, customColor)}`.trim()}
      style={platformIconStyle(platform, customColor, tone)}
    />
  );
});

/**
 * A platform's glyph on its brand background — the standard round/rounded chip
 * used in link lists, social rows and the mini website.
 */
export const PlatformBadge = memo(function PlatformBadge({
  platform,
  customColor,
  customIconName,
  className = "h-10 w-10 rounded-xl",
  iconClassName = "h-5 w-5",
  style,
}: PlatformVisualProps & { iconClassName?: string; style?: CSSProperties }) {
  // A mark that carries its own backdrop is the whole badge, so it fills the
  // chip instead of floating inside an empty box. An icon override drops back
  // to the normal chip.
  const marksOwnChip = markFillsChip(platform, customColor) && !customIconName;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        background: platformBackground(platform, customColor),
        // Pure-black brands would otherwise vanish into a dark surface.
        border: marksOwnChip
          ? undefined
          : platformBorder(platform, customColor) &&
            `1px solid ${platformBorder(platform, customColor)}`,
        ...style,
      }}
    >
      <PlatformIcon
        platform={platform}
        customColor={customColor}
        customIconName={customIconName}
        className={marksOwnChip ? "h-full w-full" : iconClassName}
      />
    </span>
  );
});

/**
 * A label sitting on a platform's brand background, outlined for the brands
 * whose foreground would otherwise be unreadable (Snapchat's white on yellow).
 */
export const PlatformLabel = memo(function PlatformLabel({
  platform,
  customColor,
  className,
  style,
  children,
}: Omit<PlatformVisualProps, "customIconName"> & {
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <span className={className} style={{ ...platformTextStyle(platform, customColor), ...style }}>
      {children}
    </span>
  );
});
