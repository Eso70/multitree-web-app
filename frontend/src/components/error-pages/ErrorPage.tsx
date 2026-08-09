"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";
import { CustomScrollbar } from "@/components/home/CustomScrollbar";
import { PublicSiteNavbar } from "@/components/public/PublicSiteNavbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { BusinessPublicSiteShell } from "@/components/business/BusinessPublicSiteShell";
import { BusinessHeroAccentBackdrop } from "@/components/business/BusinessHeroAccentBackdrop";
import {
  BUSINESS_LANDING_SECTION_HREFS,
} from "@/components/business/business-landing-sections";
import { getMultiTreeAccentInk } from "@/lib/multitree-theme";
import { applyBusinessTabBranding } from "@/lib/utils/business-error-theme";
import type { ErrorPageTheme } from "./error-theme";

interface ErrorContentProps {
  code: string;
  title: string;
  description: string;
  theme: ErrorPageTheme;
  homeHref?: string;
  errorDigest?: string;
  onReset?: () => void;
  showRetry?: boolean;
}

interface ErrorPageProps extends ErrorContentProps {
  homeHref: string;
}

function ErrorContent({
  code,
  title,
  description,
  theme,
  homeHref,
  errorDigest,
  onReset,
  showRetry = false,
}: ErrorContentProps) {
  const accentBackground = theme.accentBackground ?? theme.accentColor;
  const accentInk = theme.accentInk ?? "#ffffff";
  const mutedColor =
    theme.mutedColor ?? `color-mix(in srgb, ${theme.accentColor} 58%, black)`;
  const buttonClassName =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium shadow-md transition-all duration-300 hover:opacity-90 hover:shadow-lg sm:w-auto font-kurdish";
  const handleRetry =
    onReset ?? (showRetry ? () => window.location.reload() : undefined);

  return (
    <div
      className="flex w-full max-w-md flex-col items-center gap-5 text-center"
      dir="rtl"
    >
      <h1
        className="rounded-2xl px-5 py-2 font-mono text-6xl font-bold sm:text-7xl md:text-8xl"
        style={{
          background: `color-mix(in srgb, ${theme.accentColor} 20%, transparent)`,
          color: mutedColor,
        }}
      >
        {code}
      </h1>

      <div className="space-y-2">
        <h2
          className="text-2xl font-bold sm:text-3xl font-kurdish"
          style={{ color: theme.accentColor }}
        >
          {title}
        </h2>
        <p
          className="mx-auto max-w-sm text-sm leading-relaxed sm:text-base font-kurdish"
          style={{ color: mutedColor }}
        >
          {description}
        </p>
        {errorDigest ? (
          <p
            className="mt-2 inline-block rounded-lg px-3 py-2 font-mono text-xs"
            style={{
              color: mutedColor,
              border: `1px solid color-mix(in srgb, ${theme.accentColor} 35%, transparent)`,
              background: `color-mix(in srgb, ${theme.accentColor} 20%, transparent)`,
            }}
          >
            کۆدی هەڵە: {errorDigest}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
        {handleRetry ? (
          <button
            type="button"
            onClick={handleRetry}
            className={buttonClassName}
            style={{ background: accentBackground, color: accentInk }}
          >
            <RefreshCw className="h-5 w-5" />
            <span>هەوڵ بدەوە</span>
          </button>
        ) : null}

        {homeHref ? (
          <Link
            href={homeHref}
            className={buttonClassName}
            style={{ background: accentBackground, color: accentInk }}
          >
            <Home className="h-5 w-5" />
            <span>پەڕەی سەرەکی</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function ErrorPagePanel(props: ErrorContentProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center px-4 py-16"
    >
      <ErrorContent {...props} />
    </div>
  );
}

export function ErrorPage(props: ErrorPageProps) {
  const { theme, homeHref } = props;
  const isBusiness = theme.scope === "business";
  const businessName = theme.name || "Business";

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--multitree-accent", theme.accentColor);
    root.style.setProperty(
      "--multitree-accent-gradient",
      theme.accentBackground ??
        `linear-gradient(to right, ${theme.accentColor}, ${theme.accentColor})`,
    );
    root.style.setProperty(
      "--multitree-accent-ink",
      theme.accentInk ?? getMultiTreeAccentInk(theme.accentColor),
    );

    if (isBusiness) {
      root.style.setProperty("--business-website-color", theme.accentColor);
      applyBusinessTabBranding(theme.favicon, theme.name);
    }
  }, [isBusiness, theme]);

  if (isBusiness) {
    const footer = theme.footer;
    const phoneDigits = (footer?.phone || "").replace(/\D/g, "");
    const whatsappHref =
      phoneDigits.length >= 8 ? `https://wa.me/${phoneDigits}` : null;
    const navigationItems = [
      {
        label: "پەڕەکان",
        href: `${homeHref}${BUSINESS_LANDING_SECTION_HREFS.workspace}`,
      },
      {
        label: "دەربارەی ئێمە",
        href: `${homeHref}${BUSINESS_LANDING_SECTION_HREFS.about}`,
      },
      {
        label: "خزمەتگوزارییەکان",
        href: `${homeHref}${BUSINESS_LANDING_SECTION_HREFS.digitalPresence}`,
      },
      {
        label: "دیزاینەکان",
        href: `${homeHref}${BUSINESS_LANDING_SECTION_HREFS.mobileShowcase}`,
      },
      ...(footer?.advertisingEnabled
        ? [{ label: "ڕیکلام", href: "/advertising" }]
        : []),
    ];

    return (
      <BusinessPublicSiteShell
        businessName={businessName}
        logo={theme.logo}
        accentColor={theme.accentColor}
        homeHref={homeHref}
        navigationItems={navigationItems}
        action={
          footer?.whatsappEnabled && whatsappHref
            ? { label: "پەیوەندی", href: whatsappHref, external: true }
            : null
        }
        emphasizeFirstNavItem={false}
        footer={{
          logo: theme.logo,
          description:
            footer?.description ||
            `${businessName}'s official public website.`,
          phone: footer?.phone ?? null,
          whatsappEnabled: footer?.whatsappEnabled ?? null,
          advertisingEnabled: footer?.advertisingEnabled ?? false,
          brandingRemoved: footer?.brandingRemoved ?? false,
          linktrees: footer?.linktrees ?? [],
          miniWebsites: footer?.miniWebsites ?? [],
          homeHref,
        }}
      >
        <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pb-16 pt-28">
          <BusinessHeroAccentBackdrop accentColor={theme.accentColor} />
          <div className="relative z-10">
            <ErrorContent {...props} />
          </div>
        </section>
      </BusinessPublicSiteShell>
    );
  }

  return (
    <main
      dir="ltr"
      className="flex min-h-screen flex-col overflow-x-clip bg-[#f8f9fa] text-[#111827] transition-colors duration-300 dark:bg-[#0f172a] dark:text-slate-100"
    >
      <PublicSiteNavbar
        appearance="multitree"
        homeHref={homeHref}
        sectionBaseHref="/"
      />
      <CustomScrollbar />

      <section className="relative flex min-h-[100svh] flex-1 items-center justify-center overflow-hidden px-4 pb-16 pt-28">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-full w-[120%] -translate-x-1/2"
          style={{
            background: `radial-gradient(circle at top, color-mix(in srgb, ${theme.accentColor} 13%, transparent) 0%, transparent 60%)`,
          }}
        />
        <div className="relative z-10">
          <ErrorContent {...props} />
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
