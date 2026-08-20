import type { CSSProperties, ReactNode } from "react";
import { getMultiTreeAccentInk } from "@/lib/multitree-theme";
import { PublicHeroAccentBackdrop } from "./PublicHeroAccentBackdrop";

export interface PublicHeroAction {
  href: string;
  label: string;
  color?: string;
  ink?: string;
}

export function PublicMarketingHero({
  accentColor,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  decorations,
  embedded = false,
}: {
  accentColor: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  primaryAction?: PublicHeroAction;
  secondaryAction?: PublicHeroAction;
  decorations?: ReactNode;
  embedded?: boolean;
}) {
  const actionColor = primaryAction?.color || accentColor;
  const actionInk = primaryAction?.ink || getMultiTreeAccentInk(actionColor);

  return (
    <section
      aria-labelledby="public-marketing-hero-title"
      className="relative overflow-hidden text-[#111827] dark:text-white"
      dir="rtl"
    >
      <PublicHeroAccentBackdrop accentColor={accentColor} />
      {decorations}

      <div
        className={`relative mx-auto flex max-w-5xl flex-col items-center px-5 text-center sm:px-8 ${
          embedded
            ? "pb-20 pt-20 sm:pb-24"
            : "pb-4 pt-40 sm:pb-8 sm:pt-48 lg:pb-8 lg:pt-56"
        }`}
      >
        {eyebrow ? (
          <p className="mb-5 text-xs font-black text-[var(--business-accent,var(--multitree-accent))]">
            {eyebrow}
          </p>
        ) : null}
        <h1
          id="public-marketing-hero-title"
          className="max-w-4xl break-words text-[clamp(2.75rem,6vw,5.5rem)] font-medium leading-[1.08] tracking-[-0.035em] text-balance [overflow-wrap:anywhere]"
        >
          {title}
        </h1>
        <p className="mt-7 max-w-2xl break-words text-base leading-8 text-gray-600 [overflow-wrap:anywhere] dark:text-white/58 sm:text-lg sm:leading-9">
          {description}
        </p>
        {primaryAction || secondaryAction ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {primaryAction ? (
              <a
                href={primaryAction.href}
                className="inline-flex min-h-12 items-center justify-center rounded-xl px-7 py-3 text-sm font-semibold shadow-[0_10px_30px_rgba(15,23,42,.16)] transition-opacity hover:opacity-88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f8f9fa] dark:shadow-[0_12px_32px_rgba(0,0,0,.3)] dark:focus-visible:ring-offset-[#0b0d0e]"
                style={
                  {
                    backgroundColor: actionColor,
                    color: actionInk,
                    "--tw-ring-color": actionColor,
                  } as CSSProperties
                }
              >
                {primaryAction.label}
              </a>
            ) : null}
            {secondaryAction ? (
              <a
                href={secondaryAction.href}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 bg-white/55 px-7 py-3 text-sm font-semibold text-black/70 backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
              >
                {secondaryAction.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
