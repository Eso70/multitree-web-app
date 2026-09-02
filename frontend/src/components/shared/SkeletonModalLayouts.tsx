"use client";

import { Skeleton, SkeletonStatCard } from "@/components/shared/Skeleton";

function ModalFrame({
  children,
  footer = false,
  progress = false,
  maxWidth = "max-w-4xl",
  label,
}: {
  children: React.ReactNode;
  footer?: boolean;
  progress?: boolean;
  maxWidth?: string;
  label: string;
}) {
  return (
    <div
      className="modal-ltr fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-2 backdrop-blur-sm sm:p-4"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1c222b] ${maxWidth}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 dark:border-white/5 sm:p-6">
          <div className="min-w-0 flex-1">
            <Skeleton
              className="mb-2 h-6 w-52 max-w-full"
              rounded="rounded-md"
            />
            <Skeleton className="h-3 w-40 max-w-full" rounded="rounded-md" />
          </div>
          <Skeleton className="size-9 shrink-0" rounded="rounded-xl" />
        </div>
        {progress ? (
          <div className="grid grid-cols-3 gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <Skeleton className="size-7 shrink-0" rounded="rounded-full" />
                <Skeleton className="h-3 flex-1" rounded="rounded-md" />
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex-1 overflow-hidden p-5 sm:p-6">{children}</div>
        {footer ? (
          <div className="flex gap-3 border-t border-slate-100 p-5 dark:border-white/5 sm:justify-end">
            <Skeleton
              className="h-11 flex-1 sm:max-w-28"
              rounded="rounded-xl"
            />
            <Skeleton
              className="h-11 flex-1 sm:max-w-36"
              rounded="rounded-xl"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Mirrors the complete first step of the shared Linktree editor. */
export function SkeletonLinktreeEditorModal() {
  return (
    <ModalFrame
      label="Loading Linktree editor"
      progress
      footer
      maxWidth="max-w-2xl"
    >
      <SkeletonLinktreeBasicInfo />
    </ModalFrame>
  );
}

export function SkeletonLinktreeBasicInfo() {
  return (
    <div
      className="max-h-[58vh] space-y-5 overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="Loading Linktree information"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 shrink-0" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32" rounded="rounded-md" />
          <Skeleton className="h-10 w-40" rounded="rounded-xl" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="mb-2 h-3 w-24" rounded="rounded-md" />
            <Skeleton className="h-11 w-full" rounded="rounded-xl" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="mb-2 h-3 w-28" rounded="rounded-md" />
        <Skeleton className="h-20 w-full" rounded="rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="mb-2 h-3 w-20" rounded="rounded-md" />
            <Skeleton className="h-11 w-full" rounded="rounded-xl" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="mb-2 h-3 w-32" rounded="rounded-md" />
        <div className="flex gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10">
          <Skeleton className="h-11 flex-1" rounded="rounded-xl" />
          <Skeleton className="size-11" rounded="rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" rounded="rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-16 w-full" rounded="rounded-xl" />
        <Skeleton className="h-16 w-full" rounded="rounded-xl" />
      </div>
      <Skeleton className="h-28 w-full" rounded="rounded-xl" />
    </div>
  );
}

export function SkeletonPageAnalyticsModal({
  summaryOnly = false,
}: {
  summaryOnly?: boolean;
}) {
  return (
    <ModalFrame label="Loading page analytics">
      <SkeletonPageAnalyticsContent summaryOnly={summaryOnly} />
    </ModalFrame>
  );
}

export function SkeletonPageAnalyticsContent({
  summaryOnly = false,
}: {
  summaryOnly?: boolean;
}) {
  return (
    <div
      className="max-h-[64vh] space-y-5 overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="Loading page analytics data"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>
      {!summaryOnly ? (
        <>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <Skeleton className="mb-2 h-4 w-36" rounded="rounded-md" />
            <Skeleton
              className="mb-4 h-3 w-64 max-w-full"
              rounded="rounded-md"
            />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-t border-slate-100 py-3 first:border-0 dark:border-white/5"
                >
                  <Skeleton className="size-9 shrink-0" rounded="rounded-lg" />
                  <Skeleton className="h-3 flex-1" rounded="rounded-md" />
                  <Skeleton className="h-3 w-12" rounded="rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function SkeletonBusinessAnalyticsModal() {
  return (
    <ModalFrame label="Loading business analytics">
      <SkeletonBusinessAnalyticsContent />
    </ModalFrame>
  );
}

export function SkeletonBusinessAnalyticsContent() {
  return (
    <div
      className="max-h-[64vh] space-y-5 overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="Loading business analytics data"
    >
      <div className="grid grid-cols-2 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" rounded="rounded-xl" />
        <Skeleton className="h-10 w-52" rounded="rounded-xl" />
      </div>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="size-7" rounded="rounded-lg" />
          <Skeleton className="h-4 w-36" rounded="rounded-md" />
        </div>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 dark:divide-white/5 dark:border-white/10">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-3">
              <Skeleton className="size-10 shrink-0" rounded="rounded-full" />
              <div className="grid min-w-0 flex-1 grid-cols-5 items-center gap-4">
                <div className="col-span-2">
                  <Skeleton className="mb-2 h-3.5 w-3/5" rounded="rounded-md" />
                  <Skeleton className="h-2.5 w-4/5" rounded="rounded-md" />
                </div>
                <Skeleton
                  className="h-4 w-12 justify-self-center"
                  rounded="rounded-md"
                />
                <Skeleton
                  className="h-4 w-12 justify-self-center"
                  rounded="rounded-md"
                />
                <Skeleton
                  className="h-4 w-12 justify-self-center"
                  rounded="rounded-md"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mirrors BusinessInfoStep while an existing business record is fetched. */
export function SkeletonBusinessInfoForm() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading business information"
      className="min-h-[50vh] space-y-6"
    >
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="size-24" rounded="rounded-2xl" />
          <Skeleton className="h-3 w-16" rounded="rounded-md" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="size-16" rounded="rounded-2xl" />
          <Skeleton className="h-3 w-16" rounded="rounded-md" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="size-20" rounded="rounded-full" />
          <Skeleton className="h-3 w-20" rounded="rounded-md" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`owner-${index}`}>
            <Skeleton className="mb-2 h-3 w-24" rounded="rounded-md" />
            <Skeleton className="h-11 w-full" rounded="rounded-xl" />
          </div>
        ))}
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`field-${index}`}>
            <Skeleton className="mb-2 h-3 w-28" rounded="rounded-md" />
            <Skeleton className="h-11 w-full" rounded="rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
