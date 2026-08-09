"use client";

import { RefreshCw } from "lucide-react";

export function AuthenticationRefreshButton({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label="Refresh application status"
      aria-busy={refreshing}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/85 text-slate-500 shadow-sm backdrop-blur transition hover:text-slate-900 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-[#171a20]/90 dark:text-slate-400 dark:hover:text-white"
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
    </button>
  );
}
