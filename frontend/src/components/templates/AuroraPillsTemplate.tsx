"use client";

import Image from "next/image";
import { memo, useCallback, useMemo } from "react";
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
import { platformForeground, platformTextStyle } from "@/lib/brand/platform-brands";

const FALLBACK_DESCRIPTION = "بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە";

export const AuroraPillsTemplate = memo(function AuroraPillsTemplate({
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
        : `radial-gradient(circle at 20% 20%, ${theme.from}, transparent 35%), radial-gradient(circle at 80% 0%, ${theme.via}, transparent 35%), linear-gradient(135deg, ${theme.from}, ${theme.via}, ${theme.to})`,
    }),
    [theme.from, theme.via, theme.to, theme.isSolid],
  );

  const textColor = useMemo(() => deriveTextColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);
  const textSecondaryColor = useMemo(() => deriveTextSecondaryColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);

  const handleLinkClick = useCallback(
    (linkId: string, url: string, platform: string, defaultMessage?: string | null) => {
      onLinkClick(linkId, url, platform, defaultMessage);
    },
    [onLinkClick],
  );

  const linksWithColors = useMemo(() => {
    return regularLinks.map((link) => ({ link, colors: getPlatformColors(link.platform, link.metadata?.custom_color as string | undefined) }));
  }, [regularLinks]);

  const isPreview = useMemo(() => linktree.id.includes("preview"), [linktree.id]);

  return (
    <div className={`relative w-full overflow-y-auto px-6 pb-4 ${isPreview ? 'min-h-full pt-14' : 'min-h-screen py-10'}`} style={backgroundStyle}>
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-3 h-32 w-32 rounded-full border border-white/30 bg-white/10 p-1 shadow-xl backdrop-blur">
            <Image
              src={profileImage}
              alt={linktree.name}
              fill
              className="rounded-full object-cover"
              sizes="128px"
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
          <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: textColor }}>
            {linktree.name}
          </h1>
          {subtitle ? (
            <p className="text-base font-medium mb-1" style={{ color: textColor }}>
              {subtitle}
            </p>
          ) : null}
          <p className="text-sm mb-6" style={{ color: textSecondaryColor }}>
            {description}
          </p>
        </div>

        <div className="space-y-3 mb-16" style={{ direction: "ltr" }}>
          {linksWithColors.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: textSecondaryColor }}>هێشتا هیچ لینکێک نییە</p>
            </div>
          ) : (
            linksWithColors.map(({ link, colors }, index) => {
              const displayName = link.display_name || getPlatformName(link.platform);
              const customColor = link.metadata?.custom_color as string | undefined;
              const foreground = platformForeground(link.platform, customColor);
              const labelStyle = platformTextStyle(link.platform, customColor);
              return (
                <motion.button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id, link.url, link.platform, link.default_message)}
                  className="group relative flex w-full items-center gap-3 rounded-full px-5 py-4 shadow-lg backdrop-blur-md hover:shadow-xl"
                  initial={isPreview ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  style={{
                    background: `linear-gradient(120deg, ${colors.from}, ${colors.via}, ${colors.to})`,
                    border: "1px solid rgba(255,255,255,0.35)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                  }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white shadow-inner">
                    {getPlatformIcon(link.platform, "w-5 h-5", (link.metadata as Record<string, string>)?.custom_icon)}
                  </div>
                  <div className="flex-1 text-left" style={labelStyle}>
                    <div className="font-semibold text-base leading-tight">{displayName}</div>
                    <div className="text-xs leading-tight opacity-70">{getPlatformName(link.platform)}</div>
                  </div>
                  <div
                    className="rounded-full border px-3 py-1 text-xs font-semibold opacity-80 transition group-hover:bg-white/15"
                    style={{ color: foreground, borderColor: `${foreground}66` }}
                  >
                    Go
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
      </div>

      {/* Footer */}
      <Footer 
        footerText={linktree.footer_text}
        footerPhone={linktree.footer_phone}
        footerHidden={linktree.footer_hidden ?? false}
        transparent={false}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />

    </div>
  );
}, areTemplatePropsEqual);
