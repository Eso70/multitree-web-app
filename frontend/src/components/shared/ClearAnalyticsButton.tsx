"use client";

import { Trash2 } from "lucide-react";

interface ClearAnalyticsButtonProps {
  disabled?: boolean;
  hasData: boolean;
  onClick: () => void;
}

export function ClearAnalyticsButton({
  disabled = false,
  hasData,
  onClick,
}: ClearAnalyticsButtonProps) {
  const label = hasData
    ? "پاککردنەوەی هەموو داتاکانی بینین و کلیک"
    : "هیچ داتایەک نییە";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !hasData}
      className="group flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50 text-rose-500 shadow-sm transition-all hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/20 dark:from-rose-500/10 dark:to-pink-500/10 dark:text-rose-400"
      title={label}
      aria-label={label}
    >
      <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
    </button>
  );
}
