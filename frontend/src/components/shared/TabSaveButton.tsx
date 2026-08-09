"use client";

import { Save } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Save button shown in each tabbed page's header; reflects unsaved/saving
 * state. Shared by the advertising service tabs and the business settings
 * tabs so both dashboards get the same header save button.
 *
 * The advertising page keeps the solid dark look; the settings page opts into
 * the tenant accent via `accent`, which paints the active button with the
 * business's own color.
 */
export function TabSaveButton({
  dirty,
  saving,
  onSave,
  disabled,
  accent,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  const active =
    dirty && !disabled
      ? accent
        ? "border-transparent text-[var(--theme-ink)] shadow-sm [background:var(--theme-css)] hover:brightness-95"
        : "border-transparent bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      : "border-dashed border-slate-200 text-slate-400 dark:border-white/10 dark:text-slate-500";
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={!dirty || saving || disabled}
      aria-busy={saving}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60",
        active,
      )}
    >
      <Save className="h-4 w-4" />
      {saving ? "پاشەکەوتکردن..." : dirty && !disabled ? "پاشەکەوتکردن" : "پاشەکەوت کرا"}
    </button>
  );
}
