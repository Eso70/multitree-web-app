import Image from "next/image";
import type { CSSProperties } from "react";
import { CalendarRange, ExternalLink, MapPin, Star } from "lucide-react";
import { RailButton, SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, safeUrl, toneWash } from "../liquid-glass-utils";
import { EVENT_TONES } from "./section-tokens";
import { usePagedItems } from "./use-paged-items";
import { formatPublicEventDate } from "@/features/mini-website/public-date";
import type { MiniWebsiteEvent } from "@/features/mini-website/types";

export function EventsSection({
  events,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  events: MiniWebsiteEvent[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = events
    .filter((event) => event.title.trim() && event.startsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  // Declared before the early return so the hook order never depends on
  // whether a business has any events.
  const { page, visible, next, previous } = usePagedItems(shown, 1);

  if (!shown.length) return null;

  const [event] = visible;
  const href = safeUrl(event.registrationUrl);
  const eventTone = EVENT_TONES[page % EVENT_TONES.length];

  return (
    <SectionFrame tone={tone} {...frame}>
      {/* One featured event at a time so its artwork stays the hero; once there
          is more than one the arrows step through the list. */}
      <div className="relative">
        <article
          key={event.id}
          dir="rtl"
          className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-0.5"
          style={{
            borderColor: toneWash(eventTone, 24),
            background: toneWash(eventTone, 7),
          }}
        >
          {event.image ? (
            <button
              type="button"
              data-mini-image-src={interactive ? event.image : undefined}
              data-mini-image-alt={event.image ? event.title : undefined}
              data-mini-image-group="events"
              aria-label={
                interactive ? `کردنەوەی وێنەی ${event.title}` : undefined
              }
              className={`relative block aspect-[16/9] w-full overflow-hidden ${
                interactive
                  ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset"
                  : "cursor-default"
              }`}
              style={
                interactive
                  ? ({
                      "--tw-ring-color": toneWash(eventTone, 65),
                    } as CSSProperties)
                  : undefined
              }
            >
              <Image
                src={event.image}
                alt={event.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition duration-700 group-hover:scale-[1.045]"
                unoptimized
              />
              <span
                className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black text-white shadow-sm"
                style={{ background: eventTone }}
                dir="ltr"
              >
                {formatPublicEventDate(event.startsAt)}
              </span>
            </button>
          ) : (
            // Without artwork the card still needs a coloured head, or a
            // single feature reads as a plain text block.
            <div
              className="flex aspect-[16/5] w-full items-center justify-center"
              style={{
                background: toneWash(eventTone, 13),
                color: eventTone,
              }}
            >
              <CalendarRange className="h-7 w-7" />
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col p-3.5">
            {!event.image && (
              <span
                className="text-[10px] font-black"
                style={{ color: eventTone }}
                dir="ltr"
              >
                {formatPublicEventDate(event.startsAt)}
              </span>
            )}
            <strong
              className="mt-0.5 block text-sm font-black leading-snug"
              dir="auto"
            >
              {event.title}
            </strong>
            {event.location && (
              <span
                className="mt-1 flex items-center gap-1 text-[10px] font-bold opacity-50"
                dir="auto"
              >
                <MapPin className="h-3 w-3 shrink-0" />
                {event.location}
              </span>
            )}
            {event.description && (
              <span
                className="mt-1.5 block text-[11px] leading-5 opacity-55"
                dir="auto"
              >
                {event.description}
              </span>
            )}

            {href && (
              // Pushed to the floor so the card always ends on the same line,
              // however much copy sits above it.
              <div className="mt-auto pt-3.5">
                <a
                  href={interactive ? href : undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`تۆمارکردن بۆ ${event.title}`}
                  className="mini-glass-action flex h-10 items-center justify-center gap-1.5 rounded-xl text-[11px] font-black text-white transition duration-300 hover:gap-2.5"
                  style={{ background: eventTone }}
                  data-mini-action={`event:${event.id}`}
                >
                  تۆمارکردن
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </article>

        {shown.length > 1 && (
          <>
            <RailButton side="left" label="ڕووداوی پێشوو" onClick={previous} />
            <RailButton side="right" label="ڕووداوی دواتر" onClick={next} />
          </>
        )}
      </div>
    </SectionFrame>
  );
}
