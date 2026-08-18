"use client";

import { memo, useMemo, useCallback } from "react";
import {
  getPlatformIcon,
  getPlatformName,
  getPlatformColors,
} from "@/components/public/LinktreeButtons";
import { GpsLocationDisplay, splitGpsLinks } from "@/components/public/GpsLocationDisplay";
import type { TemplateComponentProps } from "./types";
import { deriveSubtitleColor, deriveTextColor, deriveTextSecondaryColor } from "@/lib/utils/theme-colors";
import { areTemplatePropsEqual } from "@/lib/utils/linktree-utils";
import { platformBorder, platformTextStyle } from "@/lib/brand/platform-brands";
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

export const SpectrumTemplate = memo(function SpectrumTemplate({
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
    return regularLinks.map((link) => ({ link, colors: getPlatformColors(link.platform, link.metadata?.custom_color as string | undefined) }));
  }, [regularLinks]);

  const isPreview = useMemo(() => linktree.id.includes("preview"), [linktree.id]);

  return (
    <TemplateViewportLayout
      isPreview={isPreview}
      backgroundPattern={theme.backgroundPattern}
      backgroundPatternAccent={textColor}
      dir="ltr"
      className={`px-4 sm:px-6 md:px-8 ${isPreview ? "pt-14" : "pt-10 sm:pt-12 md:pt-16"}`}
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
          className="text-center"
          contentWrapperClassName={STANDARD_TEMPLATE_HEADER_CLASSES.content}
          avatarWrapperClassName={`relative ${STANDARD_TEMPLATE_HEADER_CLASSES.avatar} rounded-full border-4 border-white shadow-lg overflow-hidden`}
          avatarSizes={STANDARD_TEMPLATE_HEADER_AVATAR_SIZES}
          textWrapperClassName={STANDARD_TEMPLATE_HEADER_CLASSES.text}
          nameClassName={STANDARD_TEMPLATE_HEADER_CLASSES.name}
          subtitleClassName={STANDARD_TEMPLATE_HEADER_CLASSES.subtitle}
          descriptionClassName={STANDARD_TEMPLATE_HEADER_CLASSES.description}
        />
      }
      main={
        <>
          <TemplateActionButtonList
            isEmpty={linksWithColors.length === 0}
            emptyStateTextClassName="text-sm sm:text-base"
            emptyStateTextStyle={{ color: textSecondaryColor }}
          >
            {linksWithColors.map(({ link, colors }, index) => {
              const displayName = link.display_name || getPlatformName(link.platform);
              const customColor = link.metadata?.custom_color as string | undefined;
              const labelStyle = platformTextStyle(link.platform, customColor);
              const edge = platformBorder(link.platform, customColor);

              return (
                <TemplateActionButton
                  key={link.id}
                  onClick={() => handleLinkClick(link.id, link.url, link.platform, link.default_message)}
                  className={`group relative flex items-center justify-center rounded-full bg-linear-to-r shadow-lg hover:shadow-xl ${STANDARD_TEMPLATE_BUTTON_SIZE_CLASS}`}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{
                    background: `linear-gradient(to right, ${colors.from}, ${colors.via}, ${colors.to})`,
                    border: edge ? `1px solid ${edge}` : undefined,
                  }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center">
                      {getPlatformIcon(link.platform, "h-6 w-6 text-white", (link.metadata as Record<string, string>)?.custom_icon)}
                    </div>
                    <span className="text-lg font-semibold" style={labelStyle}>
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
