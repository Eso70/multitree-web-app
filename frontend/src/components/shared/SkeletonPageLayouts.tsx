"use client";

import { Skeleton, SkeletonStatCard } from "@/components/shared/Skeleton";

function SkeletonPageHeader({ actions = 4 }: { actions?: number }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <Skeleton className="size-11 shrink-0" rounded="rounded-xl" />
        <div className="min-w-0 flex-1 pt-0.5">
          <Skeleton className="mb-2 h-6 w-52 max-w-full" rounded="rounded-md" />
          <Skeleton className="h-3 w-96 max-w-full" rounded="rounded-md" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {Array.from({ length: actions }).map((_, index) => (
          <Skeleton
            key={index}
            className={
              index === actions - 1
                ? "h-10 w-28"
                : index === 1
                  ? "h-10 w-36"
                  : "h-10 w-10"
            }
            rounded="rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonLinktreeCard({
  showPageMeta = true,
}: {
  showPageMeta?: boolean;
}) {
  return (
    <article
      aria-hidden="true"
      className="flex min-h-80 flex-col border-b border-slate-200 bg-transparent p-4 dark:border-white/10 sm:p-5 md:p-6 lg:border-r xl:border-b-0"
    >
      <div className="relative mb-3 flex items-start gap-3">
        <Skeleton
          className="size-10 shrink-0 sm:size-14"
          rounded="rounded-full"
        />
        <div className="min-w-0 flex-1 pr-16 sm:pr-20">
          <Skeleton className="mb-2 h-4 w-1/2" rounded="rounded-md" />
          <Skeleton className="mb-2 h-3 w-4/5" rounded="rounded-md" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16" rounded="rounded-full" />
            <Skeleton className="h-5 w-20" rounded="rounded-full" />
          </div>
        </div>
        <Skeleton
          className="absolute top-0 right-0 h-4 w-12"
          rounded="rounded-full"
        />
      </div>
      <Skeleton className="mb-3 h-3 w-3/4" rounded="rounded-md" />
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.035]">
        <Skeleton className="mb-2 h-3 w-12" rounded="rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 flex-1" rounded="rounded-md" />
          <Skeleton className="size-6 shrink-0" rounded="rounded-lg" />
        </div>
      </div>
      {showPageMeta ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Skeleton className="h-10 w-full" rounded="rounded-lg" />
            <Skeleton className="h-10 w-full" rounded="rounded-lg" />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Skeleton className="h-8 w-full" rounded="rounded-lg" />
            <Skeleton className="h-8 w-full" rounded="rounded-lg" />
          </div>
        </>
      ) : null}
      <div className="mt-auto flex items-center gap-1 sm:gap-1.5 border-t border-slate-200 pt-2.5 dark:border-white/10">
        <Skeleton className="h-8 flex-1" rounded="rounded-lg" />
        <Skeleton className="h-8 flex-1" rounded="rounded-lg" />
        <Skeleton className="size-8 shrink-0" rounded="rounded-lg" />
        <Skeleton className="size-8 shrink-0" rounded="rounded-lg" />
        <Skeleton className="size-8 shrink-0" rounded="rounded-lg" />
        <Skeleton className="size-8 shrink-0" rounded="rounded-lg" />
      </div>
    </article>
  );
}

export function SkeletonLinktreeGrid({
  count = 6,
  showPageMeta = true,
  announce = true,
}: {
  count?: number;
  showPageMeta?: boolean;
  announce?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-0 lg:grid-cols-2 xl:grid-cols-3"
      role={announce ? "status" : undefined}
      aria-busy={announce ? "true" : undefined}
      aria-label={announce ? "Loading page cards" : undefined}
      dir="ltr"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLinktreeCard key={index} showPageMeta={showPageMeta} />
      ))}
    </div>
  );
}

/** Exact initial layout shared by Linktree and mini-website management pages. */
export function SkeletonPageManagement({
  showTabs = false,
}: {
  showTabs?: boolean;
}) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading page management">
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      {showTabs ? (
        <div className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.025]">
          <Skeleton className="h-10 flex-1" rounded="rounded-lg" />
          <Skeleton className="h-10 flex-1" rounded="rounded-lg" />
        </div>
      ) : null}
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-6">
        <SkeletonPageHeader actions={5} />
        <div className="border-t border-slate-100 pt-6 dark:border-white/5">
          <SkeletonLinktreeGrid announce={false} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSettingsPage({ tabCount = 4 }: { tabCount?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading settings"
      className="space-y-5"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.025]">
        {Array.from({ length: tabCount }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-10 min-w-24 flex-1"
            rounded="rounded-lg"
          />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-6">
        <SkeletonPageHeader actions={1} />
        <div className="mt-6 space-y-5 border-t border-slate-100 pt-6 dark:border-white/5">
          <div className="flex items-center justify-center gap-5">
            <Skeleton className="size-24" rounded="rounded-2xl" />
            <Skeleton className="size-20" rounded="rounded-2xl" />
            <Skeleton className="size-16" rounded="rounded-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="mb-2 h-3 w-24" rounded="rounded-md" />
                <Skeleton className="h-11 w-full" rounded="rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonAdvertisingEditor() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading advertising editor"
      className="space-y-5"
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.025]">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-10 min-w-28 flex-1"
            rounded="rounded-lg"
          />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-6">
        <SkeletonPageHeader actions={2} />
        <div className="mt-6 grid gap-5 border-t border-slate-100 pt-6 dark:border-white/5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={index > 1 ? "sm:col-span-2" : ""}>
              <Skeleton className="mb-2 h-3 w-28" rounded="rounded-md" />
              <Skeleton
                className={index > 1 ? "h-24 w-full" : "h-11 w-full"}
                rounded="rounded-xl"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonTikTokPixelConfig({
  announce = true,
}: { announce?: boolean } = {}) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-6"
      role={announce ? "status" : undefined}
      aria-busy={announce ? "true" : undefined}
      aria-label={announce ? "Loading TikTok configuration" : undefined}
    >
      <SkeletonPageHeader actions={0} />
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-white/5">
        <div className="flex-1">
          <Skeleton className="mb-2 h-4 w-48" rounded="rounded-md" />
          <Skeleton className="h-3 w-80 max-w-full" rounded="rounded-md" />
        </div>
        <Skeleton className="h-10 w-36" rounded="rounded-xl" />
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.035]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8" rounded="rounded-lg" />
            <Skeleton className="h-4 w-28" rounded="rounded-md" />
          </div>
          <Skeleton className="size-8" rounded="rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="mb-2 h-3 w-28" rounded="rounded-md" />
              <Skeleton className="h-11 w-full" rounded="rounded-xl" />
              {index === 1 ? (
                <Skeleton className="mt-2 h-3 w-4/5" rounded="rounded-md" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="mt-5 h-28 w-full" rounded="rounded-2xl" />
      <div className="mt-5 flex justify-end border-t border-slate-100 pt-5 dark:border-white/5">
        <Skeleton className="h-10 w-32" rounded="rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTikTokPage() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading TikTok settings"
      className="space-y-5"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.025]">
        <Skeleton className="h-10 flex-1" rounded="rounded-lg" />
        <Skeleton className="h-10 flex-1" rounded="rounded-lg" />
      </div>
      <SkeletonTikTokPixelConfig announce={false} />
    </div>
  );
}

export function SkeletonTikTokDelivery() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading TikTok delivery"
      className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-6"
    >
      <SkeletonPageHeader actions={1} />
      <div className="grid gap-3 border-t border-slate-100 py-5 dark:border-white/5 sm:grid-cols-2">
        <Skeleton className="h-11 w-full" rounded="rounded-xl" />
        <Skeleton className="h-11 w-full" rounded="rounded-xl" />
      </div>
      <Skeleton className="mb-6 h-24 w-full" rounded="rounded-2xl" />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
        <Skeleton className="mb-2 h-4 w-44" rounded="rounded-md" />
        <Skeleton className="mb-5 h-3 w-80 max-w-full" rounded="rounded-md" />
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-white/5">
          <SkeletonStatCard variant="comparison" />
          <SkeletonStatCard variant="comparison" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonClientAccessPage() {
  const rows = [
    { hasSession: false, hasPage: false, actions: 1 },
    { hasSession: true, hasPage: true, actions: 1 },
    { hasSession: false, hasPage: true, actions: 0 },
  ] as const;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading client invitations"
      className="w-full space-y-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6"
    >
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-5 md:mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4 xl:gap-6">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Skeleton
            className="size-10 shrink-0 sm:size-11"
            rounded="rounded-xl"
          />
          <div className="min-w-0 pt-0.5">
            <Skeleton className="h-6 w-52 max-w-full" rounded="rounded-md" />
            <Skeleton
              className="mt-2 h-3 w-xl max-w-full"
              rounded="rounded-md"
            />
          </div>
        </div>
        <div className="flex w-full justify-end lg:w-auto lg:shrink-0">
          <Skeleton className="h-10 w-40" rounded="rounded-xl" />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5 dark:border-white/5">
        <div className="space-y-4">
          {rows.map((row, index) => (
            <article
              key={index}
              className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:p-5"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-4 w-36" rounded="rounded-md" />
                    <Skeleton className="h-6 w-16" rounded="rounded-full" />
                    {row.hasSession ? (
                      <Skeleton className="h-6 w-24" rounded="rounded-full" />
                    ) : null}
                  </div>
                  <Skeleton className="mt-2 h-3 w-40" rounded="rounded-md" />
                  {row.hasPage ? (
                    <Skeleton className="mt-2 h-5 w-52" rounded="rounded-md" />
                  ) : null}
                </div>
                {row.actions > 0 ? (
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {Array.from({ length: row.actions }).map(
                      (_, actionIndex) => (
                        <Skeleton
                          key={actionIndex}
                          className="h-9 w-36"
                          rounded="rounded-xl"
                        />
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonBusinessDirectoryPage() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading business directory">
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      <div className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.025]">
        <Skeleton className="h-10 flex-1" rounded="rounded-lg" />
        <Skeleton className="h-10 flex-1" rounded="rounded-lg" />
      </div>
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1c222b] sm:p-6">
        <SkeletonPageHeader actions={4} />
        <div className="grid grid-cols-1 gap-0 border-t border-slate-100 pt-6 dark:border-white/5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <article
              key={index}
              className="flex min-h-72 flex-col border-b border-slate-100 p-4 dark:border-white/5 sm:border-r"
            >
              <div className="mb-3 flex items-start gap-3">
                <Skeleton className="size-14 shrink-0" rounded="rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="mb-2 h-4 w-1/2" rounded="rounded-md" />
                  <Skeleton className="mb-2 h-3 w-1/3" rounded="rounded-md" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" rounded="rounded-full" />
                    <Skeleton className="h-5 w-20" rounded="rounded-full" />
                  </div>
                </div>
                <Skeleton className="size-10 shrink-0" rounded="rounded-xl" />
              </div>
              <Skeleton className="mb-3 h-11 w-full" rounded="rounded-xl" />
              <div className="mb-3 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((__, fieldIndex) => (
                  <Skeleton
                    key={fieldIndex}
                    className="h-10 w-full"
                    rounded="rounded-lg"
                  />
                ))}
              </div>
              <div className="mt-auto flex gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
                {Array.from({ length: 4 }).map((__, actionIndex) => (
                  <Skeleton
                    key={actionIndex}
                    className="h-9 flex-1"
                    rounded="rounded-xl"
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
