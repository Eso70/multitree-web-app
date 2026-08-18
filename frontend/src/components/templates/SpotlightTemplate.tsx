"use client";

import { memo, useMemo, useCallback } from "react";
import { getPlatformIcon, getPlatformName, getPlatformColors } from "@/components/public/LinktreeButtons";
import { platformBorder, platformTextStyle } from "@/lib/brand/platform-brands";
import { GpsLocationDisplay, splitGpsLinks } from "@/components/public/GpsLocationDisplay";
import type { TemplateComponentProps } from "./types";
import { deriveSubtitleColor, deriveTextColor, deriveTextSecondaryColor } from "@/lib/utils/theme-colors";
import { areTemplatePropsEqual } from "@/lib/utils/linktree-utils";
import {
  STANDARD_TEMPLATE_BUTTON_SIZE_CLASS,
  STANDARD_TEMPLATE_HEADER_AVATAR_SIZES,
  STANDARD_TEMPLATE_HEADER_CLASSES,
  TemplateActionButton,
  TemplateActionButtonList,
  TemplateFooter,
  TemplateHeader,
  TemplateViewportLayout,
  templateBackgroundStyle,
} from "./shared";

export const SpotlightTemplate = memo(function SpotlightTemplate({
  linktree,
  links,
  theme,
  onLinkClick,
}: TemplateComponentProps) {
  const { gpsLink, regularLinks } = useMemo(() => splitGpsLinks(links), [links]);
  const backgroundStyle = useMemo(
    () =>
      templateBackgroundStyle(
        theme,
        `linear-gradient(to bottom right, ${theme.from}, ${theme.via}, ${theme.to})`,
      ),
    [theme],
  );

  const textColor = useMemo(() => deriveTextColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);
  const textSecondaryColor = useMemo(() => deriveTextSecondaryColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);
  const subtitleColor = deriveSubtitleColor(linktree.business_website_color);

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

  const glowStyle = useMemo(() => {
    let primaryColor = linktree.background_color || "#6366f1";
    if (primaryColor && primaryColor.startsWith("{")) {
      try {
        const parsed = JSON.parse(primaryColor);
        if (parsed.type === "gradient" && parsed.primaryColor) {
          primaryColor = parsed.primaryColor;
        }
      } catch {
        primaryColor = "#6366f1";
      }
    }
    return {
      background: `radial-gradient(circle at 50% 40%, ${primaryColor}60, ${primaryColor}30, transparent 55%)`,
    };
  }, [linktree.background_color]);

  return (
    <TemplateViewportLayout
      isPreview={isPreview}
      backgroundPattern={theme.backgroundPattern}
      backgroundPatternAccent={textColor}
      className={`px-4 ${isPreview ? "pt-14" : "pt-10"}`}
      style={backgroundStyle}
      header={
        <TemplateHeader
          name={linktree.name}
          subtitle={linktree.subtitle}
          description={linktree.description}
          image={linktree.image}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          subtitleColor={subtitleColor}
          className="w-full px-3 sm:px-4"
          contentWrapperClassName={`relative ${STANDARD_TEMPLATE_HEADER_CLASSES.content}`}
          avatarOuterClassName="relative shrink-0"
          avatarGlow={<div className="absolute inset-0 scale-[2]" style={glowStyle} />}
          avatarWrapperClassName={`relative ${STANDARD_TEMPLATE_HEADER_CLASSES.avatar} rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-white/10`}
          avatarSizes={STANDARD_TEMPLATE_HEADER_AVATAR_SIZES}
          avatarUnoptimized
          textWrapperClassName={STANDARD_TEMPLATE_HEADER_CLASSES.text}
          nameClassName={`${STANDARD_TEMPLATE_HEADER_CLASSES.name} tracking-tight`}
          nameStyle={{
            textShadow:
              textColor === "#ffffff"
                ? "0 4px 16px rgba(0,0,0,0.3), 0 5px 20px rgba(0,0,0,0.32), 0 6px 24px rgba(0,0,0,0.35)"
                : "0 2px 8px rgba(255,255,255,0.3), 0 3px 12px rgba(255,255,255,0.2)",
          }}
          subtitleClassName={STANDARD_TEMPLATE_HEADER_CLASSES.subtitle}
          descriptionClassName={STANDARD_TEMPLATE_HEADER_CLASSES.description}
        />
      }
      main={
        <>
          <TemplateActionButtonList
            isEmpty={linksWithColors.length === 0}
            emptyStateTextStyle={{ color: textSecondaryColor }}
          >
            {linksWithColors.map(({ link, colors }) => {
              const displayName = link.display_name || getPlatformName(link.platform);
              const customColor = link.metadata?.custom_color as string | undefined;
              const labelStyle = platformTextStyle(link.platform, customColor);
              const edge = platformBorder(link.platform, customColor);
              return (
                <TemplateActionButton
                  key={link.id}
                  onClick={() => handleLinkClick(link.id, link.url, link.platform, link.default_message)}
                  className={`group relative overflow-hidden rounded-2xl text-center backdrop-blur-sm shadow-lg transition-all duration-200 active:scale-[0.98] hover:shadow-xl border border-white/10 ${STANDARD_TEMPLATE_BUTTON_SIZE_CLASS}`}
                  initial={false}
                  animate={false}
                  whileHover={undefined}
                  whileTap={undefined}
                  transition={undefined}
                  style={{
                    ...labelStyle,
                    background: `linear-gradient(to bottom right, ${colors.from}, ${colors.via}, ${colors.to})`,
                    borderColor: edge,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {getPlatformIcon(link.platform, "h-5 w-5 text-white", (link.metadata as Record<string, string>)?.custom_icon)}
                    </div>
                    <span className="text-sm font-semibold sm:text-base">
                      {displayName}
                    </span>
                  </div>
                </TemplateActionButton>
              );
            })}
          </TemplateActionButtonList>

          <GpsLocationDisplay
            gpsLink={gpsLink}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            onOpen={onLinkClick}
          />
        </>
      }
      footer={
        <TemplateFooter
          footerText={linktree.footer_text}
          footerPhone={linktree.footer_phone}
          footerHidden={linktree.footer_hidden ?? false}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
        />
      }
    />
  );
}, areTemplatePropsEqual);
