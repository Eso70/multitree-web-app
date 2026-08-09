"use client";

import { memo, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { GpsLocationDisplay, splitGpsLinks } from "@/components/public/GpsLocationDisplay";
import { Footer } from "@/components/public/Footer";
import {
  getPlatformColors,
  getPlatformIcon,
  getPlatformName,
} from "@/components/public/LinktreeButtons";
import { areTemplatePropsEqual } from "@/lib/utils/linktree-utils";
import { deriveTextColor, deriveTextSecondaryColor } from "@/lib/utils/theme-colors";
import { platformBorder, platformTextStyle } from "@/lib/brand/platform-brands";
import type { TemplateComponentProps } from "./types";

export const DarkCardTemplate = memo(function DarkCardTemplate({
  linktree,
  links,
  theme,
  onLinkClick,
}: TemplateComponentProps) {
  const prefersReducedMotion = useReducedMotion();
  const backgroundStyle = useMemo(() => {
    if (theme.isSolid) {
      return { background: theme.from };
    }
    return {
      background: `linear-gradient(to bottom right, ${theme.from}, ${theme.via}, ${theme.to})`,
    };
  }, [theme.from, theme.via, theme.to, theme.isSolid]);

  // Derive text colors from the actual background to ensure contrast on any background
  const textColor = useMemo(
    () => theme.text || deriveTextColor(theme.from, theme.via, theme.to),
    [theme.text, theme.from, theme.via, theme.to],
  );

  const textSecondaryColor = useMemo(
    () => theme.textSecondary || deriveTextSecondaryColor(theme.from, theme.via, theme.to),
    [theme.textSecondary, theme.from, theme.via, theme.to],
  );

  // Derive whether the background is dark or light for UI element adaptation
  const isDarkBackground = useMemo(
    () => textColor === "#ffffff",
    [textColor],
  );

  // Card background adapts: subtle dark card on dark bg, light card on light bg
  const cardBackground = useMemo(
    () => isDarkBackground ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    [isDarkBackground],
  );

  // Avatar border adapts to background
  const avatarBorderColor = useMemo(
    () => isDarkBackground ? "white" : "rgba(0, 0, 0, 0.15)",
    [isDarkBackground],
  );

  const { gpsLink, regularLinks } = useMemo(
    () => splitGpsLinks(links),
    [links],
  );

  const linksWithColors = useMemo(
    () =>
      regularLinks.map((link) => ({
        link,
        colors: getPlatformColors(
          link.platform,
          link.metadata?.custom_color as string | undefined,
        ),
      })),
    [regularLinks],
  );

  const profileImage = useMemo(
    () => linktree.image || "/images/DefaultAvatar.png",
    [linktree.image],
  );

  const descriptionFallback = useMemo(
    () =>
      linktree.description?.trim() ||
      "بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە",
    [linktree.description],
  );

  const handleLinkClick = useCallback(
    (linkId: string, url: string, platform: string, defaultMessage?: string | null) => {
      onLinkClick(linkId, url, platform, defaultMessage);
    },
    [onLinkClick],
  );

  // Extract dark-card specific config from template_config
  const darkCardConfig = useMemo(() => {
    const config = linktree.template_config as Record<string, unknown> | null | undefined;
    if (!config) return null;
    const dc = config.dark_card as Record<string, unknown> | undefined;
    if (!dc) return null;
    return {
      descTitle: typeof dc.desc_title === 'string' ? dc.desc_title : null,
      descText: typeof dc.desc_text === 'string' ? dc.desc_text : null,
      descImage: typeof dc.desc_image === 'string' ? dc.desc_image : null,
      tiktokUsername: typeof dc.tiktok_username === 'string' ? dc.tiktok_username : null,
      tiktokLink: typeof dc.tiktok_link === 'string' ? dc.tiktok_link : null,
    };
  }, [linktree.template_config]);

  // Use dark_card config values if available, otherwise fall back to existing behavior
  const descriptionTitle = useMemo(
    () => darkCardConfig?.descTitle || null,
    [darkCardConfig],
  );

  const descriptionText = useMemo(
    () => darkCardConfig?.descText?.trim() || descriptionFallback,
    [darkCardConfig, descriptionFallback],
  );

  const descriptionImage = useMemo(
    () => darkCardConfig?.descImage || (linktree.subtitle?.trim() && linktree.image ? linktree.image : null),
    [darkCardConfig, linktree.subtitle, linktree.image],
  );

  const isPreview = useMemo(() => linktree.id.includes("preview"), [linktree.id]);

  return (
    <div
      className={`w-full overflow-y-auto ${isPreview ? 'min-h-full' : 'min-h-screen'}`}
      style={backgroundStyle}
    >
      <div className="max-w-md mx-auto" style={{ paddingTop: isPreview ? '56px' : '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' }}>
        {/* Profile Section */}
        <motion.div
          initial={isPreview ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            data-template-avatar
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: `3px solid ${avatarBorderColor}`,
              boxShadow: isDarkBackground
                ? '0 8px 24px rgba(0,0,0,0.4)'
                : '0 4px 16px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Image
              src={profileImage}
              alt={linktree.name}
              width={100}
              height={100}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              onError={(e) => { e.currentTarget.style.opacity = '1'; }}
            />
          </div>
          <h1
            style={{
              color: textColor,
              fontWeight: 800,
              fontSize: '1.35rem',
              marginTop: '14px',
              textAlign: 'center',
              letterSpacing: '-0.01em',
            }}
          >
            {linktree.name}
          </h1>
          {linktree.subtitle?.trim() && (
            <p
              style={{
                color: textSecondaryColor,
                fontSize: '0.85rem',
                marginTop: '6px',
                textAlign: 'center',
                lineHeight: 1.5,
                opacity: 0.8,
              }}
            >
              {linktree.subtitle.trim()}
            </p>
          )}
        </motion.div>

        {/* Description Card */}
        <motion.div
          initial={isPreview ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            background: cardBackground,
            borderRadius: '20px',
            padding: '20px 22px',
            marginTop: '20px',
            marginBottom: '28px',
            boxShadow: isDarkBackground
              ? '0 4px 20px rgba(0,0,0,0.15)'
              : '0 2px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', direction: 'ltr' }}>
            {/* Text content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {descriptionTitle && (
                <h2
                  style={{
                    textAlign: 'right',
                    color: isDarkBackground ? '#ffffff' : '#111827',
                    fontSize: '15px',
                    fontWeight: 800,
                    margin: '0 0 6px 0',
                    lineHeight: 1.4,
                  }}
                >
                  {descriptionTitle}
                </h2>
              )}
              <p
                style={{
                  textAlign: 'right',
                  color: isDarkBackground ? 'rgba(255, 255, 255, 0.65)' : '#6b7280',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {descriptionText}
              </p>
            </div>
            {/* Image */}
            {descriptionImage && (
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <Image
                  src={descriptionImage}
                  alt={linktree.name}
                  width={72}
                  height={72}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Link Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {regularLinks.length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                color: textSecondaryColor,
              }}
            >
              هێشتا هیچ لینکێک نییە
            </p>
          ) : (
            linksWithColors.map(({ link, colors }, index) => (
              <div key={link.id} style={{ position: 'relative', marginTop: index === 0 ? '12px' : '6px' }}>
                {/* Tooltip overlapping top-right of button with arrow */}
                <motion.span
                  animate={{ y: prefersReducedMotion ? 0 : [0, -3, 0] }}
                  transition={{
                    duration: 2,
                    delay: index * 0.15 + 0.6,
                    ease: "easeInOut",
                    repeat: prefersReducedMotion ? 0 : Infinity,
                  }}
                  style={{
                    position: 'absolute',
                    top: '-11px',
                    right: '24px',
                    background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                    ...platformTextStyle(
                      link.platform,
                      link.metadata?.custom_color as string | undefined,
                    ),
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    direction: 'ltr',
                    zIndex: 1,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
                  }}
                >
                  بەخێرایی وەڵام وەربگرە
                  {/* Arrow pointing down to button */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-5px',
                      right: '18px',
                      width: 0,
                      height: 0,
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: `5px solid ${colors.to}`,
                    }}
                  />
                </motion.span>
                <motion.button
                  onClick={() => handleLinkClick(link.id, link.url, link.platform, link.default_message)}
                  style={{
                    background: `linear-gradient(to right, ${colors.from}, ${colors.via}, ${colors.to})`,
                    borderRadius: '24px',
                    padding: '14px 16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    // Pure-black brands need a rim on this dark template.
                    border: (() => {
                      const edge = platformBorder(
                        link.platform,
                        link.metadata?.custom_color as string | undefined,
                      );
                      return edge ? `1px solid ${edge}` : 'none';
                    })(),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '100%',
                  }}
                  initial={isPreview ? false : { opacity: 0, x: 30 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    boxShadow: prefersReducedMotion
                      ? "0 4px 16px rgba(0,0,0,0.12)"
                      : [
                          "0 4px 16px rgba(0,0,0,0.12)",
                          "0 6px 20px rgba(0,0,0,0.2)",
                          "0 4px 16px rgba(0,0,0,0.12)",
                        ],
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{
                    opacity: { duration: 0.5, delay: index * 0.1 },
                    x: { duration: 0.5, delay: index * 0.1 },
                    boxShadow: {
                      duration: 3,
                      delay: index * 0.15 + 0.8,
                      repeat: prefersReducedMotion ? 0 : Infinity,
                    },
                  }}
                >
                  {/* Label */}
                  <span
                    style={{
                      ...platformTextStyle(
                        link.platform,
                        link.metadata?.custom_color as string | undefined,
                      ),
                      fontWeight: 700,
                      fontSize: '1.1rem',
                    }}
                  >
                    {link.display_name || getPlatformName(link.platform)}
                  </span>
                  {/* Icon in circle */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getPlatformIcon(link.platform)}
                  </div>
                </motion.button>
              </div>
            ))
          )}
        </div>

        {/* GPS Location Display */}
        {gpsLink && (
          <div style={{ marginTop: '20px' }}>
            <GpsLocationDisplay
              gpsLink={gpsLink}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </div>
        )}

        {/* TikTok Badge */}
        {darkCardConfig?.tiktokUsername && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '24px',
              marginBottom: '12px',
            }}
          >
            <a
              href={darkCardConfig.tiktokLink || `https://tiktok.com/@${darkCardConfig.tiktokUsername.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #25f4ee, #fe2c55)',
                padding: '8px 18px',
                borderRadius: '9999px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(254,44,85,0.3)',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.1v-3.5a6.37 6.37 0 0 0-.82-.05A6.34 6.34 0 0 0 3.15 15.6a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.4a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.83z"/>
              </svg>
              <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>
                {darkCardConfig.tiktokUsername.startsWith('@') ? darkCardConfig.tiktokUsername : `@${darkCardConfig.tiktokUsername}`}
              </span>
            </a>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '24px' }}>
          <Footer
          footerText={linktree.footer_text}
          footerPhone={linktree.footer_phone}
          footerHidden={linktree.footer_hidden ?? false}
          transparent={false}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
        />
        </div>
      </div>
    </div>
  );
}, areTemplatePropsEqual);
