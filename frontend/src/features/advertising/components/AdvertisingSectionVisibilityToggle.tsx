import { cn } from "@/lib/utils";

export function AdvertisingSectionVisibilityToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={
        checked
          ? "بەشەکە لە پەڕەی گشتی نیشان دەدرێت"
          : "بەشەکە لە پەڕەی گشتی شاردراوە"
      }
      onClick={() => onChange(!checked)}
      title={
        checked ? "شاردنەوە لە پەڕەی گشتی" : "پیشاندان لە پەڕەی گشتی"
      }
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition",
        checked
          ? "border-[color-mix(in_srgb,var(--theme-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--theme-primary)_8%,transparent)] text-[var(--theme-primary)]"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/[0.08]",
      )}
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-[var(--theme-primary)]" : "bg-slate-200 dark:bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      {checked ? "پیشان دەدرێت" : "شاردراوە"}
    </button>
  );
}
