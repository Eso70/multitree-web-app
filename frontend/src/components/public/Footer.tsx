"use client";

import { memo, useCallback } from "react";
import type { MouseEvent } from "react";
import { SPONSOR_TEXT, DEFAULT_FOOTER_NAME, DEFAULT_FOOTER_PHONE } from "@/lib/constants/footer";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";

interface FooterProps {
  footerText?: string | null;
  footerPhone?: string | null;
  footerHidden?: boolean;
  transparent?: boolean;
  textColor?: string;
  textSecondaryColor?: string;
}

export const Footer = memo(function Footer({
  footerText,
  footerPhone,
  footerHidden = false,
  transparent: _transparent = false,
  textColor = "#ffffff",
  textSecondaryColor = "rgba(255, 255, 255, 0.7)",
}: FooterProps) {
  // Use footerPhone from database if present, otherwise default to configured number
  const phoneNumber = footerPhone?.trim() || DEFAULT_FOOTER_PHONE;
  // Ensure phone number has country code format (add + if missing, but wa.me doesn't need +)
  const cleanPhone = phoneNumber.startsWith("+") ? phoneNumber.slice(1) : phoneNumber;
  
  // Hooks must be called before any early returns
  const handleMultiTreeWhatsApp = useCallback((e: MouseEvent<HTMLButtonElement | HTMLParagraphElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const whatsappUrl = `https://wa.me/${cleanPhone}`;

    // Always open WhatsApp chat in a new tab to avoid duplicate targets
    try {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch {
      // Ignore popup blockers; user can tap again
    }
  }, [cleanPhone]);

  // Don't render footer if hidden (after hooks)
  if (footerHidden) {
    return null;
  }
  
  const sponsorText = SPONSOR_TEXT; // Always fixed sponsor text
  const nameText = footerText?.trim() || DEFAULT_FOOTER_NAME; // Clickable business-configured name

  // Sponsor text follows the page background for contrast, but the clickable
  // footer name is always branded with the business website color.
  const isLightBackground = textColor !== "#ffffff" && textColor !== "#00ff00";
  const sponsorTextColor = isLightBackground ? "rgba(107, 114, 128, 0.8)" : textSecondaryColor;
  const businessColor = `var(--business-website-color, ${MULTITREE_ACCENT_COLOR})`;

  return (
    <footer 
      className="w-full flex justify-center px-3 sm:px-4 py-4 sm:py-5 md:py-6"
      style={{
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
      }}
    >
      <div className="w-full text-center max-w-md mx-auto">
        <p 
          className="text-[11px] sm:text-xs md:text-sm font-medium tracking-wide leading-tight"
          style={{ color: sponsorTextColor }}
        >
          {sponsorText}
        </p>
        <button
          type="button"
          onClick={handleMultiTreeWhatsApp}
          className="inline-block mt-1.5 sm:mt-1 rounded-full border px-6 py-2 text-xs sm:text-sm font-bold font-kurdish tracking-[0.2em] transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-xs shadow-sm hover:shadow"
          style={{
            borderColor: businessColor,
            color: businessColor,
            background: `color-mix(in srgb, var(--business-website-color, ${MULTITREE_ACCENT_COLOR}) 10%, transparent)`,
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, var(--business-website-color, ${MULTITREE_ACCENT_COLOR}) 18%, transparent)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, var(--business-website-color, ${MULTITREE_ACCENT_COLOR}) 10%, transparent)`;
          }}
        >
          {nameText}
        </button>
      </div>
    </footer>
  );
});
