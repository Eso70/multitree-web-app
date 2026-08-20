import type { CSSProperties, ReactNode } from "react";

export function PublicSectionHeading({
  id,
  eyebrow,
  title,
  description,
  eyebrowColor,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  eyebrowColor?: string;
}) {
  return (
    <header className="mx-auto max-w-4xl text-center" dir="rtl">
      {eyebrow ? (
        <p
          className="mb-4 text-xs font-black tracking-wide text-[var(--section-heading-accent,var(--multitree-accent))]"
          style={
            eyebrowColor
              ? ({ "--section-heading-accent": eyebrowColor } as CSSProperties)
              : undefined
          }
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className="break-words text-[clamp(2.35rem,5vw,4.9rem)] font-medium leading-[1.06] tracking-[-0.04em] text-balance [overflow-wrap:anywhere]"
      >
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-7 max-w-3xl break-words text-base leading-8 text-black/55 [overflow-wrap:anywhere] dark:text-white/55 sm:text-lg sm:leading-9">
          {description}
        </p>
      ) : null}
    </header>
  );
}
