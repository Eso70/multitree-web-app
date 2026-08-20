import type { ReactNode } from "react";

export function PublicSection({
  id,
  labelledBy,
  label,
  children,
  decorations,
  className = "",
  contentClassName = "max-w-7xl",
  direction = "rtl",
}: {
  id?: string;
  labelledBy?: string;
  label?: string;
  children: ReactNode;
  decorations?: ReactNode;
  className?: string;
  contentClassName?: string;
  direction?: "ltr" | "rtl";
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      aria-label={label}
      className={`relative scroll-mt-24 overflow-hidden bg-transparent px-5 py-24 text-[#111827] dark:text-white sm:px-8 sm:py-28 lg:py-32 ${className}`}
      dir={direction}
    >
      {decorations}
      <div className={`relative mx-auto ${contentClassName}`}>{children}</div>
    </section>
  );
}
