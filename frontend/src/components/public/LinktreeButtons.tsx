"use client";

import { memo, useMemo, useCallback, type ReactNode } from "react";
import { LinkButton } from "@/components/ui/LinkButton";
import { PlatformIcon, PlatformLabel } from "@/lib/brand/PlatformVisuals";
import { getPlatformBrand, platformBorder, PLATFORM_BRANDS } from "@/lib/brand/platform-brands";

import type { LinktreePresentationLink as Link } from "@linktree/types";

interface LinktreeButtonsProps {
  links: Link[];
  onLinkClick: (linkId: string, url: string, platform: string, defaultMessage?: string | null) => void;
}

// Memoized link item component for better performance
const LinkItem = memo(function LinkItem({
  link,
  colors,
  onLinkClick,
}: {
  link: Link;
  colors: { from: string; via: string; to: string };
  onLinkClick: (linkId: string, url: string, platform: string, defaultMessage?: string | null) => void;
}) {
  const handleClick = useCallback(() => {
    onLinkClick(link.id, link.url, link.platform, link.default_message);
  }, [link.id, link.url, link.platform, link.default_message, onLinkClick]);

  return (
    <LinkButton
      onClick={handleClick}
      gradientFrom={colors.from}
      gradientVia={colors.via}
      gradientTo={colors.to}
      // Pure-black brands (X, TikTok) need a stronger rim or the button
      // disappears into a dark page background.
      className={`mt-0 min-h-12 sm:min-h-13 md:min-h-14 border text-center ${
        platformBorder(link.platform, link.metadata?.custom_color as string | undefined)
          ? "border-white/35"
          : "border-white/10"
      }`}
    >
      <div className="flex items-center justify-center w-full py-1 text-center">
        <PlatformLabel
          platform={link.platform}
          customColor={link.metadata?.custom_color as string | undefined}
          className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-center flex-1 min-w-0 truncate"
        >
          {link.display_name || getPlatformName(link.platform)}
        </PlatformLabel>
      </div>
    </LinkButton>
  );
});

// Split GPS links from regular links
function splitGpsLinks(links: Link[]) {
  const regularLinks = links.filter((l) => l.platform !== "gps" && l.is_active);
  const gpsLinks = links.filter((l) => l.platform === "gps" && l.is_active);
  return { regularLinks, gpsLinks };
}

export const LinktreeButtons = memo(function LinktreeButtons({
  links,
  onLinkClick,
}: LinktreeButtonsProps) {
  const { regularLinks } = useMemo(() => splitGpsLinks(links), [links]);

  // Memoize platform colors lookup to prevent recalculation on every render
  const linksWithColors = useMemo(() => {
    return regularLinks.map((link) => ({
      link,
      colors: getPlatformColors(link.platform, link.metadata?.custom_color as string | undefined),
    }));
  }, [regularLinks]);

  return (
    <main className="w-full space-y-2.5 sm:space-y-4 px-1 sm:px-0 mb-16">
      {linksWithColors.map(({ link, colors }) => (
        <LinkItem
          key={link.id}
          link={link}
          colors={colors}
          onLinkClick={onLinkClick}
        />
      ))}
    </main>
  );
});

/**
 * Gradient stops for a platform button. Kept as a `{from, via, to}` triple
 * because every template builds its own `linear-gradient()` from it; the values
 * themselves come from the shared brand registry.
 */
export function getPlatformColors(platform: string, customColor?: string): {
  from: string;
  via: string;
  to: string;
} {
  const custom = customColor?.trim();
  if (custom) {
    return { from: custom, via: custom, to: custom };
  }

  const [from, via, to] = getPlatformBrand(platform).stops;
  return { from, via, to };
}

export function getPlatformName(platform: string): string {
  return PLATFORM_BRANDS[platform]?.name ?? platform;
}

/**
 * A platform's brand mark, honoring uploaded and hand-picked icon overrides.
 *
 * Fill is inherited from the caller's own classes, because templates tint glyphs
 * to match their palettes (GentleFlow draws them on a white chip). Brands that
 * need a keyline still get one. For a glyph on the brand
 * background, prefer `<PlatformBadge>` or `<PlatformIcon tone="brand">`.
 */
export function getPlatformIcon(
  platform: string,
  className = "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white",
  customIconName?: string,
  customColor?: string,
): ReactNode {
  return (
    <PlatformIcon
      platform={platform}
      className={className}
      customIconName={customIconName}
      customColor={customColor}
      tone="inherit"
    />
  );
}
