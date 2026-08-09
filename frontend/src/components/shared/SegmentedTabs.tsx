"use client";

import type { LucideIcon } from "lucide-react";

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  accent = "var(--theme-primary)",
  fullWidth,
  className,
}: {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  accent?: string;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div className={`custom-scrollbar lime-custom-scrollbar theme-custom-scrollbar overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-[#1c222b] ${fullWidth ? "w-full" : ""} ${className ?? ""}`}>
      <div className={`flex gap-1 ${fullWidth ? "w-full" : "min-w-max sm:min-w-0"}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold outline-none transition sm:text-sm ${value === tab.id ? "shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"}`}
            style={value === tab.id ? { background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent } : undefined}
            aria-selected={value === tab.id}
            role="tab"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
