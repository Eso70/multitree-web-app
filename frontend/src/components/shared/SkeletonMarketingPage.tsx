"use client";

import { Skeleton, SkeletonText } from "@/components/shared/Skeleton";

export type SkeletonMarketingBody =
  "cards" | "pricing" | "article" | "form" | "templates";

/** Shared public-site chrome with a body matching the destination page type. */
export function SkeletonMarketingPage({
  body = "cards",
}: {
  body?: SkeletonMarketingBody;
}) {
  return (
    <main
      className="min-h-screen bg-[#f8f9fa] text-slate-900 dark:bg-[#0b0d0e] dark:text-white"
      role="status"
      aria-busy="true"
      aria-label="Loading page"
    >
      <header className="h-[60px] border-b border-black/5 dark:border-white/10">
        <div className="mx-auto flex h-full max-w-[75rem] items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-[30px]" rounded="rounded-lg" />
            <Skeleton className="h-4 w-20" rounded="rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="hidden h-3 w-16 md:block"
                rounded="rounded-md"
              />
            ))}
            <Skeleton className="size-9" rounded="rounded-lg" />
          </div>
        </div>
      </header>
      <section className="px-5 pb-16 pt-24 text-center sm:px-8 sm:pt-32">
        <Skeleton
          className="mx-auto h-12 w-[min(42rem,92%)] sm:h-16"
          rounded="rounded-2xl"
        />
        <div className="mx-auto mt-6 max-w-2xl">
          <SkeletonText lines={2} />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        {body === "article" ? (
          <article className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-black/5 bg-white/65 p-6 dark:border-white/10 dark:bg-white/[0.035] sm:p-10">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="mb-4 h-6 w-1/3" rounded="rounded-md" />
                <SkeletonText lines={index % 2 === 0 ? 4 : 3} />
              </div>
            ))}
          </article>
        ) : body === "form" ? (
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-black/5 bg-white/65 p-6 dark:border-white/10 dark:bg-white/[0.035]">
              <Skeleton className="mb-4 h-7 w-2/3" rounded="rounded-md" />
              <SkeletonText lines={5} />
            </div>
            <div className="grid gap-4 rounded-3xl border border-black/5 bg-white/65 p-6 dark:border-white/10 dark:bg-white/[0.035] sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={index > 1 ? "sm:col-span-2" : ""}>
                  <Skeleton className="mb-2 h-3 w-24" rounded="rounded-md" />
                  <Skeleton
                    className={index === 3 ? "h-28 w-full" : "h-11 w-full"}
                    rounded="rounded-xl"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : body === "templates" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                className="mx-auto h-[600px] w-full max-w-[300px] border-[10px] border-slate-200 dark:border-slate-800"
                rounded="rounded-[3rem]"
              />
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-5 ${body === "pricing" ? "lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}
          >
            {Array.from({ length: body === "pricing" ? 3 : 6 }).map(
              (_, index) => (
                <article
                  key={index}
                  className="min-h-72 rounded-[2rem] border border-black/10 bg-white/65 p-6 dark:border-white/10 dark:bg-white/[0.035] sm:p-8"
                >
                  <Skeleton className="size-12" rounded="rounded-2xl" />
                  <Skeleton className="mt-6 h-6 w-1/2" rounded="rounded-md" />
                  <div className="mt-4">
                    <SkeletonText lines={3} />
                  </div>
                  <Skeleton className="mt-7 h-11 w-full" rounded="rounded-xl" />
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}
