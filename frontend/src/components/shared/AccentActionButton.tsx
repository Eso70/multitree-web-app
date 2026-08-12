"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Solid tenant-accent action button used across the dashboard (the advertising
 * page's header publish control and its per-tab add buttons). Painted with the
 * business's own color pair — `--theme-css` background, `--theme-ink` text —
 * so every accent button reads as the tenant instead of a hardcoded palette.
 */
export function AccentActionButton({
  children,
  onClick,
  type = "button",
  disabled,
  busy,
  title,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** Sets aria-busy and the wait cursor; the label itself conveys progress. */
  busy?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
      title={title}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}