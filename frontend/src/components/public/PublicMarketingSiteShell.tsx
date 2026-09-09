"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { BusinessGridBackdrop } from "@/components/business/BusinessGridBackdrop";
import { CustomScrollbar } from "@/components/home/CustomScrollbar";
import { PublicSiteNavbar } from "@/components/public/PublicSiteNavbar";
import {
  getSponsorKrdAccentInk,
  SPONSOR_KRD_ACCENT_COLOR,
  SPONSOR_KRD_ACCENT_GRADIENT,
} from "@/lib/sponsor-krd-theme";
import { applyCursorColor, resetCursorColor } from "@/lib/utils/cursor-theme";

export interface PublicMarketingAction {
  label: string;
  href: string;
  external?: boolean;
}

interface PublicMarketingSiteShellProps {
  accentColor: string;
  accentBackground?: string;
  brandName: string;
  children: ReactNode;
  footer: ReactNode;
  logo?: string | null;
  homeHref?: string;
  id?: string;
  navigationItems?: ReadonlyArray<{ label: string; href: string }>;
  primaryAction?: PublicMarketingAction | null;
  primaryActionColor?: string;
  primaryActionInk?: string;
  secondaryAction?: PublicMarketingAction | null;
  emphasizeFirstNavItem?: boolean;
  appearance?: "business" | "sponsor-krd";
  embedded?: boolean;
}

export function PublicMarketingSiteShell({
  accentColor,
  accentBackground,
  brandName,
  children,
  footer,
  logo,
  homeHref = "/",
  id,
  navigationItems,
  primaryAction,
  primaryActionColor,
  primaryActionInk,
  secondaryAction,
  emphasizeFirstNavItem = false,
  appearance = "business",
  embedded = false,
}: PublicMarketingSiteShellProps) {
  const accentInk = getSponsorKrdAccentInk(accentColor);

  useEffect(() => {
    if (embedded) return;
    let cancelled = false;
    const root = document.documentElement;
    root.style.setProperty("--business-website-color", accentColor);
    root.style.setProperty("--sponsor-krd-accent", accentColor);
    root.style.setProperty(
      "--sponsor-krd-accent-gradient",
      accentBackground ||
        `linear-gradient(to right, ${accentColor}, ${accentColor})`,
    );
    root.style.setProperty("--sponsor-krd-accent-ink", accentInk);
    void applyCursorColor(accentColor, root, () => !cancelled).catch(
      () => undefined,
    );
    return () => {
      cancelled = true;
      root.style.removeProperty("--business-website-color");
      root.style.setProperty("--sponsor-krd-accent", SPONSOR_KRD_ACCENT_COLOR);
      root.style.setProperty(
        "--sponsor-krd-accent-gradient",
        SPONSOR_KRD_ACCENT_GRADIENT,
      );
      root.style.setProperty(
        "--sponsor-krd-accent-ink",
        getSponsorKrdAccentInk(SPONSOR_KRD_ACCENT_COLOR),
      );
      resetCursorColor(root);
    };
  }, [accentBackground, accentColor, accentInk, embedded]);

  const content = (
    <>
      {!embedded ? (
        <>
          <PublicSiteNavbar
            appearance={appearance}
            branding={{ name: brandName, logo: logo || undefined, accentColor }}
            homeHref={homeHref}
            navigationItems={navigationItems}
            action={primaryAction}
            actionColor={primaryActionColor}
            actionInk={primaryActionInk}
            secondaryAction={secondaryAction}
            emphasizeFirstNavItem={emphasizeFirstNavItem}
          />
          <CustomScrollbar />
        </>
      ) : null}
      <div className="relative isolate">
        <BusinessGridBackdrop
          className="-z-10 opacity-45"
          mask="linear-gradient(to bottom, black 0%, black 96%, transparent 100%)"
        />
        <div className="relative">{children}</div>
      </div>
      {!embedded ? footer : null}
    </>
  );

  const className = `theme-custom-scrollbar relative isolate bg-[#f8f9fa] text-[#111827] transition-colors duration-300 dark:bg-[#0b0d0e] dark:text-white ${
    embedded
      ? "max-h-[72vh] overflow-y-auto overflow-x-hidden rounded-3xl border border-black/10 dark:border-white/10"
      : "min-h-screen overflow-x-clip"
  }`;
  const style = { "--business-accent": accentColor } as CSSProperties;
  const Element = embedded ? "div" : "main";
  return (
    <Element id={id} dir="ltr" className={className} style={style}>
      {content}
    </Element>
  );
}
