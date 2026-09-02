import { AuthenticationShell } from "@/components/shared/AuthenticationShell";
import { Skeleton } from "@/components/shared/Skeleton";

/** Authentication route frame matching the shared split-screen sign-in UI. */
export function SkeletonAuthenticationPage({
  brandDescription = "Loading your secure workspace",
  content = "methods",
  rememberDevice = false,
  brandName,
  brandLogo,
  accentColor,
  previewTitle,
  businessTenant = false,
}: {
  brandDescription?: string;
  content?: "google" | "methods" | "form" | "operation";
  rememberDevice?: boolean;
  brandName?: string;
  brandLogo?: string | null;
  accentColor?: string | null;
  previewTitle?: string;
  businessTenant?: boolean;
}) {
  return (
    <AuthenticationShell
      brandDescription={brandDescription}
      brandName={brandName}
      brandLogo={brandLogo}
      accentColor={accentColor}
      previewTitle={previewTitle}
      businessTenant={businessTenant}
    >
      <section
        className="rounded-[26px] border border-slate-200 bg-white/80 p-5 shadow-[0_18px_55px_rgba(15,23,42,.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_18px_55px_rgba(0,0,0,.22)] sm:p-6"
        role="status"
        aria-busy="true"
        aria-label="Loading authentication"
      >
        <div className="mb-6 flex flex-col items-center gap-2 px-2">
          <Skeleton className="h-7 w-52 max-w-full" rounded="rounded-lg" />
          <Skeleton className="h-3 w-64 max-w-full" rounded="rounded-md" />
        </div>
        {content === "operation" ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-3">
            <Skeleton className="size-11" rounded="rounded-2xl" />
            <Skeleton className="h-4 w-44" rounded="rounded-md" />
            <Skeleton className="h-3 w-56" rounded="rounded-md" />
          </div>
        ) : content === "form" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={index > 1 ? "sm:col-span-2" : ""}>
                <Skeleton className="mb-2 h-3 w-24" rounded="rounded-md" />
                <Skeleton
                  className={index === 3 ? "h-20 w-full" : "h-11 w-full"}
                  rounded="rounded-xl"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <Skeleton className="h-12 w-full" rounded="rounded-xl" />
            {content === "methods" ? (
              <>
                <div className="flex items-center gap-3 py-1">
                  <Skeleton className="h-px flex-1" rounded="rounded-none" />
                  <Skeleton className="h-3 w-8" rounded="rounded-md" />
                  <Skeleton className="h-px flex-1" rounded="rounded-none" />
                </div>
                <Skeleton className="h-11 w-full" rounded="rounded-xl" />
                <Skeleton className="h-11 w-full" rounded="rounded-xl" />
                {rememberDevice ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-4" rounded="rounded-md" />
                    <Skeleton className="h-3 w-48" rounded="rounded-md" />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex justify-center gap-2 pt-1">
                <Skeleton className="h-3 w-28" rounded="rounded-md" />
                <Skeleton className="h-3 w-20" rounded="rounded-md" />
              </div>
            )}
          </div>
        )}
      </section>
    </AuthenticationShell>
  );
}
