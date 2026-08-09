export const modalInputBase =
  "modal-standard-input w-full rounded-lg sm:rounded-xl border bg-white dark:bg-[#161B22] px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:outline-none focus:ring-2";

export const modalInputNormal =
  "border-gray-300 dark:border-white/10 hover:border-[var(--theme-primary,#64748b)] dark:hover:border-[var(--theme-primary,#64748b)] focus:border-[var(--theme-primary,#64748b)] focus:ring-[var(--theme-primary,#64748b)]/20 dark:focus:border-[var(--theme-primary,#64748b)] dark:focus:ring-[var(--theme-primary,#64748b)]/20";

export const modalInputError =
  "modal-standard-input-error border-red-400 bg-red-50/40 dark:bg-red-500/10 focus:border-red-500 focus:ring-red-500/20";

export function modalInputClass(hasError?: boolean, extra = "") {
  return `${modalInputBase} ${hasError ? modalInputError : modalInputNormal} ${extra}`.trim();
}

export function modalTextareaClass(hasError?: boolean, extra = "") {
  return `${modalInputClass(hasError, extra)} resize-y`.trim();
}

export function modalChoiceButtonClass(hasError?: boolean, extra = "") {
  return `modal-standard-input relative w-full rounded-lg sm:rounded-xl border bg-white dark:bg-[#161B22] px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-left text-gray-900 dark:text-gray-100 transition-all duration-200 flex items-center justify-between gap-2 focus:outline-none focus:ring-2 ${
    hasError ? modalInputError : modalInputNormal
  } ${extra}`.trim();
}
