"use client";

import { memo, useCallback, useMemo } from "react";
import { getPlatformIcon, getPlatformName, getPlatformColors } from "@/components/public/LinktreeButtons";
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

export const FrostTemplate = memo(function FrostTemplate({
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
        `linear-gradient(145deg, ${theme.from}, ${theme.via}, ${theme.to})`,
      ),
    [theme],
  );

  const textColor = useMemo(() => deriveTextColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);
  const textSecondaryColor = useMemo(() => deriveTextSecondaryColor(theme.from, theme.via, theme.to), [theme.from, theme.via, theme.to]);
  const subtitleColor = deriveSubtitleColor(linktree.business_website_color);

  const handleClick = useCallback(
    (linkId: string, url: string, platform: string, defaultMessage?: string | null) => {
      onLinkClick(linkId, url, platform, defaultMessage);
    },
    [onLinkClick],
  );

  const isPreview = useMemo(() => linktree.id.includes("preview"), [linktree.id]);

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
          isEmpty={regularLinks.length === 0}
          style={{}}
          emptyStateClassName="rounded-2xl border border-white/30 bg-white/10 px-4 py-6 text-center text-sm"
          emptyStateStyle={{ color: textSecondaryColor }}
        >
          {regularLinks.map((link, idx) => {
            const colors = getPlatformColors(link.platform, link.metadata?.custom_color as string | undefined);
            const icon = getPlatformIcon(link.platform, "w-6 h-6", (link.metadata as Record<string, string>)?.custom_icon);
            const label = link.display_name || getPlatformName(link.platform);

            return (
              <TemplateActionButton
                key={link.id}
                dir="ltr"
                onClick={() => handleClick(link.id, link.url, link.platform, link.default_message)}
                className={`group relative flex items-center gap-3 rounded-2xl backdrop-blur-md ${STANDARD_TEMPLATE_BUTTON_SIZE_CLASS}`}
                initial={isPreview ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                whileTap={undefined}
                transition={{ duration: 0.45, delay: idx * 0.07 }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 14px 40px rgba(0,0,0,0.15)",
                }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-inner"
                  style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.via}, ${colors.to})` }}
                >
                  {icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-base font-semibold" style={{ color: textColor }}>
                    {label}
                  </div>
                  <div className="text-xs" style={{ color: textSecondaryColor }}>
                    {getPlatformName(link.platform)}
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white/80 transition group-hover:bg-white/10">
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
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(120deg, ${colors.from}30, transparent, ${colors.to}30)`,
                  }}
                />
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
