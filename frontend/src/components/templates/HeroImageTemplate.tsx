"use client";

import Image from "next/image";
import { memo, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  getPlatformIcon,
  getPlatformName,
} from "@/components/public/LinktreeButtons";
import { GpsLocationDisplay, splitGpsLinks } from "@/components/public/GpsLocationDisplay";
import type { TemplateComponentProps } from "./types";
import { Footer } from "@/components/public/Footer";
import { areTemplatePropsEqual } from "@/lib/utils/linktree-utils";
import { deriveTextColor, deriveTextSecondaryColor } from "@/lib/utils/theme-colors";
import { platformAccentColor } from "@/lib/brand/platform-brands";

// Helper to calculate brightness from hex
function getBrightness(hex: string): number {
  const rgb = hex.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!rgb) return 128;
  const r = parseInt(rgb[1], 16);
  const g = parseInt(rgb[2], 16);
  const b = parseInt(rgb[3], 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

const FALLBACK_DESCRIPTION = "بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە";

export const HeroImageTemplate = memo(function HeroImageTemplate({
  linktree,
  links,
  theme,
  onLinkClick,
}: TemplateComponentProps) {
  const { gpsLink, regularLinks } = useMemo(() => splitGpsLinks(links), [links]);
  const profileImage = useMemo(() => linktree.image || "/images/DefaultAvatar.png", [linktree.image]);
  const subtitle = useMemo(() => linktree.subtitle?.trim() || "", [linktree.subtitle]);
  const description = useMemo(() => linktree.description?.trim() || FALLBACK_DESCRIPTION, [linktree.description]);

  // Get background gradient from theme
  const backgroundStyle = useMemo(
    () => ({
      background: theme.isSolid 
        ? theme.from 
        : `linear-gradient(to bottom right, ${theme.from}, ${theme.via}, ${theme.to})`,
    }),
    [theme.from, theme.via, theme.to, theme.isSolid],
  );

  // Detect if background is white/light
  const isWhiteBackground = useMemo(() => {
    if (theme.isSolid) {
      const brightness = getBrightness(theme.from);
      return brightness > 200 || theme.from === "#ffffff" || theme.from === "#f3f4f6" || theme.from === "#e5e7eb";
    }
    // For gradients, check if any color is white/light
    const fromBrightness = getBrightness(theme.from);
    const viaBrightness = getBrightness(theme.via);
    const toBrightness = getBrightness(theme.to);
    const avgBrightness = (fromBrightness + viaBrightness + toBrightness) / 3;
    return avgBrightness > 200 || 
           theme.from.includes("fff") || theme.from.includes("f3f4f6") || theme.from.includes("e5e7eb") ||
           theme.via.includes("fff") || theme.via.includes("f3f4f6") || theme.via.includes("e5e7eb") ||
           theme.to.includes("fff") || theme.to.includes("f3f4f6") || theme.to.includes("e5e7eb");
  }, [theme.from, theme.via, theme.to, theme.isSolid]);

  // Text colors - adapt to background
  const textColor = useMemo(() => {
    if (isWhiteBackground) return "#1f2937"; // gray-800 for white backgrounds
    return deriveTextColor(theme.from, theme.via, theme.to);
  }, [isWhiteBackground, theme.from, theme.via, theme.to]);
  
  const textSecondaryColor = useMemo(() => {
    if (isWhiteBackground) return "#6b7280"; // gray-500 for white backgrounds
    return deriveTextSecondaryColor(theme.from, theme.via, theme.to);
  }, [isWhiteBackground, theme.from, theme.via, theme.to]);

  // Determine fade color for image gradient - use theme's "to" color or derive from background
  const fadeColor = useMemo(() => {
    if (isWhiteBackground) {
      return "rgba(255, 255, 255, 1)";
    }
    // For dark backgrounds, use the theme's "to" color
    const rgb = theme.to.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (rgb) {
      const r = parseInt(rgb[1], 16);
      const g = parseInt(rgb[2], 16);
      const b = parseInt(rgb[3], 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return theme.to;
  }, [theme.to, isWhiteBackground]);

  const handleClick = useCallback(
    (linkId: string, url: string, platform: string, defaultMessage?: string | null) => {
      onLinkClick(linkId, url, platform, defaultMessage);
    },
    [onLinkClick],
  );

  const getPlatformBrandColor = (platform: string): string =>
    platformAccentColor(platform);

  // Get first 8 links for icon row (expandable for more links)
  const iconLinks = useMemo(() => regularLinks.slice(0, 8), [regularLinks]);
  // Remaining links as buttons below
  const remainingLinks = useMemo(() => regularLinks.slice(8), [regularLinks]);

  const isPreview = useMemo(() => linktree.id.includes("preview"), [linktree.id]);

  return (
    <div className={`relative w-full overflow-y-auto ${isPreview ? 'min-h-full' : 'min-h-screen'}`} style={backgroundStyle}>
      {/* Hero Image Section - Full width, Half viewport height */}
      <div className={`relative w-full overflow-hidden ${isPreview ? 'h-[45vh] min-h-[300px]' : 'h-[50vh] min-h-100'}`}>
        <Image
          src={profileImage}
          alt={linktree.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const fallback = "/images/DefaultAvatar.png";
            if (!target.src.endsWith(fallback)) {
              target.src = fallback;
            }
          }}
        />
        
        {/* Shadow and fade gradient at bottom of image - adapts to background */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${fadeColor}40 50%, ${fadeColor}80 80%, ${fadeColor} 100%)`,
          }}
        />
      </div>

      {/* Content Section Below Image - Theme Background */}
      <div className="relative px-4 py-6" style={backgroundStyle}>
        <div className="w-full max-w-md mx-auto">
          {/* Profile Info - Name and Subtitle */}
          <motion.div
            className="mb-8 text-center"
            initial={isPreview ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Name - Distinct design with border/underline */}
            <div className="mb-4">
              <h1 
                className="text-4xl font-extrabold mb-3 font-kurdish inline-block"
                style={{
                  color: textColor,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  textShadow: isWhiteBackground 
                    ? '0 2px 10px rgba(0, 0, 0, 0.1)' 
                    : `0 4px 20px rgba(0, 0, 0, 0.5), 0 2px 10px ${textColor}30`,
                  borderBottom: `3px solid ${isWhiteBackground ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
                  paddingBottom: '12px',
                }}
              >
                {linktree.name}
              </h1>
            </div>
            {/* Subtitle tagline under the name */}
            {subtitle ? (
              <p
                className="text-lg font-medium font-kurdish"
                style={{ color: textColor }}
              >
                {subtitle}
              </p>
            ) : null}
            {/* Description - Different style, more subtle */}
            <p
              className="text-base font-kurdish"
              style={{
                color: textSecondaryColor,
                fontWeight: 300,
                letterSpacing: '0.01em',
              }}
            >
              {description}
            </p>
          </motion.div>

          {/* Social Media Icons Row - With platform colors */}
          {iconLinks.length > 0 && (
            <div className={`flex justify-center items-center gap-5 flex-wrap ${isPreview ? 'mb-6' : 'mb-16'}`} dir="ltr">
              {iconLinks.map((link) => {
                const icon = getPlatformIcon(link.platform, "w-9 h-9", (link.metadata as Record<string, string>)?.custom_icon);
                const platformColor = getPlatformBrandColor(link.platform);
                const isDarkPlatform = link.platform === "twitter" || link.platform === "x" || link.platform === "tiktok";
                const shadowColor = isWhiteBackground ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.4)';
                
                return (
                  <motion.button
                    key={link.id}
                    onClick={() => handleClick(link.id, link.url, link.platform, link.default_message)}
                    className="relative p-2"
                    whileHover={{
                      scale: 1.2,
                      filter: `drop-shadow(0 6px 16px ${platformColor}70)`,
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      color: isDarkPlatform ? (isWhiteBackground ? '#000000' : '#ffffff') : platformColor,
                      filter: `drop-shadow(0 3px 10px ${shadowColor})`,
                    }}
                    aria-label={getPlatformName(link.platform)}
                  >
                    {icon}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Remaining Links as Buttons (if more than 8 links) */}
          {remainingLinks.length > 0 && (
            <div className={`space-y-3 ${isPreview ? 'mb-10' : 'mb-24'}`} dir="ltr">
              {remainingLinks.map((link, idx) => {
                const label = link.display_name || getPlatformName(link.platform);
                const icon = getPlatformIcon(link.platform, "w-5 h-5", (link.metadata as Record<string, string>)?.custom_icon);
                const platformColor = getPlatformBrandColor(link.platform);
                const isDarkPlatform = link.platform === "twitter" || link.platform === "x" || link.platform === "tiktok";

                // Button background adapts to light/dark backgrounds
                const buttonBg = isWhiteBackground 
                  ? 'rgba(0, 0, 0, 0.05)' 
                  : 'rgba(0, 0, 0, 0.3)';
                const buttonBgHover = isWhiteBackground 
                  ? 'rgba(0, 0, 0, 0.1)' 
                  : 'rgba(0, 0, 0, 0.5)';
                const buttonBorder = isWhiteBackground 
                  ? 'rgba(0, 0, 0, 0.15)' 
                  : 'rgba(255, 255, 255, 0.15)';

                return (
                  <motion.button
                    key={link.id}
                    onClick={() => handleClick(link.id, link.url, link.platform, link.default_message)}
                    className="group flex w-full items-center gap-4 rounded-xl border px-5 py-4 backdrop-blur-sm"
                    initial={isPreview ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{
                      scale: 1.01,
                      backgroundColor: buttonBgHover,
                      borderColor: `${platformColor}50`,
                    }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.6, delay: 0.1 + idx * 0.05 }}
                    style={{
                      background: buttonBg,
                      borderColor: buttonBorder,
                    }}
                  >
                    {/* Icon with platform color */}
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110"
                      style={{
                        color: isDarkPlatform ? (isWhiteBackground ? '#000000' : '#ffffff') : platformColor,
                        background: isWhiteBackground ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${platformColor}40`,
                      }}
                    >
                      {icon}
                    </div>

                    {/* Label */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-base font-semibold truncate font-kurdish" style={{ color: textColor }}>
                        {label}
                      </div>
                      <div className="text-xs font-medium font-kurdish" style={{ color: textSecondaryColor }}>
                        {getPlatformName(link.platform)}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex h-8 w-8 items-center justify-center">
                      <svg 
                        className="w-4 h-4 transition-colors" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        strokeWidth={2.5}
                        style={{ color: textSecondaryColor }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = textColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = textSecondaryColor;
                        }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {links.length === 0 && (
            <div className={`text-center py-8 ${isPreview ? 'mb-10' : 'mb-24'}`}>
              <p className="text-sm font-kurdish" style={{ color: textSecondaryColor }}>هێشتا هیچ لینکێک نییە</p>
            </div>
          )}

          {/* Footer - Lower and Smaller */}
          <div className={`${isPreview ? 'mt-8' : 'mt-24'} mb-8`} style={{ fontSize: '0.85rem' }}>
            <div style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}>
              <Footer 
                footerText={linktree.footer_text}
                footerPhone={linktree.footer_phone}
                footerHidden={linktree.footer_hidden ?? false}
                transparent={true}
                textColor={textColor}
                textSecondaryColor={textSecondaryColor}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );

          <GpsLocationDisplay
            gpsLink={gpsLink}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
          />
}, areTemplatePropsEqual);
