import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { Phone } from "lucide-react";
import type { Star } from "lucide-react";
import { MotionPulse } from "@/components/motion/MotionPrimitives";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import { useNearViewport } from "@/hooks/useNearViewport";
import type { MiniWebsiteLocation } from "@/features/mini-website/types";

const LocationMap = dynamic(
  () =>
    import("@/features/mini-website/LocationMap").then(
      (module) => module.LocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <MotionPulse
        className="h-full w-full bg-current/[0.04]"
        aria-hidden="true"
      />
    ),
  },
);

/**
 * Location, using the same card language as the social row so the page reads as
 * one system: hairline-separated rows, a tinted chip, and the section's own
 * colour on the labels.
 *
 * An approximate location shows only the radius the business chose — the map
 * never receives the exact point, so it cannot be recovered from the page.
 */
export function LocationSection({
  locations,
  interactive,
  accent,
  dark,
  tone = SWISS_ACCENT,
  ...frame
}: {
  locations: MiniWebsiteLocation[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  dark?: boolean;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  // The first entry is the primary, so it is what the page opens on.
  const [selected, setSelected] = useState(0);
  const {
    ref: mapRef,
    isNear: mapReady,
  } = useNearViewport<HTMLDivElement>({ rootMargin: "900px 0px" });
  const location = locations[selected] ?? locations[0];

  const lines = location
    ? [location.address, location.area, location.city].filter((line) =>
        line.trim(),
      )
    : [];
  const hasPin =
    Boolean(location) && location.lat !== null && location.lng !== null;
  if (!location || (!lines.length && !hasPin && !location.mapUrl)) return null;

  /**
   * An exact location opens on its pin. An approximate one must not hand out
   * the point hidden behind the radius, so it opens the area instead: the
   * written address when there is one, otherwise coordinates rounded to about a
   * kilometre — enough to land in the right neighbourhood, not on the door.
   */
  const googleMapsHref = (() => {
    const search = (query: string) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    if (location.precision === "approximate") {
      if (lines.length) return search(lines.join(", "));
      return hasPin
        ? search(`${location.lat!.toFixed(2)},${location.lng!.toFixed(2)}`)
        : "";
    }

    if (location.mapUrl) return location.mapUrl;
    return hasPin ? search(`${location.lat},${location.lng}`) : "";
  })();

  const openInGoogleMaps = () => {
    if (!interactive || !googleMapsHref) return;
    window.open(googleMapsHref, "_blank", "noopener,noreferrer");
  };

  // The address is a single field now. Area and city are still read so records
  // saved when they were separate keep rendering the way they were entered.
  // A branch leads with its name; a single location leads with its address.
  const title =
    location.name ||
    location.address ||
    location.area ||
    location.city ||
    "شوێن";
  const secondary = [location.address, location.area, location.city]
    .filter((line) => line.trim() && line !== title)
    .join(" · ");

  // Dialable rather than printed: a number the reader has to copy by hand is
  // also a number that never reaches the analytics action log.
  const phoneDigits = location.phone.replace(/\D/g, "");
  const phoneHref = phoneDigits
    ? `tel:+${location.phoneCountryCode}${phoneDigits}`
    : "";

  return (
    <SectionFrame accent={accent} tone={tone} {...frame}>
      {/* Only shown for a multi-branch business; a single location renders
          exactly as it did before. */}
      {locations.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" dir="ltr">
          {locations.map((entry, entryIndex) => {
            const active = entryIndex === selected;
            return (
              <button
                key={entryIndex}
                type="button"
                onClick={() => interactive && setSelected(entryIndex)}
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  active
                    ? "text-white"
                    : "border border-current/15 opacity-60 hover:opacity-100"
                }`}
                style={active ? { background: tone } : undefined}
                dir="auto"
              >
                {entry.name?.trim() ||
                  entry.address?.trim() ||
                  `شوێنی ${entryIndex + 1}`}
              </button>
            );
          })}
        </div>
      )}

      <div dir="ltr">
        {hasPin && (
          <div
            ref={mapRef}
            className="relative h-56 overflow-hidden rounded-2xl border bg-current/[0.04] sm:h-80 lg:h-[30rem]"
            style={{ borderColor: toneWash(tone, 22) }}
          >
            {mapReady && (
              <LocationMap
                location={location}
                accent={accent}
                interactive={interactive}
                dark={dark}
                onOpenExternal={googleMapsHref ? openInGoogleMaps : undefined}
              />
            )}
          </div>
        )}

        {/* Stacked on phones, one row from `lg` — place on the left, action on
            the right, which keeps the bar shallow and the map dominant. */}
        <div
          className="mt-4 flex flex-col gap-4 rounded-3xl border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
          style={{
            background: `linear-gradient(180deg, ${toneWash(tone, 8)}, ${toneWash(tone, 2)} 70%)`,
            borderColor: toneWash(tone, 18),
          }}
        >
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {/* Only rendered when the business supplied a photo — an icon
                placeholder just added a box with nothing in it. */}
            {location.image && (
              <span
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl transition duration-300 group-hover:scale-[1.03] sm:h-24 sm:w-24 lg:h-28 lg:w-28 ${
                  interactive
                    ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                    : ""
                }`}
                data-mini-image-src={interactive ? location.image : undefined}
                data-mini-image-alt={location.image ? title : undefined}
                data-mini-image-group="location"
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={
                  interactive ? `کردنەوەی وێنەی ${title}` : undefined
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
              >
                <Image
                  src={location.image}
                  alt={title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  className="truncate text-lg font-black sm:text-xl lg:text-2xl"
                  style={{ color: tone }}
                  dir="auto"
                >
                  {title}
                </span>
                {location.precision === "approximate" && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-current/15 px-2.5 py-1 text-[10px] font-black opacity-60">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    ناوچەی نزیکەیی
                  </span>
                )}
              </span>
              {secondary && (
                <span
                  className="mt-1.5 block text-sm font-bold leading-6 opacity-60 sm:text-base"
                  dir="auto"
                >
                  {secondary}
                </span>
              )}
            </span>
          </div>

          {/* Side by side at every size: the phone is a compact square and the
              directions button takes the rest, so neither needs its own row.
              Both share the plain outline the social cards use — a hairline
              border and one quiet hover, no shadow or blur competing with the
              map above. */}
          <div className="flex w-full shrink-0 items-center gap-2 lg:w-auto">
            {phoneHref && (
              // Icon only: the number itself adds nothing on a phone, where the
              // action is to dial rather than to read it. Still a real `tel:`
              // anchor, so it dials and registers with the page's click
              // tracking, and the number stays in the accessible name.
              <a
                href={interactive ? phoneHref : undefined}
                onClick={(event) => {
                  if (!interactive) event.preventDefault();
                }}
                aria-label={`+${location.phoneCountryCode} ${phoneDigits}`}
                title={`+${location.phoneCountryCode} ${phoneDigits}`}
                className="mini-glass-action flex min-h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-current/10 transition duration-200 hover:-translate-y-0.5 hover:border-current/20 hover:bg-current/[0.03]"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}

            {googleMapsHref && (
              <button
                type="button"
                onClick={openInGoogleMaps}
                disabled={!interactive}
                className="mini-glass-action flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-current/10 px-6 text-sm font-black transition duration-200 hover:-translate-y-0.5 hover:border-current/20 hover:bg-current/[0.03] disabled:cursor-default disabled:hover:translate-y-0 lg:flex-none lg:px-7"
              >
                کردنەوەی لە گوگڵ
              </button>
            )}
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
