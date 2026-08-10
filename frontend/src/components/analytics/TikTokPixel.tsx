"use client";

import { useEffect, useMemo } from "react";
import {
  loadTikTokPixel,
  reportTikTokPageView,
} from "@/features/analytics/tiktok-dispatch";
import { isValidPixelId } from "@/features/analytics/tiktok-base-code-snippet";
import { analyticsConsent } from "@/lib/utils/client-queue";

interface TikTokPixelProps {
  pixelIds?: string[] | null;
  /** Changes when a soft navigation lands on a different page. */
  pageKey?: string;
}

/** At most three, deduped: more than that is a configuration mistake, not a plan. */
function normalizePixelIds(pixelIds?: string[] | null): string[] {
  return [
    ...new Set(
      (pixelIds || []).map((pixelId) => pixelId.trim()).filter(isValidPixelId),
    ),
  ].slice(0, 3);
}

/**
 * Loads a business's TikTok pixels and reports the page view.
 *
 * Only the public linktree page and the public mini website page may mount
 * this. `pixel-placement.spec.ts` enforces that; docs/tracking.md explains why.
 */
export function TikTokPixel({
  pixelIds,
  pageKey,
}: TikTokPixelProps): React.ReactElement | null {
  const normalizedPixelIds = useMemo(
    () => normalizePixelIds(pixelIds),
    [pixelIds],
  );

  // Consent is read per mount: a page loaded after a denial must not start the
  // SDK at all. This mirrors the tracker's own gate — one rule, both halves.
  const consentDenied = useMemo(() => analyticsConsent() === "denied", []);

  // Compared by value, not identity. A parent that rebuilds its props array on
  // every render would otherwise re-run the effects below each time and report
  // a page view per render.
  const pixelKey = consentDenied ? "" : normalizedPixelIds.join(",");

  useEffect(() => {
    if (!pixelKey) return;
    for (const pixelId of pixelKey.split(",")) loadTikTokPixel(pixelId);
  }, [pixelKey]);

  // Separate from loading so a route change replays only the page view.
  useEffect(() => {
    if (!pixelKey) return;
    reportTikTokPageView();
  }, [pixelKey, pageKey]);

  return null;
}
