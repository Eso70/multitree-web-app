"use client";

import { memo, type ComponentType, type ReactNode, type SVGProps } from "react";
import { SkeletonStatCard } from "@/components/shared/Skeleton";
import { MotionPing } from "@/components/motion/MotionPrimitives";

export type StatCardColor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "slate"
  | "pink"
  | "cyan"
  | "amber";

export type StatCardVariant =
  | "standard"
  | "funnel"
  | "live"
  | "comparison"
  | "story";

export interface StatCardProps {
  action?: ReactNode;
  className?: string;
  color?: StatCardColor;
  compact?: boolean;
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  live?: boolean;
  loading?: boolean;
  subtitle?: string;
  value: number | string;
  variant?: StatCardVariant;
}

const colorClasses: Record<StatCardColor, string> = {
  blue:
    "bg-linear-to-br from-sky-50/70 to-blue-50/70 border-sky-100 text-sky-700 dark:from-sky-950/20 dark:to-blue-950/20 dark:border-sky-900/30 dark:text-sky-400",
  green:
    "bg-linear-to-br from-emerald-50/70 to-green-50/70 border-emerald-100 text-emerald-700 dark:from-emerald-950/20 dark:to-green-950/20 dark:border-emerald-900/30 dark:text-emerald-400",
  purple:
    "bg-linear-to-br from-violet-50/70 to-purple-50/70 border-violet-100 text-violet-700 dark:from-violet-950/20 dark:to-purple-950/20 dark:border-purple-900/30 dark:text-purple-400",
  orange:
    "bg-linear-to-br from-orange-50/70 to-amber-50/70 border-orange-100 text-orange-700 dark:from-orange-950/20 dark:to-amber-950/20 dark:border-orange-900/30 dark:text-orange-400",
  slate:
    "bg-linear-to-br from-slate-50/70 to-gray-50/70 border-slate-100 text-slate-700 dark:from-slate-800/20 dark:to-slate-900/20 dark:border-slate-800/30 dark:text-slate-400",
  pink:
    "bg-linear-to-br from-pink-50/70 to-rose-50/70 border-pink-100 text-pink-700 dark:from-pink-950/20 dark:to-rose-950/20 dark:border-pink-900/30 dark:text-pink-400",
  cyan:
    "bg-linear-to-br from-cyan-50/70 to-teal-50/70 border-cyan-100 text-cyan-700 dark:from-cyan-950/20 dark:to-teal-950/20 dark:border-cyan-900/30 dark:text-cyan-400",
  amber:
    "bg-linear-to-br from-amber-50/70 to-yellow-50/70 border-amber-100 text-amber-700 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-900/30 dark:text-amber-400",
};

const iconBgClasses: Record<StatCardColor, string> = {
  blue:
    "bg-linear-to-br from-sky-100 to-blue-100 border-sky-200 dark:from-sky-900/30 dark:to-blue-900/30 dark:border-sky-800/30",
  green:
    "bg-linear-to-br from-emerald-100 to-green-100 border-emerald-200 dark:from-emerald-900/30 dark:to-green-900/30 dark:border-emerald-800/30",
  purple:
    "bg-linear-to-br from-violet-100 to-purple-100 border-violet-200 dark:from-violet-900/30 dark:to-purple-900/30 dark:border-purple-800/30",
  orange:
    "bg-linear-to-br from-orange-100 to-amber-100 border-orange-200 dark:from-orange-900/30 dark:to-amber-900/30 dark:border-orange-800/30",
  slate:
    "bg-linear-to-br from-slate-100 to-gray-100 border-slate-200 dark:from-slate-800/30 dark:to-slate-900/30 dark:border-slate-700/30",
  pink:
    "bg-linear-to-br from-pink-100 to-rose-100 border-pink-200 dark:from-pink-900/30 dark:to-rose-900/30 dark:border-pink-800/30",
  cyan:
    "bg-linear-to-br from-cyan-100 to-teal-100 border-cyan-200 dark:from-cyan-900/30 dark:to-teal-900/30 dark:border-cyan-800/30",
  amber:
    "bg-linear-to-br from-amber-100 to-yellow-100 border-amber-200 dark:from-amber-900/30 dark:to-yellow-900/30 dark:border-amber-800/30",
};

const iconColorClasses: Record<StatCardColor, string> = {
  blue: "text-sky-500 dark:text-sky-400",
  green: "text-emerald-500 dark:text-emerald-400",
  purple: "text-violet-500 dark:text-purple-400",
  orange: "text-orange-500 dark:text-orange-400",
  slate: "text-slate-500 dark:text-slate-400",
  pink: "text-pink-500 dark:text-pink-400",
  cyan: "text-cyan-500 dark:text-cyan-400",
  amber: "text-amber-500 dark:text-amber-400",
};

const funnelSurfaceClasses: Record<StatCardColor, string> = {
  blue: "border-blue-200 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/[0.05]",
  green:
    "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/[0.05]",
  purple:
    "border-violet-200 bg-violet-50/50 dark:border-violet-500/20 dark:bg-violet-500/[0.05]",
  orange:
    "border-orange-200 bg-orange-50/50 dark:border-orange-500/20 dark:bg-orange-500/[0.05]",
  slate:
    "border-slate-200 bg-slate-50/50 dark:border-slate-500/20 dark:bg-slate-500/[0.05]",
  pink: "border-pink-200 bg-pink-50/50 dark:border-pink-500/20 dark:bg-pink-500/[0.05]",
  cyan: "border-cyan-200 bg-cyan-50/50 dark:border-cyan-500/20 dark:bg-cyan-500/[0.05]",
  amber:
    "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/[0.05]",
};

const funnelIconClasses: Record<StatCardColor, string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  green:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  purple:
    "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  orange:
    "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  pink: "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300",
  cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
};

const funnelValueClasses: Record<StatCardColor, string> = {
  blue: "text-blue-700 dark:text-blue-300",
  green: "text-emerald-700 dark:text-emerald-300",
  purple: "text-violet-700 dark:text-violet-300",
  orange: "text-orange-700 dark:text-orange-300",
  slate: "text-slate-700 dark:text-slate-300",
  pink: "text-pink-700 dark:text-pink-300",
  cyan: "text-cyan-700 dark:text-cyan-300",
  amber: "text-amber-700 dark:text-amber-300",
};

function displayValue(value: number | string): string {
  return typeof value === "number" ? value.toLocaleString() : value;
}

export const StatCard = memo(function StatCard({
  action,
  className = "",
  color = "blue",
  compact = false,
  description,
  icon: Icon,
  label,
  live = false,
  loading = false,
  subtitle,
  value,
  variant = "standard",
}: StatCardProps) {
  if (loading) {
    return (
      <div role="status" aria-label="بارکردن">
        <SkeletonStatCard
          className={className}
          compact={compact}
          variant={variant}
        />
      </div>
    );
  }

  if (variant === "funnel") {
    return (
      <article
        className={`flex min-h-40 flex-col justify-between rounded-3xl border p-5 ${funnelSurfaceClasses[color]} ${className}`}
      >
        {Icon ? (
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${funnelIconClasses[color]}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div className="mt-5">
          <p className={`text-3xl font-black leading-none ${funnelValueClasses[color]}`}>
            {displayValue(value)}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
            {label}
          </p>
          {(description || subtitle) && (
            <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">
              {description || subtitle}
            </p>
          )}
        </div>
      </article>
    );
  }

  if (variant === "live") {
    return (
      <article
        className={`flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06] ${className}`}
      >
        <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
          {live && (
            <MotionPing className="absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
          )}
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-100">
            {displayValue(value)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          {subtitle && (
            <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>
          )}
        </div>
      </article>
    );
  }

  if (variant === "comparison") {
    return (
      <article className={`p-5 text-center ${className}`}>
        {Icon ? (
          <Icon
            aria-hidden="true"
            className={`mx-auto mb-2 h-5 w-5 ${iconColorClasses[color]}`}
          />
        ) : null}
        <p className="text-3xl font-bold text-slate-700 dark:text-slate-100">
          {displayValue(value)}
        </p>
        <p className="mt-2 text-xs text-slate-400">{label}</p>
        {subtitle && (
          <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>
        )}
      </article>
    );
  }

  if (variant === "story") {
    return (
      <article
        className={`flex min-w-36 flex-col items-center rounded-2xl border border-white/60 bg-white/70 px-5 py-4 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-800/30 ${className}`}
      >
        {Icon ? (
          <Icon
            aria-hidden="true"
            className={`mb-2 h-5 w-5 ${iconColorClasses[color]}`}
          />
        ) : null}
        <span className="text-3xl font-black text-slate-800 dark:text-white">
          {displayValue(value)}
        </span>
        <span className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-300">
          {label}
        </span>
        {subtitle && (
          <span className="mt-1 text-[9px] text-slate-400">{subtitle}</span>
        )}
      </article>
    );
  }

  return (
    <article
      className={`group relative ${
        compact
          ? "h-[76px] overflow-visible rounded-xl p-3 hover:z-20"
          : "overflow-hidden rounded-xl p-3 sm:rounded-2xl sm:p-5 md:p-6"
      } ${colorClasses[color]} border backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${className}`}
    >
      {action && <div className="absolute right-1.5 top-1.5 z-10">{action}</div>}
      <div
        className={`relative flex items-center ${
          compact
            ? `gap-2.5 ${action ? "pr-7" : ""}`
            : `flex-row justify-start gap-3 sm:gap-4 ${action ? "pr-7" : ""}`
        }`}
      >
        {Icon ? (
          <div
            className={`${
              compact ? "rounded-lg p-2" : "rounded-lg p-2 sm:rounded-xl sm:p-3"
            } ${iconBgClasses[color]} shrink-0 border shadow-sm transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon
              aria-hidden="true"
              className={`${
                compact ? "h-4 w-4" : "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"
              } ${iconColorClasses[color]}`}
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 text-start">
          {compact ? (
            <CompactTextWithTooltip
              className="mb-0.5 text-sm font-bold text-slate-700 dark:text-slate-200 sm:text-base"
              text={displayValue(value)}
            />
          ) : (
            <div className="group/value relative mb-0.5 max-w-full text-lg font-bold leading-tight text-slate-700 dark:text-slate-200 sm:mb-1 sm:text-2xl md:text-3xl">
              <div className="truncate">{displayValue(value)}</div>
              {typeof value === "string" && value.length > 8 && (
                <ValueTooltip value={value} />
              )}
            </div>
          )}
          {compact ? (
            <CompactTextWithTooltip
              className="text-[10px] font-medium text-slate-600 dark:text-slate-400 sm:text-[11px]"
              text={label}
            />
          ) : (
            <div className="text-[10px] font-medium leading-tight text-slate-600 dark:text-slate-400 sm:text-xs md:text-sm">
              {label}
            </div>
          )}
          {subtitle && (
            <div
              className={`${compact ? "text-[9px]" : "text-[10px] sm:text-xs"} mt-1 text-slate-500`}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

function ValueTooltip({ value }: { value: string }) {
  return (
    <div className="pointer-events-none invisible absolute start-0 top-full z-50 mt-1 w-max max-w-[280px] translate-y-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-start text-[11px] font-medium leading-4 text-slate-700 opacity-0 shadow-xl transition duration-150 group-hover/value:visible group-hover/value:translate-y-0 group-hover/value:opacity-100 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-200">
      <span className="block break-words [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}

function CompactTextWithTooltip({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  return (
    <div className="group/compact-text relative min-w-0 leading-tight">
      <div className={`truncate ${className}`}>{text}</div>
      <div
        className="pointer-events-none invisible absolute start-0 top-full z-50 mt-1 w-max max-w-[260px] translate-y-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-start text-[11px] font-medium leading-4 text-slate-700 opacity-0 shadow-xl transition duration-150 group-hover/compact-text:visible group-hover/compact-text:translate-y-0 group-hover/compact-text:opacity-100 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-200"
        role="tooltip"
      >
        <span className="block break-words [overflow-wrap:anywhere]">{text}</span>
      </div>
    </div>
  );
}
