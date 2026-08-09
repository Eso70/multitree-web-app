import React from "react";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";
import type { ScopeType } from "./types";

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 dark:border-white/10 dark:bg-[#161B22] dark:text-slate-200 dark:placeholder:text-slate-500 dark:[color-scheme:dark]";

export function Modal({
  title,
  eyebrow,
  onClose,
  children,
  footer,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      data-multitree-theme
      style={
        {
          "--theme-primary": "var(--multitree-accent)",
          "--theme-css": "var(--multitree-accent)",
        } as React.CSSProperties
      }
    >
      <button className="absolute inset-0" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-white/10 shadow-2xl    duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh] selection:bg-lime-500/30 dark:selection:bg-lime-500/40"
        dir="ltr"
      >
        <div
          className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 p-4 sm:p-5 md:p-6 bg-linear-to-r from-white to-slate-50/30 dark:from-[#161B22] dark:to-slate-900/10"
          dir="ltr"
        >
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-400">
              {eyebrow}
            </span>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-700 dark:text-gray-200 mt-0.5 sm:mt-1 font-kurdish truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-xl p-2 bg-linear-to-br from-slate-50 to-gray-50 dark:from-white/5 dark:to-white/10 hover:from-slate-100 hover:to-gray-100 dark:hover:from-white/10 dark:hover:to-white/25 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-all duration-300 border border-slate-150 dark:border-white/10 shadow-xs hover:shadow-sm cursor-pointer"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-4 custom-scrollbar lime-custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row gap-2 border-t border-slate-100 dark:border-white/5 p-4 sm:p-5 md:p-6 bg-slate-50/40 dark:bg-white/[0.01] mt-auto">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ModalActions({
  saving,
  disabled,
  onClose,
  onSave,
}: {
  saving: boolean;
  disabled: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <button
        onClick={onClose}
        className="sm:flex-1 h-10 sm:h-11 rounded-xl border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        پاشگەزبوونەوە
      </button>
      <button
        onClick={onSave}
        disabled={saving || disabled}
        className="sm:flex-1 h-10 sm:h-11 rounded-xl sa-gradient text-xs sm:text-sm font-bold text-white shadow-md shadow-lime-500/10 hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
      >
        {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}
      </button>
    </>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Badge({
  text,
  tone = "slate",
}: {
  text: string;
  tone?: "slate" | "blue" | "green" | "orange" | "red";
}) {
  const c = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-sky-50 text-sky-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <span
      className={`rounded-full border border-current/10 px-2 py-1 text-[10px] font-bold ${c[tone]}`}
    >
      {text}
    </span>
  );
}

export function ViewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 dark:border-white/10"
      aria-label="بینین"
    >
      <Eye className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * Kept as a name the access-control screens already import, now backed by the
 * shared primitive so the pulse and palette match the rest of the app.
 */
export function TableSkeleton() {
  return <SkeletonTable rows={6} />;
}

export function scopeLabel(scope: ScopeType) {
  return scope === "platform" ? "پلاتفۆرم" : "بزنس";
}

export function riskLevelLabel(level: string) {
  if (level === "critical") return "مەترسیدار";
  if (level === "sensitive") return "هەستیار";
  return "ئاسایی";
}

export function toLocalInput(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}
