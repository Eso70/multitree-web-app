"use client";

import { memo, useCallback, useMemo } from "react";
import {
  getPlatformIcon,
  getPlatformName,
  getPlatformColors,
} from "@/components/public/LinktreeButtons";
import { GpsLocationDisplay, splitGpsLinks } from "@/components/public/GpsLocationDisplay";
import type { TemplateComponentProps } from "./types";
import { deriveSubtitleColor, deriveTextColor, deriveTextSecondaryColor } from "@/lib/utils/theme-colors";
import { areTemplatePropsEqual } from "@/lib/utils/linktree-utils";
import { platformForeground, platformTextStyle } from "@/lib/brand/platform-brands";
import {
  STANDARD_TEMPLATE_BUTTON_SIZE_CLASS,
  STANDARD_TEMPLATE_HEADER_AVATAR_SIZES,
  STANDARD_TEMPLATE_HEADER_CLASSES,
  TemplateActionButton,
  TemplateActionButtonList,
  TemplateBackdropDecorations,
  TemplateFooter,
  TemplateHeader,
  TemplateViewportLayout,
} from "./shared";

export const AuroraTemplate = memo(function AuroraTemplate({
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
        : `radial-gradient(circle at 20% 20%, ${theme.from}, transparent 35%), radial-gradient(circle at 80% 0%, ${theme.via}, transparent 35%), linear-gradient(135deg, ${theme.from}, ${theme.via}, ${theme.to})`,
    }),
    [theme.from, theme.via, theme.to, theme.isSolid],
  );

  const textColor = useMemo(() => deriveTextColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);
  const textSecondaryColor = useMemo(() => deriveTextSecondaryColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);
  const subtitleColor = deriveSubtitleColor(linktree.business_website_color);

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
    <TemplateViewportLayout
      isPreview={isPreview}
      className={`px-6 ${isPreview ? "pt-14" : "pt-10"}`}
      style={backgroundStyle}
      decoration={
        <TemplateBackdropDecorations
          variant="aurora"
          accentColor={subtitleColor}
          secondaryColor={theme.to}
        />
      }
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
          avatarWrapperClassName={`relative ${STANDARD_TEMPLATE_HEADER_CLASSES.avatar} rounded-full border border-white/30 bg-white/10 p-1 shadow-xl backdrop-blur`}
          avatarClassName="rounded-full"
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
            emptyStateTextStyle={{ color: textSecondaryColor }}
          >
            {linksWithColors.map(({ link, colors }, index) => {
              const displayName = link.display_name || getPlatformName(link.platform);
              const customColor = link.metadata?.custom_color as string | undefined;
              const foreground = platformForeground(link.platform, customColor);
              const labelStyle = platformTextStyle(link.platform, customColor);
              return (
                <TemplateActionButton
                  key={link.id}
                  onClick={() => handleLinkClick(link.id, link.url, link.platform, link.default_message)}
                  className={`group relative flex items-center gap-3 rounded-full shadow-lg backdrop-blur-md hover:shadow-xl ${STANDARD_TEMPLATE_BUTTON_SIZE_CLASS}`}
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
                    {getPlatformIcon(link.platform, "h-5 w-5", (link.metadata as Record<string, string>)?.custom_icon)}
                  </div>
                  <div className="flex-1 text-left" style={labelStyle}>
                    <div className="text-base font-semibold leading-tight">{displayName}</div>
                    <div className="text-xs leading-tight opacity-70">{getPlatformName(link.platform)}</div>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border opacity-80 transition group-hover:bg-white/15"
                    style={{ color: foreground, borderColor: `${foreground}66` }}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
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
