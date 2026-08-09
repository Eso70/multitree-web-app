import React from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badgeText?: string | number;
  action?: React.ReactNode;
  center?: boolean;
}

export function PageHeader({ title, description, icon: Icon, badgeText, action, center }: PageHeaderProps) {
  return (
    <div className={`mb-4 flex min-w-0 flex-col gap-3 sm:mb-5 lg:flex-row lg:items-center lg:gap-4 md:mb-6 xl:gap-6 ${action ? "lg:justify-between" : ""} ${center ? "justify-center" : ""}`}>
      <div className={`flex min-w-0 gap-3 sm:gap-4 ${center ? "items-center justify-center text-center" : description ? "items-start" : "items-center"}`}>
        {Icon && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-white/90 dark:bg-white/5 backdrop-blur-sm border border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 shrink-0 shadow-sm">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-700 dark:text-gray-200">
              {title}
            </h2>
            {badgeText !== undefined && (
              <span className="text-xs sm:text-sm text-slate-600 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-1.5 rounded-xl border border-gray-200 text-center sm:text-left shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-gray-300">
                {badgeText}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed max-w-xl">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 lg:w-auto lg:shrink-0 lg:flex-nowrap">
          {action}
        </div>
      )}
    </div>
  );
}
