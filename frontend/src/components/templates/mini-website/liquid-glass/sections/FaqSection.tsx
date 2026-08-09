import { ChevronDown, Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import { FAQ_TONES } from "./section-tokens";
import { latinDigits } from "@/features/mini-website/hours";
import type { MiniWebsiteFaqEntry } from "@/features/mini-website/types";

export function FaqSection({
  entries,
  tone = SWISS_ACCENT,
  ...frame
}: {
  entries: MiniWebsiteFaqEntry[];
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = entries.filter(
    (entry) => entry.question.trim() && entry.answer.trim(),
  );
  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <div className="space-y-2.5">
        {shown.map((entry, entryIndex) => {
          const entryTone = FAQ_TONES[entryIndex % FAQ_TONES.length];
          return (
            <details
              key={entry.id}
              name="mini-website-faq"
              className="group border-b border-current/10 last:border-b-0"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-1 py-4 transition hover:opacity-75">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
                  style={{
                    background: toneWash(entryTone, 16),
                    color: entryTone,
                  }}
                >
                  {latinDigits(String(entryIndex + 1))}
                </span>
                <span
                  className="min-w-0 flex-1 text-xs font-black sm:text-sm"
                  style={{ color: entryTone }}
                  dir="auto"
                >
                  {entry.question}
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 opacity-50 transition group-open:rotate-180"
                  style={{ color: entryTone }}
                />
              </summary>
              {/* Indented to line up with the question, not with its number. */}
              <p
                className="pb-4 pr-10 text-xs leading-6 opacity-70 sm:text-sm"
                dir="auto"
              >
                {entry.answer}
              </p>
            </details>
          );
        })}
      </div>
    </SectionFrame>
  );
}
