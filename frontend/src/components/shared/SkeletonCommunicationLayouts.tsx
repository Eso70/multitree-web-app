"use client";

import { Skeleton } from "@/components/shared/Skeleton";

export function SkeletonNotificationList({ rows = 4 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading notifications"
      className="divide-y divide-slate-100 dark:divide-white/5"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 p-4 pr-5">
          <Skeleton className="mt-1.5 size-2 shrink-0" rounded="rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-4 w-3/5" rounded="rounded-md" />
            <Skeleton className="mb-2 h-3 w-full" rounded="rounded-md" />
            <Skeleton className="h-2.5 w-24" rounded="rounded-md" />
          </div>
          <Skeleton className="size-6 shrink-0" rounded="rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSessionList({ rows = 3 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading sessions"
      className="space-y-3"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#161B22]"
        >
          <Skeleton className="size-5 shrink-0" rounded="rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex gap-2">
              <Skeleton
                className="h-3.5 w-40 max-w-full"
                rounded="rounded-md"
              />
              <Skeleton className="h-4 w-16" rounded="rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-4/5" rounded="rounded-md" />
          </div>
          <Skeleton className="size-8 shrink-0" rounded="rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSearchResultList({ rows = 4 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading search results"
      className="flex flex-col gap-0.5 py-1"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-xl p-2.5"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="size-10 shrink-0" rounded="rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-3.5 w-2/5" rounded="rounded-md" />
              <Skeleton className="h-2.5 w-3/5" rounded="rounded-md" />
            </div>
          </div>
          <Skeleton className="ml-3 h-3 w-16" rounded="rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonConversationList({ rows = 5 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading conversations"
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-40" rounded="rounded-md" />
        <Skeleton className="h-10 w-28" rounded="rounded-xl" />
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 p-4">
            <Skeleton
              className="mt-1.5 size-2 shrink-0"
              rounded="rounded-full"
            />
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-4 w-1/2" rounded="rounded-md" />
              <Skeleton className="mb-2 h-3 w-4/5" rounded="rounded-md" />
              <div className="flex gap-2">
                <Skeleton className="h-2.5 w-14" rounded="rounded-md" />
                <Skeleton className="h-2.5 w-20" rounded="rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChatThread({ rows = 4 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading messages"
      className="mt-4 space-y-3"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <div className="w-[72%] rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#1c222b]">
            <Skeleton className="mb-2 h-3 w-full" rounded="rounded-md" />
            <Skeleton className="mb-2 h-3 w-4/5" rounded="rounded-md" />
            <Skeleton className="h-2.5 w-28" rounded="rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
