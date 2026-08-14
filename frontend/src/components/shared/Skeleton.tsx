"use client";

import type { CSSProperties } from "react";
import type { StatCardVariant } from "@/components/shared/StatCard";
import { MotionPulse } from "@/components/motion/MotionPrimitives";

/**
 * Loading placeholders shaped like the content that is coming.
 *
 * A spinner says "wait" and nothing else: the layout jumps when the data
 * lands, and the reader has no idea whether they are waiting for one row or
 * fifty. A skeleton reserves the real space, so the page settles into what was
 * already outlined instead of rearranging itself.
 *
 * Compose the primitives rather than hand-rolling pulsing placeholders — that
 * is how the pulse, the palette and the reduced-motion behaviour stay the same
 * everywhere.
 */

/** Shared surface. Theme-aware, and still legible against a dark panel. */
const SURFACE = "bg-slate-200/70 dark:bg-white/10";

export function Skeleton({
  className = "",
  rounded = "rounded-xl",
  style,
}: {
  className?: string;
  rounded?: string;
  style?: CSSProperties;
}) {
  return (
    <MotionPulse
      aria-hidden="true"
      className={`block ${SURFACE} ${rounded} ${className}`}
      style={style}
    />
  );
}

/**
 * Lines of text. The last one is short, the way a real paragraph ends, so a
 * block of them does not read as a solid slab.
 */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          rounded="rounded-md"
          className={`h-3 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** One card: media band, heading, a couple of lines, then its actions. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 p-4 dark:border-white/10 ${className}`}
    >
      <Skeleton className="mb-4 h-28 w-full" rounded="rounded-xl" />
      <Skeleton className="mb-2 h-4 w-1/2" rounded="rounded-md" />
      <SkeletonText lines={2} />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({
  count = 6,
  className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-label="بارکردن">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/** Rows of even height, matching a table body while it loads. */
export function SkeletonTable({
  rows = 6,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={`space-y-2 ${className}`}
      role="status"
      aria-label="بارکردن"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Label-and-control rows for editor or settings data that has not arrived yet. */
export function SkeletonForm({
  fields = 5,
  className = "",
  showMedia = true,
  announce = true,
}: {
  fields?: number;
  className?: string;
  showMedia?: boolean;
  announce?: boolean;
}) {
  return (
    <div
      className={`space-y-5 ${className}`}
      role={announce ? "status" : undefined}
      aria-label={announce ? "Loading form data" : undefined}
    >
      {showMedia && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 shrink-0" rounded="rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32 max-w-full" rounded="rounded-md" />
            <Skeleton className="h-10 w-40 max-w-full" />
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, index) => (
          <div
            key={index}
            className={
              index === fields - 1 && fields % 2 !== 0 ? "sm:col-span-2" : ""
            }
          >
            <Skeleton className="mb-2 h-3 w-24" rounded="rounded-md" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="mb-3 h-3 w-28" rounded="rounded-md" />
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" rounded="rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Full management-page fallback used while a lazily loaded page bundle arrives. */
export function SkeletonManagementPage({
  cardCount = 6,
  statCount = 6,
}: {
  cardCount?: number;
  statCount?: number;
}) {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading management page"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: statCount }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Skeleton
              className="mb-2 h-7 w-52 max-w-full"
              rounded="rounded-md"
            />
            <Skeleton className="h-3 w-72 max-w-full" rounded="rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid gap-4 border-t border-slate-100 pt-6 dark:border-white/5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cardCount }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Template catalog frame: metrics, category tabs, header, and phone previews. */
export function SkeletonTemplatePage() {
  return (
    <div
      className="min-h-[60vh] space-y-5"
      role="status"
      aria-label="Loading templates"
    >
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-white/10 dark:bg-white/[0.025]">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </div>
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-6 w-44" rounded="rounded-md" />
            <Skeleton className="h-3 w-80 max-w-full" rounded="rounded-md" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid gap-4 border-t border-slate-100 pt-6 dark:border-white/5 lg:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-[552px] items-center justify-center sm:min-h-[680px]"
            >
              <Skeleton
                className="h-[552px] w-[260px] max-w-full border-8 border-slate-300 sm:h-[680px] sm:w-[320px] sm:border-[10px] dark:border-slate-700"
                rounded="rounded-[2.5rem] sm:rounded-[3rem]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Public mini-website frame used while its lazily loaded template arrives. */
export function SkeletonMiniWebsiteTemplate() {
  return (
    <div
      className="min-h-dvh bg-slate-50 dark:bg-[#0f141b]"
      role="status"
      aria-label="Loading mini website"
    >
      <Skeleton className="h-52 w-full sm:h-72" rounded="rounded-none" />
      <div className="relative mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6">
        <Skeleton
          className="-mt-16 h-28 w-28 border-4 border-white dark:border-[#0f141b]"
          rounded="rounded-full"
        />
        <div>
          <Skeleton className="mb-3 h-7 w-52 max-w-full" rounded="rounded-md" />
          <SkeletonText className="max-w-xl" lines={2} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

export type SkeletonDashboardBody = "analytics" | "table" | "form";

/**
 * Complete dashboard frame used by route-level loading boundaries.
 *
 * The desktop sidebar and the header reserve the exact regions owned by the
 * real dashboard shell. On mobile the off-canvas sidebar stays hidden, just as
 * it does after the dashboard has loaded.
 */
export function SkeletonDashboardShell() {
  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-[#161B22] dark:text-gray-100"
      dir="ltr"
    >
      <aside
        aria-hidden="true"
        className="hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#161B22] md:flex"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 p-5 dark:border-white/5">
          <Skeleton className="h-12 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-4 w-24" rounded="rounded-md" />
            <Skeleton className="h-3 w-32" rounded="rounded-md" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-hidden p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex h-11 items-center gap-3 rounded-xl px-4"
            >
              <Skeleton className="h-4 w-4 shrink-0" rounded="rounded-md" />
              <Skeleton
                className={index % 3 === 0 ? "h-3 w-36" : "h-3 w-28"}
                rounded="rounded-md"
              />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 p-4 dark:border-white/10">
          <div className="flex h-11 items-center gap-3 px-4">
            <Skeleton className="h-4 w-4 shrink-0" rounded="rounded-md" />
            <Skeleton className="h-3 w-24" rounded="rounded-md" />
          </div>
        </div>
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header
          aria-hidden="true"
          className="shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#161B22]/80"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
              <Skeleton
                className="h-5 w-32 max-w-[40vw] sm:w-48"
                rounded="rounded-md"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Skeleton className="h-10 w-10 sm:h-11 sm:w-11" />
              <Skeleton className="h-10 w-10 sm:h-11 sm:w-11" />
              <Skeleton className="hidden h-10 w-10 sm:block sm:h-11 sm:w-11" />
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto h-full max-w-7xl overflow-hidden px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
            <SkeletonDashboardPage statCount={4} body="table" />
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Shared dashboard-page frame for data-heavy business surfaces.
 *
 * It preserves the real order—metrics, optional tabs, then the main surface—
 * while the body variant mirrors the kind of content that will replace it.
 */
export function SkeletonDashboardPage({
  statCount = 4,
  tabCount = 0,
  body = "table",
  className = "",
}: {
  statCount?: number;
  tabCount?: number;
  body?: SkeletonDashboardBody;
  className?: string;
}) {
  return (
    <div
      className={`min-h-[55vh] space-y-5 py-1 ${className}`}
      role="status"
      aria-label="Loading dashboard data"
    >
      {statCount > 0 && (
        <div
          className={`grid gap-4 ${statCount > 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4"}`}
        >
          {Array.from({ length: statCount }).map((_, index) => (
            <SkeletonStatCard key={index} />
          ))}
        </div>
      )}
      {tabCount > 0 && (
        <div className="flex gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.025]">
          {Array.from({ length: tabCount }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-9 min-w-24 flex-1"
              rounded="rounded-lg"
            />
          ))}
        </div>
      )}
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Skeleton
              className="mb-2 h-6 w-56 max-w-full"
              rounded="rounded-md"
            />
            <Skeleton className="h-3 w-96 max-w-full" rounded="rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="border-t border-slate-100 pt-6 dark:border-white/5">
          {body === "form" ? (
            <SkeletonForm announce={false} fields={6} showMedia={false} />
          ) : body === "analytics" ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                >
                  <Skeleton className="mb-2 h-4 w-32" rounded="rounded-md" />
                  <Skeleton
                    className="mb-5 h-3 w-48 max-w-full"
                    rounded="rounded-md"
                  />
                  <div className="flex h-36 items-end gap-2">
                    {[45, 72, 58, 88, 66, 94, 76].map((height, barIndex) => (
                      <Skeleton
                        key={barIndex}
                        className="flex-1"
                        rounded="rounded-t-md"
                        // A deterministic chart outline communicates scale without implying data.
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mb-3 grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-3 w-full"
                    rounded="rounded-md"
                  />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Non-interactive modal shell shown while a lazily loaded dialog bundle arrives. */
export function SkeletonModal({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className="modal-ltr fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4"
      role="status"
      aria-label="Loading dialog"
    >
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1c222b] ${wide ? "max-w-4xl" : "max-w-2xl"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/5">
          <div className="min-w-0 flex-1">
            <Skeleton
              className="mb-2 h-6 w-48 max-w-full"
              rounded="rounded-md"
            />
            <Skeleton className="h-3 w-32" rounded="rounded-md" />
          </div>
          <Skeleton className="h-9 w-9 shrink-0" />
        </div>
        <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <Skeleton className="h-2 w-full" rounded="rounded-full" />
        </div>
        <div className="flex-1 overflow-hidden p-5 sm:p-6">
          <SkeletonForm announce={false} />
        </div>
        <div className="flex gap-3 border-t border-slate-100 p-5 dark:border-white/5">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 flex-1" />
        </div>
      </div>
    </div>
  );
}

/** A row of stat tiles, sized like `StatCard`. */
export function SkeletonStatCards({
  count = 2,
  className = "",
  compact = false,
  variant = "standard",
}: {
  count?: number;
  className?: string;
  compact?: boolean;
  variant?: StatCardVariant;
}) {
  return (
    <div
      className={`grid gap-3 sm:gap-4 ${count > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"} ${className}`}
      role="status"
      aria-label="بارکردن"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonStatCard compact={compact} key={index} variant={variant} />
      ))}
    </div>
  );
}

/** Matches every visual presentation exposed by the shared StatCard. */
export function SkeletonStatCard({
  className = "",
  compact = false,
  variant = "standard",
}: {
  className?: string;
  compact?: boolean;
  variant?: StatCardVariant;
}) {
  if (variant === "funnel") {
    return (
      <div
        aria-hidden="true"
        className={`flex min-h-40 flex-col justify-between rounded-3xl border border-slate-200 p-5 dark:border-white/10 ${className}`}
      >
        <Skeleton className="h-11 w-11" rounded="rounded-2xl" />
        <div className="mt-5">
          <Skeleton className="mb-3 h-7 w-2/5" rounded="rounded-md" />
          <Skeleton className="mb-2 h-4 w-1/2" rounded="rounded-md" />
          <SkeletonText lines={2} />
        </div>
      </div>
    );
  }

  if (variant === "live") {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center gap-4 rounded-xl border border-emerald-200 p-5 dark:border-emerald-500/20 ${className}`}
      >
        <Skeleton className="h-3 w-3 shrink-0" rounded="rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-7 w-20" rounded="rounded-md" />
          <Skeleton className="h-3 w-48 max-w-full" rounded="rounded-md" />
        </div>
      </div>
    );
  }

  if (variant === "comparison") {
    return (
      <div aria-hidden="true" className={`p-5 text-center ${className}`}>
        <Skeleton className="mx-auto mb-3 h-7 w-20" rounded="rounded-md" />
        <Skeleton
          className="mx-auto h-3 w-28 max-w-full"
          rounded="rounded-md"
        />
      </div>
    );
  }

  if (variant === "story") {
    return (
      <div
        aria-hidden="true"
        className={`flex min-w-36 flex-col items-center rounded-2xl border border-white/60 bg-white/70 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-800/30 ${className}`}
      >
        <Skeleton className="mb-3 h-7 w-20" rounded="rounded-md" />
        <Skeleton className="h-3 w-16" rounded="rounded-md" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${compact ? "h-[76px] rounded-xl p-3" : "rounded-2xl p-4 sm:p-5 md:p-6"} border border-slate-200 dark:border-white/10 ${className}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <Skeleton
          className={
            compact ? "h-8 w-8 shrink-0" : "h-10 w-10 shrink-0 sm:h-12 sm:w-12"
          }
          rounded={compact ? "rounded-lg" : "rounded-xl"}
        />
        <div className="min-w-0 flex-1">
          <Skeleton
            className={`${compact ? "h-4 w-1/2" : "h-6 w-2/3"} mb-2`}
            rounded="rounded-md"
          />
          <Skeleton className="h-3 w-1/2" rounded="rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** A list of rows that each carry an icon, a label and some figures. */
export function SkeletonList({
  rows = 5,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={`divide-y divide-slate-100 rounded-2xl border border-slate-100 dark:divide-white/5 dark:border-white/10 ${className}`}
      role="status"
      aria-label="بارکردن"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <Skeleton className="h-9 w-9 shrink-0" rounded="rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-3.5 w-1/3" rounded="rounded-md" />
            <Skeleton className="h-2.5 w-1/5" rounded="rounded-md" />
          </div>
          <Skeleton className="h-3.5 w-10 shrink-0" rounded="rounded-md" />
          <Skeleton
            className="hidden h-3.5 w-10 shrink-0 sm:block"
            rounded="rounded-md"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Public homepage shell used while tenant and public-page data resolve on the
 * server. It composes the shared primitives so loading motion and theming stay
 * consistent with dashboard and modal loading states.
 */
export function SkeletonPublicLandingPage() {
  return (
    <main
      className="min-h-screen overflow-hidden bg-[#f8f9fa] text-slate-900 dark:bg-[#0b0d0e] dark:text-white"
      role="status"
      aria-busy="true"
      aria-label="Loading homepage"
    >
      <span className="sr-only">Loading homepage</span>

      <div className="h-[60px] w-full border-b border-transparent bg-transparent">
        <div className="mx-auto flex h-[60px] w-full max-w-[75rem] items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-[30px] shrink-0" rounded="rounded-lg" />
            <Skeleton className="h-4 w-20" rounded="rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton
              className="hidden h-4 w-16 md:block"
              rounded="rounded-md"
            />
            <Skeleton
              className="hidden h-4 w-16 md:block"
              rounded="rounded-md"
            />
            <Skeleton className="size-9" rounded="rounded-lg" />
          </div>
        </div>
      </div>

      <section className="px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <Skeleton
              className="mx-auto h-10 w-[min(42rem,92%)] sm:h-16"
              rounded="rounded-2xl"
            />
            <Skeleton
              className="mx-auto mt-4 h-10 w-[min(32rem,76%)] sm:h-14"
              rounded="rounded-2xl"
            />
            <div className="mx-auto mt-8 max-w-2xl">
              <SkeletonText lines={2} />
            </div>
            <Skeleton
              className="mx-auto mt-8 h-12 w-36"
              rounded="rounded-full"
            />
          </div>

          <div className="mx-auto mt-20 max-w-6xl rounded-[2rem] border border-black/5 bg-white/55 p-4 shadow-2xl shadow-black/5 dark:border-white/10 dark:bg-white/[0.035] sm:p-6">
            <div className="flex gap-2 border-b border-black/5 pb-4 dark:border-white/10">
              <Skeleton className="h-9 w-24" rounded="rounded-lg" />
              <Skeleton className="h-9 w-28" rounded="rounded-lg" />
              <Skeleton
                className="hidden h-9 w-24 sm:block"
                rounded="rounded-lg"
              />
            </div>
            <div className="mt-5 grid h-64 grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-4 sm:h-80 sm:gap-6">
              <div className="space-y-3 rounded-2xl border border-black/5 p-4 dark:border-white/10">
                <Skeleton className="h-5 w-2/3" rounded="rounded-md" />
                <SkeletonText lines={4} />
                <Skeleton className="mt-6 h-10 w-full" rounded="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-full w-full"
                    rounded="rounded-2xl"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto mt-16 flex max-w-4xl items-center justify-center gap-8 overflow-hidden sm:gap-14">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-8 w-24 shrink-0"
                rounded="rounded-lg"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/5 px-5 py-24 dark:border-white/10 sm:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <Skeleton
            className="mx-auto h-12 w-64 max-w-full sm:h-14"
            rounded="rounded-xl"
          />
          <div className="mx-auto mt-8 max-w-3xl">
            <SkeletonText lines={3} />
          </div>
        </div>
      </section>
    </main>
  );
}
