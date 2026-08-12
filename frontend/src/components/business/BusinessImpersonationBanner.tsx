"use client";

import { useState } from "react";
import { ShieldAlert, LogOut } from "lucide-react";
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
      className="sticky top-0 z-50 w-full border-b border-amber-500/40 bg-amber-500/15 backdrop-blur-sm dark:border-amber-400/30 dark:bg-amber-400/10"
      dir="ltr"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 md:px-8">
        <ShieldAlert
          className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-xs font-medium text-amber-900 sm:text-sm dark:text-amber-100">
          Signed in as <span className="font-semibold">{businessName}</span> by
          platform administrator{" "}
          <span className="font-semibold">{platformAdminName}</span>. Every
          action is recorded against this business.
        </p>
        {error && (
          <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
        )}
        <button
          type="button"
          onClick={handleExit}
          disabled={isExiting}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-600/10 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-300/40 dark:text-amber-100 dark:hover:bg-amber-300/20"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          {isExiting ? "Exiting…" : "Exit impersonation"}
        </button>
      </div>
    </div>
  );
}
