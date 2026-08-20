import type { CSSProperties, ReactNode } from "react";

interface PublicCallToAction {
  href: string;
  label: string;
  external?: boolean;
  icon?: ReactNode;
}

export function PublicCallToActionSection({
  accentColor,
  accentInk,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  accentColor: string;
  accentInk: string;
  eyebrow?: string;
  title: string;
  description: string;
  primaryAction: PublicCallToAction;
  secondaryAction?: PublicCallToAction;
}) {
  const actionStyle = {
    "--public-cta-accent": accentColor,
    "--public-cta-ink": accentInk,
  } as CSSProperties;

  return (
    <section
      className="relative overflow-hidden bg-transparent px-5 py-24 text-[#111827] dark:text-white sm:px-8 sm:py-28 lg:py-32"
      dir="rtl"
      style={actionStyle}
    >
      <div className="relative mx-auto max-w-4xl">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/70 px-6 py-14 text-center shadow-[0_40px_100px_-60px_rgba(15,23,42,.4)] backdrop-blur dark:border-white/10 dark:bg-[#151719] sm:px-12"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 100% at 50% -10%, color-mix(in srgb, var(--public-cta-accent) 16%, transparent) 0%, transparent 70%)",
          }}
        >
          {eyebrow ? (
            <p className="mb-4 text-xs font-black text-[var(--public-cta-accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="break-words text-[clamp(2rem,4.4vw,3.6rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance [overflow-wrap:anywhere]">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl break-words text-sm leading-7 text-black/55 [overflow-wrap:anywhere] dark:text-white/55">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={primaryAction.href}
              target={primaryAction.external ? "_blank" : undefined}
              rel={primaryAction.external ? "noopener noreferrer" : undefined}
              className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[var(--public-cta-accent)] px-7 py-3 text-sm font-black text-[var(--public-cta-ink)] shadow-[0_18px_45px_-28px_rgba(15,23,42,.6)] transition hover:opacity-90 active:scale-[0.98] sm:w-auto"
            >
              {primaryAction.label}
              {primaryAction.icon}
            </a>
            {secondaryAction ? (
              <a
                href={secondaryAction.href}
                target={secondaryAction.external ? "_blank" : undefined}
                rel={
                  secondaryAction.external ? "noopener noreferrer" : undefined
                }
                className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-black/15 px-7 py-3 text-sm font-black text-black/70 transition-colors hover:bg-black/5 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5 sm:w-auto"
              >
                {secondaryAction.label}
                {secondaryAction.icon}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
