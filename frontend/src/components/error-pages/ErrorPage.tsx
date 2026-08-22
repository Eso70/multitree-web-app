"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";
import { PublicMarketingSiteShell } from "@/components/public/PublicMarketingSiteShell";
import { PublicHeroAccentBackdrop } from "@/components/public/PublicHeroAccentBackdrop";
import { BusinessPublicFooter } from "@/components/business/BusinessPublicFooter";
import { HomeFooter } from "@/components/home/HomeFooter";
import { BUSINESS_LANDING_SECTION_HREFS } from "@/components/business/business-landing-sections";
import { getMultiTreeAccentInk } from "@/lib/multitree-theme";
import { applyBusinessTabBranding } from "@/lib/utils/business-error-theme";
import { MARKETING_NAVIGATION } from "@/features/public-site/marketing-content";
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

/**
 * One shell for every error surface. MultiTree, platform-console, and business
 * errors differ only in branding, navigation, and footer content; the page
 * frame, grid backdrop, hero atmosphere, spacing, and light/dark behavior come
 * from the same `PublicMarketingSiteShell` the public sites use. Do not
 * reintroduce a scope-specific layout branch here — the root domain had one,
 * and it silently drifted off the grid backdrop and the shared dark surface.
 */
export function ErrorPage(props: ErrorPageProps) {
  const { theme, homeHref } = props;
  const isBusiness = theme.scope === "business";
  const isMultiTree = theme.scope === "multitree";
  const brandName = theme.name || (isBusiness ? "Business" : "MultiTree");
  const footer = theme.footer;

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

  const phoneDigits = (footer?.phone || "").replace(/\D/g, "");
  const whatsappHref =
    phoneDigits.length >= 8 ? `https://wa.me/${phoneDigits}` : null;

  const navigationItems = isBusiness
    ? [
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
      ]
    : MARKETING_NAVIGATION;

  // Only the root domain offers account actions. A business subdomain shows its
  // own contact action, and the platform console must not advertise signup.
  const primaryAction = isBusiness
    ? footer?.whatsappEnabled && whatsappHref
      ? { label: "پەیوەندی", href: whatsappHref, external: true }
      : null
    : isMultiTree
      ? { label: "هەژمار دروست بکە", href: "/signup" }
      : null;

  return (
    <PublicMarketingSiteShell
      accentColor={theme.accentColor}
      brandName={brandName}
      logo={theme.logo}
      homeHref={homeHref}
      navigationItems={navigationItems}
      primaryAction={primaryAction}
      secondaryAction={
        isMultiTree ? { label: "چوونەژوورەوە", href: "/login" } : null
      }
      emphasizeFirstNavItem={false}
      footer={
        isMultiTree ? (
          <HomeFooter />
        ) : (
          <BusinessPublicFooter
            businessName={brandName}
            accentColor={theme.accentColor}
            logo={theme.logo}
            description={
              footer?.description || `${brandName}'s official public website.`
            }
            phone={footer?.phone ?? null}
            whatsappEnabled={footer?.whatsappEnabled ?? null}
            advertisingEnabled={footer?.advertisingEnabled ?? false}
            brandingRemoved={footer?.brandingRemoved ?? false}
            linktrees={footer?.linktrees ?? []}
            miniWebsites={footer?.miniWebsites ?? []}
            homeHref={homeHref}
          />
        )
      }
    >
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pb-16 pt-28">
        <PublicHeroAccentBackdrop accentColor={theme.accentColor} />
        <div className="relative z-10">
          <ErrorContent {...props} />
        </div>
      </section>
    </PublicMarketingSiteShell>
  );
}
