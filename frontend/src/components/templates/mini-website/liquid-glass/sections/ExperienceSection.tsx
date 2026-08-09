import Image from "next/image";
import type { CSSProperties } from "react";
import { BriefcaseBusiness, ExternalLink, MapPin, Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, safeUrl, toneWash } from "../liquid-glass-utils";
import {
  EXPERIENCE_STATUS_TEXT,
  EXPERIENCE_TONES,
} from "./section-tokens";
import type { MiniWebsiteExperience } from "@/features/mini-website/types";

export function ExperienceSection({
  entries,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  entries: MiniWebsiteExperience[];
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
      entry.title.trim() && entry.organization.trim() && entry.startDate.trim(),
  );
  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <ol className="space-y-2.5">
        {shown.map((entry, entryIndex) => {
            const href = safeUrl(entry.verificationUrl);
            const end =
              entry.status === "current" ? "Present" : entry.endDate || "—";
            const entryTone =
              EXPERIENCE_TONES[entryIndex % EXPERIENCE_TONES.length];
            const current = entry.status === "current";
            const year = entry.startDate.match(/\d{4}/)?.[0];
            return (
              <li
                key={entry.id}
                className="group relative flex gap-4 overflow-hidden rounded-[1.5rem] p-4 transition duration-300 hover:-translate-y-0.5 sm:gap-5 sm:p-5"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${toneWash(entryTone, 11)}, ${toneWash(entryTone, 3)})`,
                }}
              >
                {/* The year set oversized and nearly transparent behind the
                    card — an editorial marker that dates the entry at a glance
                    without competing with the role for attention. */}
                {year && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-3 end-3 select-none text-6xl font-black leading-none tracking-tighter transition duration-500 group-hover:opacity-100 sm:text-7xl"
                    style={{ color: toneWash(entryTone, 12) }}
                    dir="ltr"
                  >
                    {year}
                  </span>
                )}
                <span
                  className={`relative z-[1] flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition duration-500 group-hover:scale-[1.03] sm:h-20 sm:w-20 ${
                    interactive && entry.image
                      ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                      : ""
                  }`}
                  data-mini-image-src={
                    interactive && entry.image ? entry.image : undefined
                  }
                  data-mini-image-alt={entry.image ? entry.title : undefined}
                  data-mini-image-group="experience"
                  role={interactive && entry.image ? "button" : undefined}
                  tabIndex={interactive && entry.image ? 0 : undefined}
                  aria-label={
                    interactive && entry.image
                      ? `کردنەوەی وێنەی ${entry.title}`
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
                    boxShadow: `0 0 0 1px ${toneWash(entryTone, 30)}, 0 18px 34px -24px ${entryTone}`,
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
                    <BriefcaseBusiness className="h-7 w-7 sm:h-8 sm:w-8" />
                  )}
                </span>

                <span className="relative z-[1] min-w-0 flex-1">
                  <span className="flex items-start gap-3">
                    <strong
                      className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-[-0.015em] sm:text-lg"
                      dir="auto"
                    >
                      {entry.title}
                    </strong>
                    {/* The role held now is filled; the rest stay washed, so a
                        glance down the column finds the current one. */}
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide"
                      style={
                        current
                          ? { background: entryTone, color: "#ffffff" }
                          : {
                              background: toneWash(entryTone, 12),
                              color: entryTone,
                            }
                      }
                      dir="auto"
                    >
                      {EXPERIENCE_STATUS_TEXT[entry.status]}
                    </span>
                  </span>

                  <span
                    className="mt-1.5 block text-[13px] font-medium"
                    style={{ color: entryTone }}
                    dir="auto"
                  >
                    {entry.organization}
                    {entry.employmentType ? (
                      <span className="font-normal opacity-55">
                        {` · ${entry.employmentType}`}
                      </span>
                    ) : null}
                  </span>

                  <span
                    className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium opacity-45"
                    dir="auto"
                  >
                    <span dir="ltr">
                      {entry.startDate} – {end}
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
                      data-mini-action={`experience:${entry.id}`}
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
