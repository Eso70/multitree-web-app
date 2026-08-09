"use client";

import type { ComponentType, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SMOOTH = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

export interface StepJourneyItem {
  id?: string;
  number?: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  accentClass?: string;
  softClass?: string;
  buttonClass?: string;
  progressClass?: string;
}

export interface StepJourneyMockupProps {
  title?: string;
  brandIcon?: ReactNode;
  steps: ReadonlyArray<StepJourneyItem>;
  activeStep: number;
  onStepChange: (index: number) => void;
  children: ReactNode;
  /** Optional badge / pill rendered inline next to the active step title */
  titleBadge?: ReactNode;
  footerNote?: string;
  className?: string;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  backLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  /** Overrides the back button's default neutral outline color. */
  backButtonClass?: string;
  /** Overrides the next/submit button's color (otherwise falls back to the active step's buttonClass). */
  nextButtonClass?: string;
  /** Overrides every progress-bar segment's color (otherwise falls back to each step's progressClass). */
  progressBarClass?: string;
  /** Whether the current step has what it needs to move on; false disables next/submit. Defaults to true. */
  canAdvance?: boolean;
}

export function StepJourneyMockup({
  title = "Guide",
  brandIcon,
  steps,
  activeStep,
  onStepChange,
  children,
  titleBadge,
  footerNote,
  className,
  onBack,
  onNext,
  onSubmit,
  backLabel = "Back",
  nextLabel = "Next",
  submitLabel = "Submit",
  backButtonClass,
  nextButtonClass,
  progressBarClass,
  canAdvance = true,
}: StepJourneyMockupProps) {
  const reduceMotion = useReducedMotion();
  const active = steps[activeStep] || steps[0];
  const ActiveIcon = active?.icon;
  const totalSteps = steps.length;
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onStepChange(Math.max(0, activeStep - 1));
    }
  };

  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
      return;
    }
    if (onNext) {
      onNext();
    } else {
      onStepChange(Math.min(totalSteps - 1, activeStep + 1));
    }
  };

  const currentStepNumber = (active.number || (activeStep + 1).toString().padStart(2, "0"));
  const formattedTotal = totalSteps.toString().padStart(2, "0");

  return (
    <div className={cn("w-full", className)}>
      <article className="relative overflow-hidden rounded-[1.75rem] border border-black/9 bg-white/80 shadow-[0_30px_90px_-55px_rgba(15,23,42,.48)] backdrop-blur-xl dark:border-white/9 dark:bg-[#111315]/88 dark:shadow-[0_34px_100px_-55px_rgba(0,0,0,.9)] sm:rounded-[2rem]">
        <span className="absolute right-4 top-3 z-10 text-xs font-black tabular-nums text-black/40 dark:text-white/40 sm:right-6">
          {currentStepNumber} / {formattedTotal}
        </span>

        <header className="flex min-h-16 items-center gap-4 border-b border-black/8 px-4 py-3 pr-20 dark:border-white/8 sm:px-6 sm:pr-24">
          <div className="flex min-w-0 items-center gap-3">
            {brandIcon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black shadow-[0_10px_24px_-16px_rgba(37,244,238,.9)]">
                {brandIcon}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{title}</span>
            </span>
          </div>
        </header>

        <nav className="border-b border-black/8 px-3 py-3 dark:border-white/8 lg:hidden" aria-label="Tutorial steps">
          <p className="mb-3 truncate px-1 text-lg font-black" dir="auto">{active.title}</p>
          <div className="grid grid-cols-6 gap-1.5" role="tablist">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = activeStep === index;
              const isComplete = activeStep > index;
              const isLockedStep = index !== activeStep;

              return (
                <button
                  key={step.id || step.number || index}
                  type="button"
                  role="tab"
                  aria-label={step.title}
                  aria-selected={isActive}
                  aria-disabled={isLockedStep}
                  aria-controls="journey-mockup-panel"
                  disabled={isLockedStep}
                  onClick={() => onStepChange(index)}
                  className={cn(
                    "relative flex min-h-10 min-w-0 items-center justify-center rounded-xl px-2 text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-[var(--advertising-accent,var(--theme-primary))] disabled:cursor-not-allowed disabled:opacity-35",
                    !isActive && !isComplete && "bg-black/[0.035] hover:bg-black/[0.065] dark:bg-white/[0.045] dark:hover:bg-white/[0.075]",
                    isComplete && !isActive && "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="mobileActiveJourneyTab"
                      className="absolute inset-0 rounded-xl bg-black/[0.08] dark:bg-white/[0.1]"
                      transition={reduceMotion ? { duration: 0 } : SMOOTH}
                    />
                  )}
                  <span className="relative z-10">
                    {isComplete ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="hidden border-r border-black/8 p-4 dark:border-white/8 lg:block">
            <div className="space-y-1.5" role="tablist" aria-label="Tutorial steps">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                const isComplete = activeStep > index;
                const isLockedStep = index !== activeStep;

                return (
                  <button
                    key={step.id || step.number || index}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-disabled={isLockedStep}
                    aria-controls="journey-mockup-panel"
                    disabled={isLockedStep}
                    onClick={() => onStepChange(index)}
                    className={cn(
                      "relative flex w-full min-w-0 items-center gap-3 rounded-2xl px-3.5 py-3 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--advertising-accent,var(--theme-primary))] disabled:cursor-not-allowed disabled:opacity-35",
                      !isActive && "hover:bg-black/[0.025] dark:hover:bg-white/[0.035]",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="desktopActiveJourneyTab"
                        className="absolute inset-0 rounded-2xl bg-black/[0.05] dark:bg-white/[0.07]"
                        transition={reduceMotion ? { duration: 0 } : SMOOTH}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
                        isComplete
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
                          : cn(step.softClass, step.accentClass),
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <span className="relative z-10 min-w-0 truncate text-sm font-black leading-5" dir="auto">
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main
            id="journey-mockup-panel"
            role="tabpanel"
            aria-live="polite"
            className="min-w-0 p-4 sm:p-7 lg:p-9"
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              {ActiveIcon && (
                <span className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11",
                  active.softClass,
                  active.accentClass,
                )}>
                  <ActiveIcon className="h-5 w-5" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="shrink-0 break-words text-xl font-black leading-8 sm:text-2xl" dir="auto">
                  {active.title}
                </h3>
                {titleBadge && (
                  <span className="shrink-0">{titleBadge}</span>
                )}
              </div>
            </div>

            <div className="mt-7 h-[26rem] overflow-y-auto sm:mt-9 sm:h-[28rem] lg:h-[30rem]">
              <div className="flex min-h-full items-center justify-center py-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeStep}
                    className="w-full"
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.985 }}
                    transition={SMOOTH}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>

        <footer className="relative flex min-h-20 items-center justify-between gap-3 border-t border-black/8 px-4 pb-4 pt-6 dark:border-white/8 sm:px-6">
          <div className="absolute inset-x-4 top-0 flex -translate-y-1/2 gap-1.5 sm:inset-x-6">
            {steps.map((step, index) => (
              <div
                key={`progress-${step.id || step.number || index}`}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.09]"
              >
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    progressBarClass || step.progressClass || "bg-[var(--theme-primary)]",
                  )}
                  style={{ transformOrigin: "left" }}
                  initial={false}
                  animate={{ scaleX: index <= activeStep ? 1 : 0 }}
                  transition={reduceMotion ? { duration: 0 } : SMOOTH}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={isFirstStep}
            onClick={handleBack}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--advertising-accent,var(--theme-primary))] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30 sm:min-w-28",
              backButtonClass ||
                "border-black/9 hover:bg-black/[0.035] dark:border-white/10 dark:hover:bg-white/[0.05]",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </button>

          <span className="hidden rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-black tabular-nums text-black/45 dark:bg-white/[0.06] dark:text-white/45 sm:block">
            {currentStepNumber} / {formattedTotal}
          </span>

          <button
            type="button"
            disabled={isLastStep ? !onSubmit : !canAdvance}
            onClick={handleNext}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black outline-none transition-all duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--advertising-accent,var(--theme-primary))] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none dark:focus-visible:ring-offset-[#111315] sm:min-w-28",
              nextButtonClass || active.buttonClass || "bg-[var(--theme-primary)] text-white",
              "shadow-[0_12px_28px_-16px_rgba(0,0,0,.4)] dark:shadow-[0_12px_28px_-16px_rgba(255,255,255,.18)]",
            )}
          >
            {isLastStep && onSubmit ? submitLabel : nextLabel}
            {!(isLastStep && onSubmit) && <ChevronRight className="h-4 w-4" />}
          </button>
        </footer>
      </article>

      {footerNote && (
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-6 text-black/42 dark:text-white/42" dir="auto">
          {footerNote}
        </p>
      )}
    </div>
  );
}
