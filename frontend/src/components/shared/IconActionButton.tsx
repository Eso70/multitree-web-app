"use client";

import type { ReactNode } from "react";

/**
 * The small icon control used for row actions — reorder, remove, add.
 *
 * Shared so the mini website's branch cards and the link editor's platform rows
 * cannot drift apart: they had grown two near-identical sets of classes with
 * different padding, radius, hover colours and dark-mode behaviour.
 */
export function IconActionButton({
  onClick,
  label,
  tone = "neutral",
  disabled = false,
  children,
}: {
  onClick?: () => void;
  /** Used as both the tooltip and the accessible name. */
  label: string;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  children: ReactNode;
}) {
  const toneClasses =
    tone === "danger"
      ? "text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
      : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${toneClasses}`}
    >
      {children}
    </button>
  );
}
