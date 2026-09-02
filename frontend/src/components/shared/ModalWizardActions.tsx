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
      ? "w-full rounded-xl px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold sa-gradient sa-gradient-hover shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
      : "w-full rounded-xl px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer";
  const submitClassName =
    variant === "multitree"
      ? "w-full rounded-xl px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold sa-ink shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sa-gradient sa-gradient-hover cursor-pointer"
      : "w-full rounded-xl px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer";

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 border-t border-gray-100/50 p-4 sm:p-5 md:p-6 bg-linear-to-r from-white to-slate-50/30">
      {!isFirstStep && (
        <Tooltip content="گەڕانەوە بۆ هەنگاوی پێشوو" side="top">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-xl bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-100 text-slate-600 hover:text-slate-700 text-xs sm:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow cursor-pointer"
          >
            گەڕانەوە
          </button>
        </Tooltip>
      )}
      <Tooltip content="داخستن و هەڵوەشاندنەوەی گۆڕانکارییەکان" side="top" className={isFirstStep ? "sm:flex-1" : ""}>
        <button
          type="button"
          onClick={onCancel}
          className={`w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-xl bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-100 text-slate-600 hover:text-slate-700 text-xs sm:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow cursor-pointer ${isFirstStep ? "w-full sm:w-full" : ""}`}
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
            className="flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition-all duration-300 hover:shadow disabled:cursor-wait disabled:opacity-50 sm:w-auto sm:px-5 sm:py-3 sm:text-sm cursor-pointer"
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
          className="w-full sm:flex-1"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-[var(--theme-ink)] shadow-sm transition-all duration-300 [background:var(--theme-css)] hover:brightness-95 hover:shadow disabled:cursor-wait disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm md:px-6 cursor-pointer"
            >
              <span>{nextLabel}</span>
            </button>
          )}
        </Tooltip>
      ) : (
        <Tooltip
          content={isSubmitting ? "پاشەکەوت دەکرێت..." : submitLabel}
          side="top"
          className="w-full sm:flex-1"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-[var(--theme-ink)] shadow-sm transition-all duration-300 [background:var(--theme-css)] hover:brightness-95 hover:shadow disabled:cursor-wait disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm md:px-6 cursor-pointer"
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
