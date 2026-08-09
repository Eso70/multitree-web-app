"use client";

import { Check } from "lucide-react";

interface CheckboxFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function CheckboxField({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  compact = false,
}: CheckboxFieldProps) {
  return (
    <label
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border transition ${compact ? "p-2.5" : "p-3.5"} ${checked ? "border-[var(--multitree-accent)] bg-[color-mix(in_srgb,var(--multitree-accent)_8%,transparent)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/5"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${checked ? "border-[var(--multitree-accent)] bg-[var(--multitree-accent)] text-[var(--multitree-accent-ink)]" : "border-slate-300 bg-white text-transparent dark:border-white/20 dark:bg-[#161B22]"}`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
          {label}
        </span>
        {description && (
          <span className="mt-1 block text-[10px] leading-4 text-slate-400 dark:text-slate-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
