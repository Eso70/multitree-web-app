"use client";

import Image from "next/image";
import { memo, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  getPlatformIcon,
  getPlatformName,
  getPlatformColors,
} from "@/components/public/LinktreeButtons";
import { GpsLocationDisplay, splitGpsLinks } from "@/components/public/GpsLocationDisplay";
import type { TemplateComponentProps } from "./types";
import { deriveTextColor, deriveTextSecondaryColor } from "@/lib/utils/theme-colors";
import { Footer } from "@/components/public/Footer";
import { areTemplatePropsEqual } from "@/lib/utils/linktree-utils";
import { platformBorder, platformTextStyle } from "@/lib/brand/platform-brands";

const FALLBACK_DESCRIPTION = "بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە";

export const ColorfulPillsTemplate = memo(function ColorfulPillsTemplate({
  linktree,
  links,
  theme,
  onLinkClick,
}: TemplateComponentProps) {
  const { gpsLink, regularLinks } = useMemo(() => splitGpsLinks(links), [links]);
  const profileImage = useMemo(() => linktree.image || "/images/DefaultAvatar.png", [linktree.image]);
  const subtitle = useMemo(() => linktree.subtitle?.trim() || "", [linktree.subtitle]);
  const description = useMemo(() => linktree.description?.trim() || FALLBACK_DESCRIPTION, [linktree.description]);

  const backgroundStyle = useMemo(
    () => ({
      background: theme.isSolid
        ? theme.from
        : `linear-gradient(to bottom right, ${theme.from}, ${theme.via}, ${theme.to})`,
    }),
    [theme.from, theme.via, theme.to, theme.isSolid],
  );

  const textColor = useMemo(() => deriveTextColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);
  const textSecondaryColor = useMemo(() => deriveTextSecondaryColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);

  const handleLinkClick = useCallback(
    (linkId: string, url: string, platform: string, defaultMessage?: string | null) => {
      onLinkClick(linkId, url, platform, defaultMessage);
    },
    [onLinkClick]
  );

  const linksWithColors = useMemo(() => {
    return regularLinks.map((link) => ({ link, colors: getPlatformColors(link.platform, link.metadata?.custom_color as string | undefined) }));
  }, [regularLinks]);

  return (
    <div
      dir="ltr"
      className="relative w-full min-h-screen overflow-y-auto py-10 sm:py-12 md:py-16 px-4 sm:px-6 md:px-8"
      style={backgroundStyle}
    >
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        {/* Profile Section */}
        <div className="text-center mb-10 sm:mb-12 md:mb-14">
          <div className="inline-block mb-3 sm:mb-4">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-white shadow-lg overflow-hidden">
              <Image
                src={profileImage}
                alt={linktree.name}
                width={144}
                height={144}
                className="w-full h-full object-cover"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const fallback = "/images/DefaultAvatar.png";
                  if (!target.src.endsWith(fallback)) {
                    target.src = fallback;
                  }
                }}
              />
            </div>
          </div>

          <h1
            className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2"
            style={{ color: textColor }}
          >
            {linktree.name}
          </h1>
          {subtitle ? (
            <p
              className="text-sm sm:text-base md:text-lg font-medium mb-1 sm:mb-2 leading-snug max-w-xs sm:max-w-sm mx-auto px-2"
              style={{ color: textColor }}
            >
              {subtitle}
            </p>
          ) : null}
          <p
            className="text-xs sm:text-sm md:text-base mb-4 sm:mb-6 leading-relaxed max-w-xs sm:max-w-sm mx-auto px-2"
            style={{ color: textSecondaryColor }}
          >
            {description}
          </p>
        </div>

        {/* Colorful Pill Links */}
        <div className="space-y-3 sm:space-y-4 mb-12 sm:mb-16" style={{ direction: "ltr" }}>
          {linksWithColors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm sm:text-base" style={{ color: textSecondaryColor }}>هێشتا هیچ لینکێک نییە</p>
            </div>
          ) : (
            linksWithColors.map(({ link, colors }, index) => {
              const displayName = link.display_name || getPlatformName(link.platform);
              const customColor = link.metadata?.custom_color as string | undefined;
              const labelStyle = platformTextStyle(link.platform, customColor);
              const edge = platformBorder(link.platform, customColor);

              return (
                <motion.button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id, link.url, link.platform, link.default_message)}
                  className="group block w-full rounded-full bg-linear-to-r px-6 py-5 shadow-lg hover:shadow-xl"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{
                    background: `linear-gradient(to right, ${colors.from}, ${colors.via}, ${colors.to})`,
                    border: edge ? `1px solid ${edge}` : undefined,
                  }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center">
                      {getPlatformIcon(link.platform, "w-6 h-6 text-white", (link.metadata as Record<string, string>)?.custom_icon)}
                    </div>
                    <span className="font-semibold text-lg" style={labelStyle}>
                      {displayName}
                    </span>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        <GpsLocationDisplay
          gpsLink={gpsLink}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
        />

        {/* Footer */}
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
  );
}, areTemplatePropsEqual);
