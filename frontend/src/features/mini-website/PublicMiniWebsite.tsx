"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { TikTokPixel } from "@/components/analytics/TikTokPixel";
import { CustomScrollbar } from "@/components/home/CustomScrollbar";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import { createPageTracker } from "@/features/analytics/page-tracking";
import { MiniWebsiteTemplateRenderer } from "@/components/templates/mini-website";
import type { MiniWebsite } from "./types";

/** How long a section must stay on screen before it counts as read. */
const SECTION_DWELL_MS = 1_000;
/** How long on the page before the visit counts as engaged. */
const ENGAGED_AFTER_MS = 15_000;

export function PublicMiniWebsite({
  profile,
  subdomain,
  leadFormEndpoint,
}: {
  profile: MiniWebsite;
  subdomain?: string;
  leadFormEndpoint?: string;
}) {
  // One tracker for the page. Rebuilding it on every render would reset the
  // dedupe window and let a jittery scroll report the same section twice.
  const analytics = useMemo(
    () => profile.analytics ?? { pixelIds: [], actions: {} },
    [profile.analytics],
  );
  const tracker = useMemo(
    () =>
      createPageTracker({
        pageId: profile.id,
        pageName: profile.name,
        contentType: "mini_website",
        analytics,
        description: profile.headline || undefined,
      }),
    [analytics, profile.headline, profile.id, profile.name],
  );
  const mainRef = useRef<HTMLElement>(null);
  // Next.js keeps this mounted when moving between two public pages, so the
  // pixel needs the path to know a different page is now being viewed.
  const pathname = usePathname();

  useEffect(() => {
    tracker.trackView();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, [tracker]);

  // A mini website is long, so time on the page says more than arriving on it.
  useEffect(() => {
    const timer = window.setTimeout(
      () => tracker.trackEngagement("engaged_view", { once: true }),
      ENGAGED_AFTER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [tracker]);

  /**
   * Which sections were actually reached.
   *
   * A linktree is one screen, so a view is the whole story. A mini website can
   * run to twenty sections, and knowing that nobody scrolls as far as the
   * pricing table is the point of measuring it at all. Reported once each,
   * after a short dwell, so a fast scroll to the footer does not mark every
   * section on the way as read.
   */
  useEffect(() => {
    const root = mainRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>("[id^='portfolio-']"),
    );
    if (!sections.length) return;

    const timers = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = entry.target.id.replace("portfolio-", "");
          if (!entry.isIntersecting) {
            const pending = timers.get(entry.target);
            if (pending) {
              window.clearTimeout(pending);
              timers.delete(entry.target);
            }
            continue;
          }
          if (timers.has(entry.target)) continue;
          timers.set(
            entry.target,
            window.setTimeout(() => {
              timers.delete(entry.target);
              tracker.trackEngagement("action_open", {
                actionKey: `mini:section:${key}`,
                label: key,
                once: true,
                properties: { section: key },
              });
              // The form is the one section worth its own event: reaching it is
              // the step before a lead, and the gap between the two is the
              // number worth watching.
              if (key === "leadForm") {
                tracker.trackEngagement("form_view", {
                  actionKey: "mini:leadForm",
                  label: "فۆرمی داواکاری",
                  once: true,
                });
              }
              observer.unobserve(entry.target);
            }, SECTION_DWELL_MS),
          );
        }
      },
      { threshold: 0.35 },
    );
    for (const section of sections) observer.observe(section);
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [tracker]);

  return (
    <ThemeProvider
      websiteColor={profile.accentColor || profile.businessWebsiteColor || null}
    >
      <TikTokPixel pixelIds={analytics.pixelIds} pageKey={pathname} />
      <CustomScrollbar />
      <main
        ref={mainRef}
        className="min-h-[100svh] w-full overflow-x-hidden bg-transparent"
        onClickCapture={(event) => {
          const target = event.target as HTMLElement;
          const anchor = target.closest("a");
          if (anchor instanceof HTMLAnchorElement) {
            tracker.trackAnchor(anchor);
            return;
          }
          // Buttons that open something in place — a photo, a player, an
          // answer — never navigate, so they carry the key themselves.
          const opener = target.closest<HTMLElement>("[data-mini-open]");
          if (opener?.dataset.miniOpen) {
            tracker.trackEngagement("action_open", {
              actionKey: opener.dataset.miniOpen,
              label: opener.dataset.miniOpenLabel || opener.textContent?.trim(),
              properties: { interaction: "open" },
            });
            return;
          }
          // Opening a photo full screen reuses the lightbox's own markers
          // rather than adding a second set of attributes beside them.
          const media = target.closest<HTMLElement>("[data-mini-image-src]");
          if (media) {
            const group = media.dataset.miniImageGroup || "page";
            tracker.trackEngagement("action_open", {
              actionKey: `mini:media:${group}`,
              label: media.dataset.miniImageAlt || group,
              properties: { interaction: "lightbox", group },
            });
          }
        }}
      >
        <MiniWebsiteTemplateRenderer
          templateId={profile.templateKey}
          profile={profile}
          viewport="desktop"
          interactive
          fullPage
          // Built here rather than inside the template: only this component
          // knows which subdomain served the page, and the form must post to
          // the page it is actually on.
          leadFormEndpoint={
            leadFormEndpoint ||
            `/api/public/mini-websites/${encodeURIComponent(
              subdomain || "",
            )}/${encodeURIComponent(profile.slug)}/leads`
          }
          // The lead endpoint records the event itself, so only the pixel half
          // is fired here — under the same id, which is what lets TikTok treat
          // the pair as one conversion.
          onLeadSubmitted={(eventId) =>
            tracker.trackServerConversion("mini:leadForm", eventId)
          }
        />
      </main>
    </ThemeProvider>
  );
}
