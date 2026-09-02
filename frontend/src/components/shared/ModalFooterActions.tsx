import { Loader2 } from "lucide-react";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { Tooltip } from "@/components/shared/Tooltip";

/** Consistent modal footer actions with optional loading and single-action modes. */

export function ModalFooterActions({
  submitLabel,
  submitDisabled,
  isSubmitting = false,
  submittingLabel = "پاشەکەوت دەکرێت...",
  cancelLabel = "پاشگەزبوونەوە",
  showCancel = true,
  onCancel,
  onSubmit,
}: {
  submitLabel: string;
  submitDisabled: boolean;
  isSubmitting?: boolean;
  submittingLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      {showCancel ? (
        <Tooltip content={cancelLabel} side="top" className="flex-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 cursor-pointer"
          >
            {cancelLabel}
          </button>
        </Tooltip>
      ) : null}
      <Tooltip
        content={isSubmitting ? submittingLabel : submitLabel}
        side="top"
        className="flex-1"
      >
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled || isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-transparent text-sm font-bold text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <MotionSpinner>
                <Loader2 className="h-4 w-4" />
              </MotionSpinner>
              <span>{submittingLabel}</span>
            </>
          ) : (
            submitLabel
          )}
        </button>
      </Tooltip>
    </>
  );
}
