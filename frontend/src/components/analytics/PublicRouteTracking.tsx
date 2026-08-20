"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { PublicRouteTracking as PublicRouteTrackingData } from "@linktree/types";
import { TikTokPixel } from "./TikTokPixel";
import { createPageTracker } from "@/features/analytics/page-tracking";

function routeKey(pathname: string): string | null {
  if (pathname === "/") return "home";
  if (pathname === "/advertising") return "advertising";
  if (pathname === "/advertising/video-code") return "advertising-video-code";
  if (pathname === "/join") return "join";
  if (pathname === "/join/application") return "join-application";
  return null;
}

/** Automatic tracking for the explicit fixed-route marketing allowlist. */
export function PublicRouteTracking(): React.ReactElement | null {
  const pathname = usePathname();
  const key = routeKey(pathname);
  const [loaded, setLoaded] = useState<{
    key: string;
    data: PublicRouteTrackingData;
  } | null>(null);
  const tracking = loaded?.key === key ? loaded.data : null;

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    void fetch(`/api/public/tracking/${key}`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json();
        return (payload?.data ?? null) as PublicRouteTrackingData | null;
      })
      .then((value) => {
        if (!controller.signal.aborted && value)
          setLoaded({ key, data: value });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [key]);

  useEffect(() => {
    if (!tracking) return;
    const tracker = createPageTracker({
      pageId: tracking.pageId,
      pageName: tracking.pageName,
      contentType: tracking.contentType,
      analytics: tracking.analytics,
    });
    tracker.trackView();
  }, [tracking]);

  return tracking ? (
    <TikTokPixel
      pixelIds={tracking.analytics.pixelIds}
      pageKey={`${tracking.pageId}:${pathname}`}
    />
  ) : null;
}
