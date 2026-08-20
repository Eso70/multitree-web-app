import type { ReactNode } from "react";

export function ProductPreviewAction({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/10 px-4 py-3.5 text-sm font-bold dark:border-white/10">
      <span>{label}</span>
      <span className="text-black/35 dark:text-white/35">{icon}</span>
    </div>
  );
}

export function ProductPreviewInfo({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-black/[0.035] p-3 dark:bg-white/[0.05]">
      <p className="text-xs font-black">{title}</p>
      <p className="mt-1 text-[0.65rem] text-black/45 dark:text-white/40">
        {text}
      </p>
    </div>
  );
}
