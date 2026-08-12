"use client";

import { memo, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  getPlatformIcon,
  getPlatformName,
  getPlatformColors,
} from "@/components/public/LinktreeButtons";
import { GpsLocationDisplay, splitGpsLinks } from "@/components/public/GpsLocationDisplay";
import type { TemplateComponentProps } from "./types";
import { deriveSubtitleColor, deriveTextColor, deriveTextSecondaryColor } from "@/lib/utils/theme-colors";
import { areTemplatePropsEqual } from "@/lib/utils/linktree-utils";
import { platformAccentColor } from "@/lib/brand/platform-brands";
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

export const SerenityTemplate = memo(function SerenityTemplate({
  linktree,
  links,
  theme,
  onLinkClick,
}: TemplateComponentProps) {
  const { gpsLink, regularLinks } = useMemo(() => splitGpsLinks(links), [links]);

  // Flowing gradient background
  const backgroundStyle = useMemo(
    () => ({
      background: theme.isSolid
        ? theme.from
        : `linear-gradient(180deg, ${theme.from} 0%, ${theme.via} 50%, ${theme.to} 100%)`,
    }),
    [theme.from, theme.via, theme.to, theme.isSolid],
  );

  // Detect if background is white/light - if so, use dark text for compatibility
  const isWhiteBackground = useMemo(() => {
    return theme.isSolid 
      ? (theme.from === "#ffffff" || theme.from === "#f3f4f6" || theme.from === "#e5e7eb" || theme.from === "#ffffff")
      : (theme.from.includes("fff") || theme.from.includes("f3f4f6") || theme.from.includes("e5e7eb") || 
         theme.via.includes("fff") || theme.via.includes("f3f4f6") || theme.via.includes("e5e7eb"));
  }, [theme.from, theme.via, theme.isSolid]);
  
  // Text colors - dark for white backgrounds, theme-derived for colored backgrounds
  const textColor = useMemo(() => {
    if (isWhiteBackground) return "#1f2937"; // gray-800 for white backgrounds
    return deriveTextColor(theme.from, theme.via, theme.to);
  }, [isWhiteBackground, theme.from, theme.via, theme.to]);
  
  const textSecondaryColor = useMemo(() => {
    if (isWhiteBackground) return "#6b7280"; // gray-500 for white backgrounds
    return deriveTextSecondaryColor(theme.from, theme.via, theme.to);
  }, [isWhiteBackground, theme.from, theme.via, theme.to]);
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
      className={`px-5 ${isPreview ? "pt-14" : "pt-12"}`}
      style={backgroundStyle}
      decoration={
        <TemplateBackdropDecorations
          variant="serenity"
          accentColor={subtitleColor}
          secondaryColor={theme.to}
        />
      }
      header={
        <motion.div
          initial={isPreview ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <TemplateHeader
            as="div"
            name={linktree.name}
            subtitle={linktree.subtitle}
            description={linktree.description}
            image={linktree.image}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            subtitleColor={subtitleColor}
            className="flex flex-col items-center text-center"
            contentWrapperClassName={STANDARD_TEMPLATE_HEADER_CLASSES.content}
            avatarWrapperClassName={`relative ${STANDARD_TEMPLATE_HEADER_CLASSES.avatar} rounded-full overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.2)]`}
            avatarWrapperStyle={{
              border: `4px solid ${isWhiteBackground ? 'rgba(0, 0, 0, 0.1)' : `${textColor}20`}`,
            }}
            avatarSizes={STANDARD_TEMPLATE_HEADER_AVATAR_SIZES}
            textWrapperClassName={STANDARD_TEMPLATE_HEADER_CLASSES.text}
            nameClassName={`${STANDARD_TEMPLATE_HEADER_CLASSES.name} font-kurdish drop-shadow-lg`}
            nameStyle={{
              textShadow: isWhiteBackground
                ? "0 2px 10px rgba(0, 0, 0, 0.1)"
                : `0 2px 10px ${textColor}30`,
            }}
            subtitleClassName={`${STANDARD_TEMPLATE_HEADER_CLASSES.subtitle} font-kurdish`}
            descriptionClassName={`${STANDARD_TEMPLATE_HEADER_CLASSES.description} font-kurdish`}
          />
        </motion.div>
      }
      main={
        <>
          <TemplateActionButtonList
            isEmpty={regularLinks.length === 0}
            style={{ direction: "ltr" }}
            emptyStateClassName="rounded-full border-2 py-8 text-center font-kurdish backdrop-blur-md"
            emptyStateStyle={{
              color: textSecondaryColor,
              borderColor: isWhiteBackground ? "rgba(0, 0, 0, 0.15)" : `${textColor}30`,
              background: isWhiteBackground ? "rgba(0, 0, 0, 0.05)" : `${textColor}10`,
            }}
            emptyStateTextClassName="text-sm"
          >
            {regularLinks.map((link, idx) => {
              const colors = getPlatformColors(link.platform, link.metadata?.custom_color as string | undefined);
              const label = link.display_name || getPlatformName(link.platform);
              const icon = getPlatformIcon(link.platform, "h-5 w-5", (link.metadata as Record<string, string>)?.custom_icon);

            // Brand color for this row's text and icons.
            const platformColor = platformAccentColor(link.platform);
            
            // Use platform brand color for all text and icons
            // Add white background/outline for better visibility on colored gradients
            const textIconColor = platformColor;

            // Make buttons darker on white backgrounds for better text contrast
            const buttonOpacity = isWhiteBackground ? 'ff' : 'dd'; // Full opacity on white, semi-transparent on colored
            const buttonBorderOpacity = isWhiteBackground ? 'cc' : '80'; // Darker border on white
            const buttonShadowOpacity = isWhiteBackground ? '50' : '40'; // Stronger shadow on white

              return (
                <TemplateActionButton
                key={link.id}
                onClick={() => handleClick(link.id, link.url, link.platform, link.default_message)}
                className={`group relative flex items-center gap-4 rounded-full border-2 backdrop-blur-md ${STANDARD_TEMPLATE_BUTTON_SIZE_CLASS}`}
                initial={isPreview ? false : { opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{
                  y: -2,
                  scale: 1.05,
                  boxShadow: `0 8px 30px ${colors.from}${isWhiteBackground ? '70' : '60'}`,
                }}
                whileTap={{ scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 + idx * 0.06 }}
                style={{
                  background: `linear-gradient(135deg, ${colors.from}${buttonOpacity}, ${colors.to}${buttonOpacity})`,
                  borderColor: `${colors.from}${buttonBorderOpacity}`,
                  boxShadow: `0 4px 20px ${colors.from}${buttonShadowOpacity}`,
                }}
                >
                {/* Icon with white background for platform color visibility */}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div 
                    style={{
                      color: textIconColor,
                    }}
                  >
                    {icon}
                  </div>
                </div>

                {/* Label text */}
                <div className="flex-1 text-left min-w-0">
                  <div 
                    className="text-base font-bold truncate mb-0.5 font-kurdish"
                    style={{
                      color: textColor,
                    }}
                  >
                    {label}
                  </div>
                  <div 
                    className="text-xs font-medium font-kurdish"
                    style={{
                      color: textSecondaryColor,
                    }}
                  >
                    {getPlatformName(link.platform)}
                  </div>
                </div>

                {/* Arrow with white background */}
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 group-hover:translate-x-1"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2.5}
                    style={{ color: textIconColor }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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
