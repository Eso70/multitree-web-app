import Image from "next/image";
import { ExternalLink, GraduationCap, MapPin, Star } from "lucide-react";
import type { CSSProperties } from "react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, safeUrl, toneWash } from "../liquid-glass-utils";
import { EDUCATION_STATUS_TEXT, EDUCATION_TONES } from "./section-tokens";
import type { MiniWebsiteEducation } from "@/features/mini-website/types";

export function EducationSection({
  entries,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  entries: MiniWebsiteEducation[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = entries.filter(
    (entry) =>
      entry.institution.trim() && entry.degree.trim() && entry.startYear.trim(),
  );
  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <ol className="space-y-2.5">
        {shown.map((entry, entryIndex) => {
            const href = safeUrl(entry.verificationUrl);
            const end =
              entry.status === "studying" ? "Present" : entry.endYear || "—";
            const entryTone =
              EDUCATION_TONES[entryIndex % EDUCATION_TONES.length];
            const studying = entry.status === "studying";
            return (
              <li
                key={entry.id}
                // Same tinted panel as the experience entries, so the two
                // history sections read as one pair.
                className="group relative flex gap-4 rounded-[1.5rem] p-4 transition duration-300 sm:gap-5 sm:p-5"
                style={{ background: toneWash(entryTone, 6) }}
              >
                <span
                  className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition duration-500 group-hover:scale-[1.03] sm:h-20 sm:w-20 ${
                    interactive && entry.image
                      ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                      : ""
                  }`}
                  data-mini-image-src={
                    interactive && entry.image ? entry.image : undefined
                  }
                  data-mini-image-alt={
                    entry.image ? entry.institution : undefined
                  }
                  data-mini-image-group="education"
                  role={interactive && entry.image ? "button" : undefined}
                  tabIndex={interactive && entry.image ? 0 : undefined}
                  aria-label={
                    interactive && entry.image
                      ? `کردنەوەی وێنەی ${entry.institution}`
                      : undefined
                  }
                  onKeyDown={(event) => {
                    if (
                      interactive &&
                      entry.image &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      event.currentTarget.click();
                    }
                  }}
                  style={{
                    background: toneWash(entryTone, 18),
                    color: entryTone,
                    ...(interactive && entry.image
                      ? ({
                          "--tw-ring-color": toneWash(entryTone, 65),
                        } as CSSProperties)
                      : {}),
                  }}
                >
                  {entry.image ? (
                    <Image
                      src={entry.image}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-3">
                    <strong
                      className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-[-0.015em] sm:text-lg"
                      dir="auto"
                    >
                      {entry.degree}
                    </strong>
                    {/* Still enrolled is filled; finished study stays washed. */}
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide"
                      style={
                        studying
                          ? { background: entryTone, color: "#ffffff" }
                          : {
                              background: toneWash(entryTone, 12),
                              color: entryTone,
                            }
                      }
                      dir="auto"
                    >
                      {EDUCATION_STATUS_TEXT[entry.status]}
                    </span>
                  </span>

                  <span
                    className="mt-1.5 block text-[13px] font-medium"
                    style={{ color: entryTone }}
                    dir="auto"
                  >
                    {entry.institution}
                    {entry.fieldOfStudy ? (
                      <span className="font-normal opacity-55">
                        {` · ${entry.fieldOfStudy}`}
                      </span>
                    ) : null}
                  </span>

                  <span
                    className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium opacity-45"
                    dir="auto"
                  >
                    <span dir="ltr">
                      {entry.startYear} – {end}
                    </span>
                    {entry.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {entry.location}
                        </span>
                      </>
                    )}
                    {entry.grade && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{entry.grade}</span>
                      </>
                    )}
                  </span>

                  {entry.description && (
                    <p
                      className="mt-3 text-xs leading-6 opacity-60 sm:text-[13px]"
                      dir="auto"
                    >
                      {entry.description}
                    </p>
                  )}

                  {href && (
                    <a
                      href={interactive ? href : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold tracking-wide transition duration-300 hover:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                      style={{
                        background: toneWash(entryTone, 11),
                        color: entryTone,
                      }}
                      data-mini-action={`education:${entry.id}`}
                    >
                      Verify
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </span>
              </li>
          );
        })}
      </ol>
    </SectionFrame>
  );
}
