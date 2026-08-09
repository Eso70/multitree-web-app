import { ExternalLink } from "lucide-react";
import type { Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { safeUrl } from "../liquid-glass-utils";
import type { RecordLine } from "./section-utils";

/**
 * A flat list of rows for a records-style section (posts, articles, courses,
 * custom blocks). Each row is a link to the first usable URL on the record,
 * with an external-link affordance on the right.
 */
export function LinkRecordsSection({
  title,
  icon,
  items,
  interactive,
  ...frame
}: {
  title: string;
  icon: typeof Star;
  items: RecordLine[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
}) {
  if (!items.length) return null;
  return (
    <SectionFrame title={title} icon={icon} {...frame}>
      <div className="divide-y divide-current/10">
        {items.map((item, index) => {
          const href =
            safeUrl(item.detail) || safeUrl(item.third) || safeUrl(item.title);
          return (
            <a
              key={`${item.raw}-${index}`}
              href={interactive ? href : undefined}
              onClick={(event) => {
                if (!interactive) event.preventDefault();
              }}
              target={interactive ? "_blank" : undefined}
              rel="noreferrer"
              className="group flex items-center gap-4 py-4"
            >
              <span className="font-mono text-[10px] opacity-30">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-xs font-black sm:text-sm"
                dir="auto"
              >
                {href === item.title ? `Post ${index + 1}` : item.title}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current/15 transition group-hover:bg-slate-950 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-950">
                <ExternalLink className="h-4 w-4" />
              </span>
            </a>
          );
        })}
      </div>
    </SectionFrame>
  );
}
