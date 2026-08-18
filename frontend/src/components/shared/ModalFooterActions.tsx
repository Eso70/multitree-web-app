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
        onClick={onSubmit}
        disabled={submitDisabled}
        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-transparent text-sm font-bold text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </>
  );
}
