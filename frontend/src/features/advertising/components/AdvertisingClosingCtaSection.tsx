"use client";

import { Send } from "lucide-react";

interface AdvertisingClosingCtaSectionProps {
  title: string;
  description: string;
  buttonLabel: string;
  whatsappHref: string;
}

export function AdvertisingClosingCtaSection({
  title,
  description,
  buttonLabel,
  whatsappHref,
}: AdvertisingClosingCtaSectionProps) {
  return (
    <section className="relative overflow-hidden bg-transparent px-5 py-24 sm:px-8 sm:py-28 lg:py-32">
      <div className="relative mx-auto max-w-4xl">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-black/8 px-6 py-14 text-center shadow-[0_40px_100px_-60px_rgba(15,23,42,.4)] dark:border-white/10 sm:px-12"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% -10%, color-mix(in srgb, var(--advertising-accent) 16%, transparent) 0%, transparent 70%)",
          }}
        >
          <h2 className="break-words text-[clamp(2rem,4.4vw,3.6rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance [overflow-wrap:anywhere]">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl break-words text-sm leading-7 text-black/55 [overflow-wrap:anywhere] dark:text-white/55">
            {description}
          </p>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-8 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[var(--advertising-accent)] text-[var(--advertising-accent-ink)] text-sm font-black shadow-[0_18px_45px_-28px_rgba(15,23,42,.6)] transition hover:opacity-90 active:scale-[0.98] sm:w-auto sm:px-10"
          >
            {buttonLabel} <Send className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
