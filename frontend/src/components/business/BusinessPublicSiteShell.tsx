"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { CustomScrollbar } from "@/components/home/CustomScrollbar";
import { PublicSiteNavbar } from "@/components/public/PublicSiteNavbar";
import { BusinessGridBackdrop } from "@/components/business/BusinessGridBackdrop";
import {
  BusinessPublicFooter,
  type BusinessPublicFooterProps,
} from "@/components/business/BusinessPublicFooter";
import {
  getMultiTreeAccentInk,
  MULTITREE_ACCENT_COLOR,
} from "@/lib/multitree-theme";
import { applyCursorColor, resetCursorColor } from "@/lib/utils/cursor-theme";

interface BusinessPublicSiteShellProps {
  accentColor: string;
  businessName: string;
  children: ReactNode;
  embedded?: boolean;
  footer: Omit<BusinessPublicFooterProps, "accentColor" | "businessName">;
  homeHref?: string;
  id?: string;
  logo?: string | null;
  navigationItems?: ReadonlyArray<{ label: string; href: string }>;
  action?: { label: string; href: string; external?: boolean } | null;
  emphasizeFirstNavItem?: boolean;
}

export function BusinessPublicSiteShell({
  accentColor,
  businessName,
  children,
  embedded = false,
  footer,
  homeHref = "/",
  id,
  logo,
  navigationItems,
  action,
  emphasizeFirstNavItem = true,
}: BusinessPublicSiteShellProps) {
  const accentInk = getMultiTreeAccentInk(accentColor);

  useEffect(() => {
    if (embedded) return;
    let cancelled = false;
    const root = document.documentElement;
    root.style.setProperty("--business-website-color", accentColor);
    root.style.setProperty("--multitree-accent", accentColor);
    root.style.setProperty(
      "--multitree-accent-gradient",
      `linear-gradient(to right, ${accentColor}, ${accentColor})`,
    );
    root.style.setProperty("--multitree-accent-ink", accentInk);
    void applyCursorColor(accentColor, root, () => !cancelled).catch(
      () => undefined,
    );

    return () => {
      cancelled = true;
      root.style.removeProperty("--business-website-color");
      root.style.setProperty("--multitree-accent", MULTITREE_ACCENT_COLOR);
      root.style.setProperty(
        "--multitree-accent-gradient",
        `linear-gradient(to right, ${MULTITREE_ACCENT_COLOR}, ${MULTITREE_ACCENT_COLOR})`,
      );
      root.style.setProperty(
        "--multitree-accent-ink",
        getMultiTreeAccentInk(MULTITREE_ACCENT_COLOR),
      );
      resetCursorColor(root);
    };
  }, [accentColor, accentInk, embedded]);

  const content = (
    <>
      {!embedded && (
        <>
          <PublicSiteNavbar
            appearance="business"
            branding={{ name: businessName, logo: logo || undefined, accentColor }}
            homeHref={homeHref}
            navigationItems={navigationItems}
            action={action}
            emphasizeFirstNavItem={emphasizeFirstNavItem}
          />
          <CustomScrollbar />
        </>
      )}

      <div className="relative isolate">
        <BusinessGridBackdrop
          className="-z-10 opacity-45"
          mask="linear-gradient(to bottom, black 0%, black 96%, transparent 100%)"
        />
        <div className="relative">{children}</div>
      </div>

      {!embedded && (
        <BusinessPublicFooter
          {...footer}
          businessName={businessName}
          accentColor={accentColor}
          logo={footer.logo || logo}
          homeHref={homeHref}
        />
      )}
    </>
  );

  const className = `theme-custom-scrollbar relative isolate bg-[#f8f9fa] text-[#111827] transition-colors duration-300 dark:bg-[#0b0d0e] dark:text-white ${
    embedded
      ? "max-h-[72vh] overflow-y-auto overflow-x-hidden rounded-3xl border border-black/10 dark:border-white/10"
      : "min-h-screen overflow-x-clip"
  }`;
  const style = { "--business-accent": accentColor } as CSSProperties;

  return embedded ? (
    <div id={id} dir="ltr" className={className} style={style}>
      {content}
    </div>
  ) : (
    <main id={id} dir="ltr" className={className} style={style}>
      {content}
    </main>
  );
}
