import { AlertTriangle } from "lucide-react";
import type { InlineRequestErrorData } from "@/lib/api/inline-request-error";

interface InlineRequestErrorProps {
  className?: string;
  error: InlineRequestErrorData;
}

export function InlineRequestError({
  className = "",
  error,
}: InlineRequestErrorProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-start shadow-sm dark:border-rose-500/25 dark:bg-rose-500/10 ${className}`}
      dir="rtl"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
        />
        <div className="min-w-0 flex-1 font-kurdish">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
              {error.title}
            </p>
            {error.status ? (
              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                {error.status}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] font-medium leading-5 text-rose-700 dark:text-rose-300">
            {error.message}
          </p>
        </div>
      </div>
    </div>
  );
}
