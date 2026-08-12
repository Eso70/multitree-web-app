/** Cancel/confirm pair for create-and-edit modals, rendered in the modal footer. */
import { AccentActionButton } from "@/components/shared/AccentActionButton";

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
      <AccentActionButton
        onClick={onSubmit}
        disabled={submitDisabled}
        className="h-11 flex-1"
      >
        {submitLabel}
      </AccentActionButton>
    </>
  );
}
