"use client";

import { Skeleton, SkeletonText } from "@/components/shared/Skeleton";

export function ClientInvitationSkeleton() {
  return (
    <main
      className="h-screen overflow-hidden bg-[#f7f8fa] dark:bg-[#0d0f12]"
      role="status"
      aria-busy="true"
      aria-label="Loading client invitation"
    >
      <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_1.4fr]">
        <section className="flex h-full items-center justify-center px-5 py-8 sm:px-8 lg:px-10 xl:px-14">
          <div className="w-full max-w-lg rounded-[26px] border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.035] sm:p-6">
            <Skeleton className="mx-auto h-7 w-2/3" rounded="rounded-md" />
            <div className="mx-auto mt-3 max-w-sm">
              <SkeletonText lines={2} />
            </div>
            <Skeleton className="mx-auto mt-6 h-9 w-9" rounded="rounded-xl" />
            <Skeleton className="mt-4 h-12 w-full" rounded="rounded-xl" />
            <Skeleton className="mt-3 h-12 w-full" rounded="rounded-xl" />
          </div>
        </section>
        <aside className="relative m-4 ml-0 hidden overflow-hidden rounded-[32px] bg-slate-200 dark:bg-white/10 lg:flex lg:items-center lg:justify-center">
          <div className="w-80 text-center">
            <Skeleton
              className="mx-auto h-20 w-20 bg-white/45 dark:bg-white/15"
              rounded="rounded-3xl"
            />
            <Skeleton
              className="mx-auto mt-8 h-3 w-24 bg-white/45 dark:bg-white/15"
              rounded="rounded-md"
            />
            <Skeleton
              className="mx-auto mt-5 h-9 w-56 bg-white/45 dark:bg-white/15"
              rounded="rounded-md"
            />
            <Skeleton
              className="mx-auto mt-5 h-4 w-full bg-white/45 dark:bg-white/15"
              rounded="rounded-md"
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
