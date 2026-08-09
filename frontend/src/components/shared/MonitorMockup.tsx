"use client";

import type { ReactNode } from "react";
import { useNearViewport } from "@/hooks/useNearViewport";
import { LockedItemOverlay } from "@/components/shared/LockedContent";
import { Skeleton } from "@/components/shared/Skeleton";

/**
 * Desktop-monitor device frame for previewing content meant to be viewed
 * at desktop width (e.g. mini-website templates) instead of a phone.
 *
 * The screen is a fixed-aspect, fluid-width viewport: it scales with its
 * container via container-query `zoom` (see `.monitor-preview-canvas` in
 * globals.css), so it stays correctly proportioned on any card size or
 * device instead of snapping between fixed breakpoints. The rendered
 * content itself keeps its real desktop layout and height, so the screen
 * stays scrollable rather than being squeezed to fit.
 */
export function MonitorMockup({
  name,
  ariaLabel,
  darkTheme = false,
  locked = false,
  deferContent = true,
  children,
}: {
  name: string;
  ariaLabel: string;
  darkTheme?: boolean;
  locked?: boolean;
  deferContent?: boolean;
  children: ReactNode;
}) {
  const { ref, isNear } = useNearViewport();

  return (
    <div
      ref={ref}
      className="mx-auto flex w-full min-w-0 flex-col items-center gap-0"
    >
      <div className="relative w-full rounded-xl border-[6px] border-slate-800 bg-gradient-to-b from-slate-800 to-slate-900 p-0 shadow-xl sm:rounded-2xl sm:border-[10px]">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-1 w-1 -translate-x-1/2 -translate-y-px rounded-full bg-slate-600" />

        <div
          className="monitor-preview-frame relative aspect-[16/10] w-full overflow-y-auto overflow-x-hidden overscroll-contain rounded-[3px] bg-white sm:rounded-[6px]"
          style={{ colorScheme: darkTheme ? "dark" : "light" }}
          aria-label={ariaLabel}
        >
          {!deferContent || isNear ? (
            <div className="monitor-preview-canvas pointer-events-none">
              {children}
            </div>
          ) : (
            <Skeleton className="h-full w-full" rounded="rounded-none" />
          )}
        </div>

        {locked && (
          <LockedItemOverlay
            label="ئەم قالبە لە پلانی ئێستاتدا بەردەست نییە"
            roundedClassName="rounded-xl sm:rounded-2xl"
          />
        )}
      </div>

      <div className="h-3 w-10 shrink-0 bg-gradient-to-b from-slate-700 to-slate-800 sm:h-5 sm:w-14" />
      <div className="h-1.5 w-24 shrink-0 rounded-full bg-slate-800/90 sm:h-2 sm:w-32" />

      <span className="mt-2 max-w-full truncate text-[10px] font-bold text-slate-500 sm:text-[11px]">
        {name}
      </span>
    </div>
  );
}
