import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { getAppBaseUrl } from "@/lib/utils/app-url";
import { AppToaster } from "@/components/shared/AppToaster";
import { GlobalInputLimits } from "@/components/shared/GlobalInputLimits";
import { AppMotionProvider } from "@/components/motion/AppMotionProvider";
import { APP_THEME_COOKIE } from "@/lib/app-theme";
import {
  SPONSOR_KRD_ACCENT_COLOR,
  SPONSOR_KRD_ACCENT_GRADIENT,
} from "@/lib/sponsor-krd-theme";
import "./globals.css";
import { PublicRouteTracking } from "@/components/analytics/PublicRouteTracking";

/* Applied in the initial HTML while the full stylesheet initializes. */
const criticalCursor =
  'url("/cursors/customCursor.svg") 10 2, default';

const sponsorKrdThemeStyle = {
  "--sponsor-krd-accent": SPONSOR_KRD_ACCENT_COLOR,
  "--sponsor-krd-accent-gradient": SPONSOR_KRD_ACCENT_GRADIENT,
  "--sponsor-krd-brand-accent": SPONSOR_KRD_ACCENT_COLOR,
  "--sponsor-krd-brand-gradient": SPONSOR_KRD_ACCENT_GRADIENT,
} as CSSProperties;

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: "Sponsor.krd",
  description:
    "Sponsor.krd connects communities with networking opportunities tailored for growth and support.",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: SPONSOR_KRD_ACCENT_COLOR,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover", // For devices with notches
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialTheme = (await cookies()).get(APP_THEME_COOKIE)?.value;

  return (
    <html
      className={initialTheme === "dark" ? "dark" : undefined}
      lang="en"
      dir="ltr"
      style={sponsorKrdThemeStyle}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content={SPONSOR_KRD_ACCENT_COLOR} />
        {/* Prevent browser caching of HTML pages */}
        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="format-detection" content="telephone=no" />
        {/* Browser compatibility meta tags */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <link
          rel="preload"
          href="/cursors/customCursor.svg"
          as="image"
          type="image/svg+xml"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="/cursors/customTextSelect.svg"
          as="image"
          type="image/svg+xml"
          fetchPriority="high"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AppMotionProvider>
          <GlobalInputLimits />
          <style
            id="critical-custom-cursor"
            dangerouslySetInnerHTML={{
              __html: `:where(html,body,body *){cursor:${criticalCursor}}`,
            }}
          />
          <div
            data-theme-background
            className="relative min-h-screen min-h-[100dvh] w-full overflow-x-clip text-slate-900 dark:text-white"
            style={{
              background: `linear-gradient(to bottom right, var(--theme-bg-from, #f8fafc), var(--theme-bg-via, #ffffff), var(--theme-bg-to, #f1f5f9))`,
              backgroundAttachment: "scroll", // Safari/iOS: Use scroll instead of fixed for better performance
              backgroundSize: "200% 200%",
              contain: "layout style", // Performance optimization (removed 'paint' to not break position: fixed)
              isolation: "isolate", // Create new stacking context
            }}
            suppressHydrationWarning
          >
            <div className="relative z-10" suppressHydrationWarning>
              {children}
            </div>
          </div>
          <AppToaster />
          <PublicRouteTracking />
        </AppMotionProvider>
      </body>
    </html>
  );
}
