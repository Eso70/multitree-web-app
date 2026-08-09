import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, safeUrl } from "../liquid-glass-utils";
import type { RecordLine } from "./section-utils";
import { ChevronRight } from "lucide-react";

export function CardRecordsSection({
  title,
  icon,
  items,
  actionHref,
  actionLabel,
  interactive,
  ...frame
}: {
  title: string;
  icon: typeof ChevronRight;
  items: RecordLine[];
  actionHref?: string;
  actionLabel?: string;
  interactive: boolean;
  fullPage: boolean;
  accent: string;
}) {
  if (!items.length) return null;
  return (
    <SectionFrame title={title} icon={icon} {...frame}>
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const href =
            safeUrl(item.fourth) || safeUrl(item.third) || actionHref;
          return (
            <article
              key={`${item.raw}-${index}`}
              className="relative flex min-h-28 flex-col border-l-2 py-1 pl-4"
              style={{ borderColor: SWISS_ACCENT }}
            >
              <span className="mb-2 text-[10px] font-black tracking-[0.2em] opacity-35">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-black sm:text-base" dir="auto">
                {item.title}
              </h3>
              {item.detail && (
                <p
                  className="mt-2 flex-1 text-xs leading-6 opacity-60"
                  dir="auto"
                >
                  {item.detail}
                </p>
              )}
              {item.third && !safeUrl(item.third) && (
                <strong
                  className="mt-3 text-xs"
                  style={{ color: SWISS_ACCENT }}
                >
                  {item.third}
                </strong>
              )}
              {href && (
                <a
                  href={interactive ? href : undefined}
                  onClick={(event) => {
                    if (!interactive) event.preventDefault();
                  }}
                  target={
                    interactive && href.startsWith("http")
                      ? "_blank"
                      : undefined
                  }
                  rel="noreferrer"
                  className="mini-glass-action mt-4 inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-black transition hover:gap-2"
                  style={{ color: SWISS_ACCENT }}
                >
                  {actionLabel || "کردنەوە"}
                  <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </article>
          );
        })}
      </div>
    </SectionFrame>
  );
}