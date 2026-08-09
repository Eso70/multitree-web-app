/** Cancel/confirm pair for create-and-edit modals, rendered in the modal footer. */
export function ModalFooterActions({
  submitLabel,
  submitDisabled,
  onCancel,
  onSubmit,
}: {
  submitLabel: string;
  submitDisabled: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
      >
        پاشگەزبوونەوە
      </button>
      <button
        type="button"
        disabled={submitDisabled}
        onClick={onSubmit}
        className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--theme-primary)] text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </>
  );
}
