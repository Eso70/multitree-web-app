"use client";

import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { MotionReveal } from "@/components/motion/MotionPrimitives";
import {
  parseWebsiteColor,
  readableInk,
} from "@/lib/utils/parse-website-color";

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  progress?: React.ReactNode;
  headerAction?: React.ReactNode;
  flushFooter?: boolean;
  wide?: boolean;
  extraWide?: boolean;
  busy?: boolean;
  createBusinessStyle?: boolean;
  multiTreeTheme?: boolean;
  locked?: boolean;
  /**
   * The colour this modal's controls should use, when it is editing something
   * that has a colour of its own.
   *
   * The modal renders through a portal on `document.body`, so without this it
   * inherits `--multitree-accent` — MultiTree's own accent — and a business ends up
   * designing their page surrounded by our brand colour. Setting the accent
   * variables here rather than in each field means every reusable control
   * inside (checkboxes, selects, wizard actions) follows along untouched.
   */
  accentColor?: string | null;
}

export function ManagementModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  progress,
  headerAction,
  flushFooter = false,
  wide = false,
  extraWide = false,
  busy = false,
  createBusinessStyle = false,
  multiTreeTheme = true,
  locked = false,
  accentColor = null,
}: ManagementModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalKeyboard({
    isOpen,
    onEscape: onClose,
    escapeEnabled: !busy && !locked,
    dialogRef,
  });

  if (!isOpen) return null;

  // An explicit accent wins over the platform one: the modal is editing
  // something whose colour the reader is about to see on their own page.
  const accent = accentColor ? parseWebsiteColor(accentColor) : null;
  const themeStyle = accent
    ? ({
        "--theme-primary": accent.primary,
        "--theme-css": accent.css,
        "--multitree-accent": accent.primary,
        "--multitree-accent-ink": readableInk(accent.primary),
        "--multitree-accent-hover": `color-mix(in srgb, ${accent.primary} 88%, black)`,
      } as React.CSSProperties)
    : multiTreeTheme
      ? ({
          "--theme-primary": "var(--multitree-accent)",
          "--theme-css": "var(--multitree-accent)",
        } as React.CSSProperties)
      : undefined;

  return createPortal(
    <div
      className="modal-ltr fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4"
      data-multitree-theme={multiTreeTheme && !accent ? true : undefined}
      dir="ltr"
      style={themeStyle}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy && !locked) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onMouseDown={() => {
          if (!busy && !locked) onClose();
        }}
      />
      <MotionReveal
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[95vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#1c222b] sm:max-h-[90vh] ${createBusinessStyle ? "max-w-2xl" : extraWide ? "max-w-6xl" : wide ? "max-w-3xl" : "max-w-lg"}`}
      >
        <header
          className={`flex justify-between gap-4 border-b border-slate-100 bg-linear-to-r from-white to-slate-50/30 p-4 dark:border-white/5 dark:from-[#1c222b] dark:to-slate-900/10 sm:p-5 md:p-6 ${createBusinessStyle ? "items-center" : "items-start"}`}
        >
          <div className="min-w-0">
            <h2
              id={titleId}
              className={`font-bold text-slate-700 dark:text-slate-100 ${createBusinessStyle ? "truncate text-lg sm:text-xl md:text-2xl" : "text-lg sm:text-xl"}`}
            >
              {title}
            </h2>
            {description && (
              <p
                className={`mt-1 leading-5 text-slate-500 dark:text-slate-400 ${createBusinessStyle ? "text-xs sm:text-sm" : "text-xs"}`}
              >
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            {!locked ? (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="داخستن"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 ${createBusinessStyle ? "shadow-sm" : ""}`}
              >
                <X className={createBusinessStyle ? "h-5 w-5" : "h-4 w-4"} />
              </button>
            ) : null}
          </div>
        </header>
        {progress}
        <div
          className={`custom-scrollbar ${multiTreeTheme && !accent ? "lime-custom-scrollbar" : ""} flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 ${createBusinessStyle ? "bg-linear-to-br from-white to-slate-50/20 dark:from-[#1c222b] dark:to-slate-900/10" : ""}`}
        >
          {children}
        </div>
        {footer && flushFooter ? (
          footer
        ) : footer ? (
          <footer
            className={`flex flex-col-reverse border-t border-slate-100 bg-linear-to-r from-white to-slate-50/30 p-4 dark:border-white/5 dark:from-[#1c222b] dark:to-slate-900/10 sm:flex-row sm:p-5 md:p-6 ${createBusinessStyle ? "gap-2 sm:gap-3" : "gap-2 sm:justify-end"}`}
          >
            {footer}
          </footer>
        ) : null}
      </MotionReveal>
    </div>,
    document.body,
  );
}
