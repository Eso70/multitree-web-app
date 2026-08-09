"use client";

import { memo, useMemo, useCallback } from "react";
import { LinktreeHeader } from "@/components/public/LinktreeHeader";
import { getPlatformIcon, getPlatformName, getPlatformColors } from "@/components/public/LinktreeButtons";
import { platformBorder, platformTextStyle } from "@/lib/brand/platform-brands";
import { GpsLocationDisplay, splitGpsLinks } from "@/components/public/GpsLocationDisplay";
import { Footer } from "@/components/public/Footer";
import type { TemplateComponentProps } from "./types";
import { deriveTextColor, deriveTextSecondaryColor } from "@/lib/utils/theme-colors";
import { areTemplatePropsEqual } from "@/lib/utils/linktree-utils";

export const ModernGlassTemplate = memo(function ModernGlassTemplate({
  linktree,
  links,
  theme,
  onLinkClick,
}: TemplateComponentProps) {
  const { gpsLink, regularLinks } = useMemo(() => splitGpsLinks(links), [links]);
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
    return regularLinks.map((link) => {
      const colors = getPlatformColors(link.platform, link.metadata?.custom_color as string | undefined);
      return { link, colors };
    });
  }, [regularLinks]);

  const isPreview = useMemo(() => linktree.id.includes("preview"), [linktree.id]);

  return (
    <div 
      className={`relative flex w-full flex-col items-center overflow-y-auto px-4 pb-4 ${isPreview ? 'min-h-full pt-14' : 'min-h-screen pt-10'}`}
      style={backgroundStyle}
    >
      <div className="w-full max-w-md mx-auto scale-[0.95] sm:scale-100">
        <LinktreeHeader linktree={linktree} textColor={textColor} textSecondaryColor={textSecondaryColor} />
      </div>

      <div className="mt-7 w-full max-w-md mx-auto mb-16 space-y-3">
        {linksWithColors.map(({ link, colors }) => {
          const displayName = link.display_name || getPlatformName(link.platform);
          const customColor = link.metadata?.custom_color as string | undefined;
          const labelStyle = platformTextStyle(link.platform, customColor);
          const edge = platformBorder(link.platform, customColor);
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => handleLinkClick(link.id, link.url, link.platform, link.default_message)}
              className="group relative w-full overflow-hidden rounded-2xl px-5 py-4 text-center backdrop-blur-sm shadow-lg transition-all duration-200 active:scale-[0.98] hover:shadow-xl border border-white/10"
              style={{
                ...labelStyle,
                background: `linear-gradient(to bottom right, ${colors.from}, ${colors.via}, ${colors.to})`,
                borderColor: edge,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex items-center justify-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {getPlatformIcon(link.platform, "w-5 h-5 text-white", (link.metadata as Record<string, string>)?.custom_icon)}
                </div>
                <span className="text-sm sm:text-base font-semibold">
                  {displayName}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-md mx-auto">
        <GpsLocationDisplay
          gpsLink={gpsLink}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
        />
      </div>

      <Footer 
        footerText={linktree.footer_text}
        footerPhone={linktree.footer_phone}
        footerHidden={linktree.footer_hidden ?? false}
        transparent={true}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
    </div>
  );
}, areTemplatePropsEqual);
