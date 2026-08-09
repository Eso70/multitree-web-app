import Image from "next/image";
import type { CSSProperties } from "react";
import { ExternalLink, Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import { TEAM_TONES } from "./section-tokens";
import { getPlatformBrand } from "@/lib/brand/platform-brands";
import { PlatformIcon } from "@/lib/brand/PlatformVisuals";
import { buildActionHref } from "@/features/mini-website/service-action";
import type { MiniWebsiteTeamMember } from "@/features/mini-website/types";

export function TeamSection({
  team,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  team: MiniWebsiteTeamMember[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = team.filter(
    (member) => member.name.trim() && member.role.trim(),
  );
  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <ol className="space-y-2.5">
        {shown.map((member, memberIndex) => {
          const memberTone = TEAM_TONES[memberIndex % TEAM_TONES.length];
          // WhatsApp and phone keep their platform colour and glyph, the same
          // way the service buttons do — visitors recognise them on sight.
          const brand =
            member.actionType === "whatsapp" || member.actionType === "phone"
              ? getPlatformBrand(member.actionType)
              : null;
          const href =
            member.url ||
            buildActionHref(
              member.actionType,
              member.actionValue,
              member.actionCountryCode,
            );
          const buttonLabel =
            member.actionLabel.trim() ||
            (member.actionType === "whatsapp"
              ? "پەیوەندی لە واتساپ"
              : member.actionType === "phone"
                ? "پەیوەندی"
                : "زانیاری زیاتر");

          return (
            <li
              key={member.id}
              // The same tinted panel the experience and education entries use,
              // so every people-and-history list on the page reads alike.
              className="group relative flex gap-4 rounded-[1.5rem] p-4 transition duration-300 sm:gap-5 sm:p-5"
              style={{ background: toneWash(memberTone, 6) }}
              dir="rtl"
            >
              {member.image ? (
                <span
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full transition duration-500 group-hover:scale-[1.03] sm:h-20 sm:w-20 ${
                    interactive
                      ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      : ""
                  }`}
                  data-mini-image-src={interactive ? member.image : undefined}
                  data-mini-image-alt={member.name}
                  data-mini-image-group="team"
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={
                    interactive ? `کردنەوەی وێنەی ${member.name}` : undefined
                  }
                  onKeyDown={(event) => {
                    if (
                      interactive &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      event.currentTarget.click();
                    }
                  }}
                  // A ring in the member's own tone, so a row of photographs
                  // still carries the section's colour.
                  style={{
                    boxShadow: `0 0 0 2px ${toneWash(memberTone, 45)}, 0 14px 30px -20px ${memberTone}`,
                    ...(interactive
                      ? ({
                          "--tw-ring-color": toneWash(memberTone, 65),
                        } as CSSProperties)
                      : {}),
                  }}
                >
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </span>
              ) : (
                <span
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-black transition duration-500 group-hover:scale-[1.03] sm:h-20 sm:w-20 sm:text-2xl"
                  style={{
                    background: toneWash(memberTone, 14),
                    color: memberTone,
                    boxShadow: `0 0 0 2px ${toneWash(memberTone, 30)}`,
                  }}
                  aria-hidden="true"
                >
                  {member.name.trim().slice(0, 1)}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <span className="flex items-start gap-3">
                  <h3
                    className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-[-0.015em] sm:text-lg"
                    dir="auto"
                  >
                    {member.name}
                  </h3>
                  {/* Seniority sits where the experience and education entries
                      put their status, keeping the three headers aligned. */}
                  {member.experience && (
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide"
                      style={{
                        background: toneWash(memberTone, 12),
                        color: memberTone,
                      }}
                      dir="auto"
                    >
                      {member.experience}
                    </span>
                  )}
                </span>

                <span
                  className="mt-1.5 block text-[13px] font-medium"
                  style={{ color: memberTone }}
                  dir="auto"
                >
                  {member.role}
                </span>

                {member.bio && (
                  <p
                    className="mt-3 text-xs leading-6 opacity-60 sm:text-[13px]"
                    dir="auto"
                  >
                    {member.bio}
                  </p>
                )}

              {href && member.actionType !== "none" && (
                <a
                  href={interactive ? href : undefined}
                  onClick={(event) => {
                    if (!interactive) event.preventDefault();
                  }}
                  target={
                    interactive && /^https?:/i.test(href) ? "_blank" : undefined
                  }
                  rel="noreferrer"
                  data-mini-action={`mini:team:${member.id}`}
                  className="mt-3.5 inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 text-xs font-semibold tracking-wide text-white transition duration-300 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                  // Full strength rather than a wash, which keeps the white
                  // label above the contrast floor.
                  style={{ backgroundColor: brand?.background ?? memberTone }}
                  dir="auto"
                >
                  {buttonLabel}
                  {brand ? (
                    <PlatformIcon
                      platform={member.actionType}
                      className="h-4 w-4"
                      tone="brand"
                    />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </SectionFrame>
  );
}
