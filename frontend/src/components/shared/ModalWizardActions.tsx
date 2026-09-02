import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/shared/Skeleton";
import { Tooltip } from "@/components/shared/Tooltip";

interface ModalWizardActionsProps {
  variant?: "themed" | "multitree";
  isFirstStep: boolean;
  isFinalStep: boolean;
  isLoadingData?: boolean;
  isSubmitting: boolean;
  canContinue: boolean;
  disableWhenInvalid?: boolean;
  submitLabel: string;
  nextLabel?: string;
  saveCurrentLabel?: string;
  onSaveCurrent?: () => void;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function ModalWizardActions({
  variant = "themed",
  isFirstStep,
  isFinalStep,
  isLoadingData = false,
  isSubmitting,
  canContinue,
  disableWhenInvalid = true,
  submitLabel,
  nextLabel = "بەردەوام بە",
  saveCurrentLabel = "پاشەکەوتکردن",
  onSaveCurrent,
  onBack,
  onCancel,
  onNext,
  onSubmit,
}: ModalWizardActionsProps) {
  const nextClassName =
    variant === "multitree"
      ? "flex h-11 w-full items-center justify-center rounded-xl px-4 sm:px-6 text-sm font-semibold sa-gradient sa-gradient-hover shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
      : "flex h-11 w-full items-center justify-center rounded-xl px-4 sm:px-6 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap";
  const submitClassName =
    variant === "multitree"
      ? "flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 sm:px-6 text-sm font-semibold sa-ink shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed sa-gradient sa-gradient-hover cursor-pointer whitespace-nowrap"
      : "flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 sm:px-6 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap";

  return (
    <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 border-t border-gray-100/60 p-3.5 sm:p-4 bg-linear-to-r from-white to-slate-50/30">
      {!isFirstStep && (
        <Tooltip content="گەڕانەوە بۆ هەنگاوی پێشوو" side="top">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-full sm:w-auto items-center justify-center px-4 sm:px-5 rounded-xl bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-200/80 dark:border-white/10 text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white text-sm font-medium transition-all duration-300 shadow-xs hover:shadow-sm cursor-pointer whitespace-nowrap"
          >
            گەڕانەوە
          </button>
        </Tooltip>
      )}
      <Tooltip content="داخستن و هەڵوەشاندنەوەی گۆڕانکارییەکان" side="top">
        <button
          type="button"
          onClick={onCancel}
          className={`flex h-11 w-full sm:w-auto items-center justify-center px-4 sm:px-5 rounded-xl bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-200/80 dark:border-white/10 text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white text-sm font-medium transition-all duration-300 shadow-xs hover:shadow-sm cursor-pointer whitespace-nowrap ${isFirstStep ? "sm:flex-1" : ""}`}
        >
          هەڵوەشاندنەوە
        </button>
      </Tooltip>
      {onSaveCurrent && (
        <Tooltip content={saveCurrentLabel} side="top">
          <button
            type="button"
            onClick={onSaveCurrent}
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center rounded-xl border px-4 sm:px-5 text-sm font-semibold shadow-xs transition-all duration-300 hover:shadow-sm disabled:cursor-wait disabled:opacity-50 sm:w-auto cursor-pointer whitespace-nowrap"
            style={{
              borderColor: "var(--theme-primary, var(--multitree-accent))",
              color: "var(--theme-primary, var(--multitree-accent))",
              background:
                "color-mix(in srgb, var(--theme-primary, var(--multitree-accent)) 8%, transparent)",
            }}
          >
            {saveCurrentLabel}
          </button>
        </Tooltip>
      )}
      {isLoadingData ? (
        <Skeleton className="h-11 w-full sm:flex-1" />
      ) : !isFinalStep ? (
        <Tooltip
          content={canContinue ? nextLabel : "تکایە خانە پێویستەکان پڕبکەرەوە"}
          side="top"
        >
          {variant === "multitree" ? (
            <button
              type="button"
              onClick={onNext}
              disabled={isSubmitting || (disableWhenInvalid && !canContinue)}
              className={nextClassName}
            >
              <span>{nextLabel}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={isSubmitting || (disableWhenInvalid && !canContinue)}
              className="flex h-11 w-full sm:flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 sm:px-6 text-sm font-semibold text-[var(--theme-ink)] shadow-md transition-all duration-300 [background:var(--theme-css)] hover:brightness-95 hover:shadow-lg disabled:cursor-wait disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <span>{nextLabel}</span>
            </button>
          )}
        </Tooltip>
      ) : (
        <Tooltip
          content={isSubmitting ? "پاشەکەوت دەکرێت..." : submitLabel}
          side="top"
        >
          {variant === "multitree" ? (
            <button
              type="button"
              onClick={onSubmit}
              aria-busy={isSubmitting}
              disabled={isSubmitting || (disableWhenInvalid && !canContinue)}
              className={submitClassName}
            >
              {isSubmitting ? (
                <>
                  <MotionSpinner>
                    <Loader2 className="h-4 w-4 " />
                  </MotionSpinner>
                  <span>پاشەکەوتکردن...</span>
                </>
              ) : (
                <span>{submitLabel}</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              aria-busy={isSubmitting}
              disabled={isSubmitting || (disableWhenInvalid && !canContinue)}
              className="flex h-11 w-full sm:flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 sm:px-6 text-sm font-semibold text-[var(--theme-ink)] shadow-md transition-all duration-300 [background:var(--theme-css)] hover:brightness-95 hover:shadow-lg disabled:cursor-wait disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <MotionSpinner>
                    <Loader2 className="h-4 w-4 " />
                  </MotionSpinner>
                  <span>پاشەکەوتکردن...</span>
                </>
              ) : (
                <span>{submitLabel}</span>
              )}
            </button>
          )}
        </Tooltip>
      )}
    </div>
  );
}
