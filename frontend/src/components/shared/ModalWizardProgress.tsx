interface WizardStep {
  id: string;
  label: string;
}

interface ModalWizardProgressProps {
  steps: WizardStep[];
  currentStep: string;
  variant?: "themed" | "multitree";
}

export function ModalWizardProgress({
  steps,
  currentStep,
  variant = "themed",
}: ModalWizardProgressProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStep),
  );

  return (
    <div
      className="border-b border-slate-200/70 bg-transparent px-4 py-3 dark:border-white/10 sm:px-5 sm:py-4 md:px-6"
      data-testid="modal-wizard-progress"
    >
      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;
          const textClass =
            variant === "multitree"
              ? isCurrent
                ? "sa-text"
                : isComplete
                  ? "sa-text-muted"
                  : "text-slate-400 dark:text-slate-500"
              : isCurrent || isComplete
                ? ""
                : "text-slate-500 dark:text-slate-400";
          const circleClass =
            variant === "multitree"
              ? isCurrent
                ? "sa-gradient"
                : isComplete
                  ? "sa-step-soft border"
                  : "border border-slate-200 bg-linear-to-br from-slate-50 to-gray-100 text-slate-500 dark:border-white/10 dark:from-slate-800 dark:to-slate-900 dark:text-slate-400"
              : isCurrent
                ? "text-white"
                : isComplete
                  ? ""
                  : "border border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400";
          const themedTextStyle =
            variant === "themed" && (isCurrent || isComplete)
              ? { color: "var(--theme-primary, #64748b)" }
              : undefined;
          const themedCircleStyle =
            variant === "themed"
              ? isCurrent
                ? { background: "var(--theme-css, #64748b)", color: "white" }
                : isComplete
                  ? {
                      backgroundColor:
                        "color-mix(in srgb, var(--theme-primary, #64748b) 18%, transparent)",
                      color: "var(--theme-primary, #64748b)",
                      border:
                        "1px solid color-mix(in srgb, var(--theme-primary, #64748b) 35%, transparent)",
                    }
                  : undefined
              : undefined;

          return (
            <div key={step.id} className="contents">
              {index > 0 && (
                <div
                  className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${index <= currentIndex ? (variant === "multitree" ? "sa-gradient" : "") : "bg-slate-200 dark:bg-slate-700"}`}
                  style={
                    variant === "themed" && index <= currentIndex
                      ? { backgroundColor: "var(--theme-primary, #64748b)" }
                      : undefined
                  }
                />
              )}
              <div
                className={`flex items-center gap-1.5 transition-colors sm:gap-2 ${textClass}`}
                style={themedTextStyle}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shadow-sm transition-all duration-300 sm:h-8 sm:w-8 sm:text-sm ${isCurrent ? "scale-105" : ""} ${circleClass}`}
                  style={themedCircleStyle}
                >
                  {isComplete ? "\u2713" : index + 1}
                </div>
                <span
                  className={`hidden text-xs sm:block sm:text-sm ${isCurrent ? "font-semibold" : "font-medium"}`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
