import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { cookies } from "next/headers";
import { getAppBaseUrl } from "@/lib/utils/app-url";
import { AppToaster } from "@/components/shared/AppToaster";
import { GlobalInputLimits } from "@/components/shared/GlobalInputLimits";
import { AppMotionProvider } from "@/components/motion/AppMotionProvider";
import { APP_THEME_COOKIE } from "@/lib/app-theme";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";
import "./globals.css";
import { PublicRouteTracking } from "@/components/analytics/PublicRouteTracking";

/* Embedded in the initial HTML so the browser never waits for a stylesheet or
   image request before it can render the site cursor. */
const criticalCursor =
  'url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICNiNmYyMGQ7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE1NC42NCwyNy41MWMxLjQ2LDEuMjMsMi45MywyLjQ2LDQuNCwzLjY5LDIuODQsMi4zOSw1LjY4LDQuNzksOC41MSw3LjIyLDQuNzIsNC4wMSw5LjUsNy45MywxNC4zMSwxMS44NSw1LjgsNC43NCwxMS41OCw5LjUsMTcuMzYsMTQuMjcsNC44LDMuOTYsOS42MSw3LjkyLDE0LjQyLDExLjg4LDkuMjEsNy41NiwxOC4zOCwxNS4xNywyNy40NSwyMi44OSw1LjA2LDQuMywxMC4yMSw4LjQ0LDE1LjQyLDEyLjU2LDQuNzQsMy44Myw5LjM3LDcuNzgsMTQsMTEuNzMsNC4yLDMuNTYsOC40NCw3LjA2LDEyLjc1LDEwLjQ4LDUuODIsNC42MSwxMS40Nyw5LjM5LDE3LjEzLDE0LjIxLDQuMiwzLjU2LDguNDQsNy4wNiwxMi43NSwxMC40OCw1LjA3LDQuMDEsMTAuMDIsOC4xNSwxNC45NCwxMi4zNCw1LjgzLDQuOTYsMTEuNzQsOS44MSwxNy43MywxNC41OCwxMi40Niw5Ljk4LDI0LjczLDIwLjIxLDM2Ljg4LDMwLjU2LDUuMDYsNC4zLDEwLjIxLDguNDUsMTUuNDIsMTIuNTYsNC43NCwzLjgzLDkuMzcsNy43OCwxNCwxMS43Myw0LjIsMy41Niw4LjQ0LDcuMDYsMTIuNzUsMTAuNDgsMjQuNjMsMTkuNjEsMzcuNzQsMzUuNjksMzkuMzQsNDguMjUsMS4yMSwxNS43Ni0uOTEsMjguNTgtMTAuNzQsNDEuNC04LjIzLDguODctMTguNTEsMTcuNS0zMS4xMiwxOC4zNi0uODksMC0xLjc5LDAtMi43MS4wMi0xLjA0LDAtMi4wNi4wMi0zLjEzLjAzLTEuMTIsMC0yLjI1LDAtMy4zOSwwLTEuMTksMC0yLjM3LjAyLTMuNi4wMy0yLjU4LjAyLTUuMTcuMDMtNy43NC4wNS00LjEuMDItOC4xOS4wNS0xMi4zLjA5LTExLjY1LjA5LTIzLjMxLjE3LTM0Ljk2LjIzLTcuMTMuMDQtMTQuMjcuMS0yMS40LjE2LTIuNzEuMDItNS40MS4wNC04LjEyLjA1LTM0LjY1LjE1LTY1LjQ3LDQuNjMtOTEuNzQsMjkuNjEtNi4yMSw2LjQyLTExLjMzLDEzLjgxLTE2LjU3LDIxLjAxLTQuMSw1LjU4LTguMzMsMTEuMDQtMTIuNTQsMTYuNTMtNi44OSw5LjAzLTEzLjc0LDE4LjExLTIwLjU1LDI3LjIxLTEuNiwyLjE0LTMuMjEsNC4yOC00LjgxLDYuNDItMy4xLDQuMTMtNi4xOCw4LjI3LTkuMjUsMTIuNDItMTAuOTcsMTQuNzUtMjEuNzYsMjkuMi00MC45MiwzMi44MS0xNy40NSwxLjExLTMxLjU2LS4xMy00NS40OC0xMS44MS0xMS4wNi0xMC41OS0xNi42My0yMy4yOC0xNy4zOC0zOC40OS0uMDgtMS40OC0uMTYtMi45OC0uMjMtNC41MS0uMDgtMS42My0uMTYtMy4yNS0uMjMtNC45My0uMDktMS43NS0uMTgtMy41LS4yNi01LjI0LS4yNC00Ljc5LS40OC05LjYtLjcxLTE0LjM5LS4yNS01LjE2LS41MS0xMC4zMS0uNzctMTUuNDctLjYyLTEyLjM5LTEuMjMtMjQuOC0xLjg0LTM3LjE5LS4yOC01LjgzLS41OC0xMS42NS0uODYtMTcuNDgtLjA2LTEuMTYtLjEyLTIuMzMtLjE4LTMuNTItLjEyLTIuMzUtLjIzLTQuNzEtLjM1LTcuMDUtLjI5LTUuOTUtLjU5LTExLjg5LS44OC0xNy44NC0uMDYtMS4xOS0uMTItMi4zNy0uMTgtMy41OS0uMzYtNy4yOC0uNzEtMTQuNTUtMS4wNy0yMS44My0xLjUtMzAuNzMtMy4wNi02MS40Ni00LjY0LTkyLjE5LS43Mi0xNC0xLjQzLTI4LjAyLTIuMTMtNDIuMDItLjU3LTExLjIxLTEuMTQtMjIuNDMtMS43My0zMy42NC0uNC03LjY3LS43OS0xNS4zMi0xLjE3LTIyLjk5LS4yMS00LjM5LS40NC04Ljc4LS42OC0xMy4xNy0xLjg2LTM0LjQ0LDIuNTMtNTguNzQsMTMuMTUtNzIuOTEsMjcuNDYtMzAuMzIsNjUuODUtMjEuNiw5My41OSwyLjExaC4wMloiLz4KPC9zdmc+Cg==") 10 2, default';

const multiTreeThemeStyle = {
  "--multitree-accent": MULTITREE_ACCENT_COLOR,
} as CSSProperties;

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: "MultiTree",
  description:
    "MultiTree connects communities with networking opportunities tailored for growth and support.",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
      style={multiTreeThemeStyle}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#ffffff" />
        {/* Prevent browser caching of HTML pages */}
        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* Safari/iOS specific meta tags - Required for proper iPhone functionality */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
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
              __html: `:where(html,body,body *){cursor:${criticalCursor}!important}`,
            }}
          />
          <div
            data-theme-background
            className="relative min-h-screen w-full overflow-x-clip text-slate-900 dark:text-white"
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
