"use client";

import { memo, useCallback, type CSSProperties, type MouseEvent } from "react";
import { SPONSOR_TEXT, DEFAULT_FOOTER_NAME, DEFAULT_FOOTER_PHONE } from "@/lib/constants/footer";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";

export interface TemplateFooterProps {
  footerText?: string | null;
  footerPhone?: string | null;
  footerHidden?: boolean;

  textColor?: string;
  textSecondaryColor?: string;

  className?: string;
  style?: CSSProperties;
  innerClassName?: string;

  sponsorTextClassName?: string;
  sponsorTextStyle?: CSSProperties;

  nameButtonClassName?: string;
  nameButtonStyle?: CSSProperties;
  /** Hover background override, applied on mouse enter/leave alongside the base style. */
  nameButtonHoverBackground?: string;
}

/**
 * Reusable public-template footer: sponsor line plus a clickable
 * business-branded WhatsApp button, or nothing when `footerHidden`. All
 * sizing, spacing, and colors are overridable via className/style props so
 * each template keeps its own footer treatment (transparent vs. bordered,
 * light vs. dark background contrast) while sharing the click handling,
 * phone-number normalization, and copy defaults.
 */
export const TemplateFooter = memo(function TemplateFooter({
  footerText,
  footerPhone,
  footerHidden = false,
  textColor = "#ffffff",
  textSecondaryColor = "rgba(255, 255, 255, 0.7)",
  className = "w-full flex justify-center px-3 sm:px-4 py-4 sm:py-5 md:py-6",
  style = { paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" },
  innerClassName = "w-full text-center max-w-md mx-auto",
  sponsorTextClassName = "text-[11px] sm:text-xs md:text-sm font-medium tracking-wide leading-tight",
  sponsorTextStyle,
  nameButtonClassName = "inline-block mt-1.5 sm:mt-1 rounded-full border px-6 py-2 text-xs sm:text-sm font-bold font-kurdish tracking-[0.2em] transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-xs shadow-sm hover:shadow",
  nameButtonStyle,
  nameButtonHoverBackground,
}: TemplateFooterProps) {
  const phoneNumber = footerPhone?.trim() || DEFAULT_FOOTER_PHONE;
  const cleanPhone = phoneNumber.startsWith("+") ? phoneNumber.slice(1) : phoneNumber;

  const handleMultiTreeWhatsApp = useCallback(
    (e: MouseEvent<HTMLButtonElement | HTMLParagraphElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const whatsappUrl = `https://wa.me/${cleanPhone}`;
      try {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      } catch {
        // Ignore popup blockers; user can tap again
      }
    },
    [cleanPhone],
  );

  if (footerHidden) {
    return null;
  }

  const sponsorText = SPONSOR_TEXT;
  const nameText = footerText?.trim() || DEFAULT_FOOTER_NAME;

  const isLightBackground = textColor !== "#ffffff" && textColor !== "#00ff00";
  const sponsorTextColor = isLightBackground ? "rgba(107, 114, 128, 0.8)" : textSecondaryColor;
  const businessColor = `var(--business-website-color, ${MULTITREE_ACCENT_COLOR})`;

  const baseBackground = `color-mix(in srgb, var(--business-website-color, ${MULTITREE_ACCENT_COLOR}) 10%, transparent)`;
  const hoverBackground =
    nameButtonHoverBackground ??
    `color-mix(in srgb, var(--business-website-color, ${MULTITREE_ACCENT_COLOR}) 18%, transparent)`;

  return (
    <footer className={className} style={style}>
      <div className={innerClassName}>
        <p className={sponsorTextClassName} style={{ color: sponsorTextColor, ...sponsorTextStyle }}>
          {sponsorText}
        </p>
        <button
          type="button"
          onClick={handleMultiTreeWhatsApp}
          className={nameButtonClassName}
          style={{
            borderColor: businessColor,
            color: businessColor,
            background: baseBackground,
            backdropFilter: "blur(4px)",
            ...nameButtonStyle,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = hoverBackground;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = baseBackground;
          }}
        >
          {nameText}
        </button>
      </div>
    </footer>
  );
});
