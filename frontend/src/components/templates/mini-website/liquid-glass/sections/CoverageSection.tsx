import { Languages, Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import { LANGUAGE_TONES } from "./section-tokens";
import type { MiniWebsiteCoverageItem } from "@/features/mini-website/types";

export function CoverageSection({
  items,
  tone = SWISS_ACCENT,
  ...frame
}: {
  items: MiniWebsiteCoverageItem[];
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const languages = items.filter(
    (item) => item.kind === "language" && item.name.trim(),
  );
  if (!languages.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {languages.map((language, index) => {
          const languageTone = LANGUAGE_TONES[index % LANGUAGE_TONES.length];
          return (
            <li
              key={language.id}
              className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl p-4 transition duration-300 hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(150deg, ${toneWash(
                  languageTone,
                  15,
                )}, ${toneWash(languageTone, 3)})`,
                border: `1px solid ${toneWash(languageTone, 28)}`,
              }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition duration-300 group-hover:scale-105"
                style={{
                  background: toneWash(languageTone, 18),
                  color: languageTone,
                }}
              >
                <Languages className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-sm font-extrabold tracking-[-0.01em]"
                  dir="auto"
                >
                  {language.name}
                </span>
                {language.detail && (
                  <span
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: toneWash(languageTone, 16),
                      color: languageTone,
                    }}
                    dir="auto"
                  >
                    {language.detail}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionFrame>
  );
}
