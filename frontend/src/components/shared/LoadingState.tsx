"use client";

import { LoaderCircle } from "lucide-react";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  title: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Accessible progress feedback for short, indeterminate operations such as
 * validating a link or exchanging an authentication handoff.
 *
 * Predictable replacement content should use a matching Skeleton composition
 * instead; this component is intentionally compact and content-agnostic.
 */
export function LoadingState({
  title,
  description,
  className,
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "min-h-28 gap-2.5" : "min-h-40 gap-3",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300">
        <MotionSpinner>
          <LoaderCircle className="size-5" />
        </MotionSpinner>
      </span>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
