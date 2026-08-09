import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MessageCircle,
  Tag,
} from "lucide-react";
import type { Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import {
  BOOKING_PROVIDER_LABELS,
  bookingActionLabel,
  bookingHref,
} from "@/features/mini-website/booking-action";
import { latinDigits } from "@/features/mini-website/hours";
import { getPlatformBrand } from "@/lib/brand/platform-brands";
import { PlatformIcon } from "@/lib/brand/PlatformVisuals";
import type { MiniWebsiteBooking } from "@/features/mini-website/types";
import { BOOKING_TONES } from "./section-tokens";

/**
 * Provider-neutral appointment cards.
 *
 * MultiTree records the click while the public scheduler owns availability,
 * confirmation, cancellation, and reminders. Each card keeps its own action key
 * so analytics can distinguish appointment types on the same page.
 */
export function BookingSection({
  bookings,
  interactive,
  tone = SWISS_ACCENT,
  fullPage,
  ...frame
}: {
  bookings: MiniWebsiteBooking[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = bookings.filter(
    (booking) => booking.title.trim() && bookingHref(booking),
  );
  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} fullPage={fullPage} {...frame}>
      <div className="space-y-2">
        {shown.map((booking, bookingIndex) => {
          const href = bookingHref(booking);
          const whatsapp = booking.provider === "whatsapp";
          const providerBrand = whatsapp ? getPlatformBrand("whatsapp") : null;
          const bookingTone =
            BOOKING_TONES[bookingIndex % BOOKING_TONES.length];
          // WhatsApp keeps its platform colour because visitors recognise it;
          // every other provider takes the card's own tone.
          const buttonBackground = providerBrand?.background ?? bookingTone;

          return (
            <article
              key={booking.id}
              data-mini-booking-card
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 rounded-2xl border px-3.5 py-4 transition duration-300 hover:-translate-y-0.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4"
              style={{
                borderColor: toneWash(bookingTone, 24),
                background: toneWash(bookingTone, 7),
              }}
              dir="rtl"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] text-white shadow-[0_9px_22px_-13px_rgba(15,23,42,0.85)]"
                style={{ backgroundColor: toneWash(buttonBackground, 78) }}
              >
                {whatsapp ? (
                  <PlatformIcon
                    platform="whatsapp"
                    className="h-[18px] w-[18px]"
                    tone="brand"
                  />
                ) : (
                  <CalendarDays className="h-[18px] w-[18px]" />
                )}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className="text-[15px] font-black sm:text-base"
                    dir="auto"
                  >
                    {booking.title}
                  </h3>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-black"
                    style={{
                      color: bookingTone,
                      background: toneWash(bookingTone, 9),
                    }}
                    dir="ltr"
                  >
                    {BOOKING_PROVIDER_LABELS[booking.provider]}
                  </span>
                  <span className="text-[10px] font-black opacity-25" dir="ltr">
                    {latinDigits(String(bookingIndex + 1).padStart(2, "0"))}
                  </span>
                </div>
                {booking.description && (
                  <p className="mt-1 text-xs leading-5 opacity-55" dir="auto">
                    {booking.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
                    style={{
                      color: bookingTone,
                      background: toneWash(bookingTone, 10),
                    }}
                    dir="ltr"
                  >
                    <Clock3 className="h-3.5 w-3.5" />
                    {latinDigits(String(booking.durationMinutes))} خولەک
                  </span>
                  {booking.price && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
                      style={{
                        color: bookingTone,
                        background: toneWash(bookingTone, 10),
                      }}
                      dir="auto"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {latinDigits(booking.price)}
                    </span>
                  )}
                </div>
              </div>

              <a
                href={interactive ? href : undefined}
                onClick={(event) => {
                  if (!interactive) event.preventDefault();
                }}
                target={interactive ? "_blank" : undefined}
                rel="noreferrer"
                data-mini-action={`mini:booking:${booking.id}`}
                className="mini-glass-action col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 text-xs font-black text-white shadow-[0_10px_24px_-17px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:opacity-95 sm:col-span-1 sm:min-w-36"
                style={{ backgroundColor: toneWash(buttonBackground, 78) }}
                dir="auto"
              >
                {bookingActionLabel(booking)}
                {whatsapp ? (
                  <MessageCircle className="h-4 w-4" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
              </a>
            </article>
          );
        })}
      </div>
    </SectionFrame>
  );
}
