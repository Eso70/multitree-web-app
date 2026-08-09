"use client";

import { Plus } from "lucide-react";

/**
 * Dashed full-width "add" button matching the linktree/mini-website editors'
 * repeatable-list affordance (e.g. MiniWebsiteFaqFields). Shared so new
 * editable lists reuse the same control instead of a new copy.
 */
export function EditorAddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
