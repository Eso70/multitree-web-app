"use client";

import { useState } from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { Tooltip } from "@/components/shared/Tooltip";
import { exitBusinessImpersonation } from "@/features/business/api";

interface BusinessImpersonationBannerProps {
  businessName: string;
  platformAdminName: string;
}

/**
 * Permanent notice shown while a platform administrator is signed in as a
 * business.
 *
 * It is deliberately non-dismissible. An administrator must never be able to
 * forget that the actions they are about to take are recorded against the
 * tenant, and an owner looking over their shoulder must be able to see that
 * the session is not their own.
 */
export function BusinessImpersonationBanner({
  businessName,
  platformAdminName,
}: BusinessImpersonationBannerProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExit = () => {
    setIsExiting(true);
    setError(null);
    exitBusinessImpersonation()
      .then(({ consoleUrl }) => {
        // A full navigation, not a router push: the session cookie was just
        // cleared, so every cached client route for this tenant is stale.
        window.location.href = consoleUrl;
      })
      .catch((cause: unknown) => {
        setIsExiting(false);
        setError(
          cause instanceof Error
            ? cause.message
            : "Failed to exit impersonation",
        );
      });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full border-b border-amber-300 bg-amber-50/95 shadow-sm backdrop-blur-xl dark:border-amber-200/15 dark:bg-[#211b10]/95 dark:shadow-black/20"
      dir="ltr"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 md:px-8">
        <ShieldAlert
          className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-xs font-medium text-amber-950 sm:text-sm dark:text-amber-50">
          Signed in as <span className="font-semibold">{businessName}</span> by
          platform administrator{" "}
          <span className="font-semibold">{platformAdminName}</span>. Every
          action is recorded against this business.
        </p>
        {error && (
          <span className="text-xs text-red-700 dark:text-red-300">
            {error}
          </span>
        )}
        <Tooltip content="Exit impersonation and return to platform console" side="bottom">
          <button
            type="button"
            onClick={handleExit}
            disabled={isExiting}
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-600/30 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-sm transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-200/20 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100 dark:focus-visible:ring-amber-200 dark:focus-visible:ring-offset-[#211b10]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            {isExiting ? "Exiting…" : "Exit impersonation"}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
