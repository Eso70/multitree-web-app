import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "min-h-64 px-6 py-10" : "min-h-[400px] p-8"}`}>
      <div className={`flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500 ${compact ? "mb-4 h-16 w-16" : "mb-4 h-20 w-20 sm:h-24 sm:w-24"}`}>
        <Icon className={compact ? "h-7 w-7" : "h-10 w-10 sm:h-12 sm:w-12"} strokeWidth={1.5} />
      </div>
      <h3 className={`${compact ? "text-sm" : "text-lg sm:text-xl"} mb-2 font-bold text-slate-700 dark:text-slate-200`}>{title}</h3>
      <p className="max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}
