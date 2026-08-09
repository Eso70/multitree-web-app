import Image from "next/image";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  EllipsisVertical,
  ExternalLink,
  Lock,
  RotateCw,
  Star,
} from "lucide-react";
import { RailButton, SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, safeUrl, toneWash } from "../liquid-glass-utils";
import {
  OWNED_PROPERTY_TONES,
  OWNED_PROPERTY_TYPE_TEXT,
  OWNED_PROPERTY_VISIT_TEXT,
} from "./section-tokens";
import { ownedPropertyAddress, ownedPropertyEmbed } from "./section-utils";
import { usePagedItems } from "./use-paged-items";
import { PlatformIcon } from "@/lib/brand/PlatformVisuals";
import type { MiniWebsiteOwnedProperty } from "@/features/mini-website/types";

function ownedPropertyIcon(property: MiniWebsiteOwnedProperty) {
  if (
    property.propertyType === "facebook" ||
    property.propertyType === "instagram" ||
    property.propertyType === "youtube"
  )
    return (
      <PlatformIcon platform={property.propertyType} className="h-5 w-5" />
    );
  return <Building2 className="h-5 w-5" />;
}

export function OwnedPropertiesSection({
  items,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  items: MiniWebsiteOwnedProperty[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = items.filter(
    (property) =>
      property.name.trim() &&
      property.relationship.trim() &&
      safeUrl(property.url),
  );
  // Declared before the early return so the hook order never depends on
  // whether a page has any pages of its own.
  const { page, visible, next, previous } = usePagedItems(shown, 1);

  if (!shown.length) return null;

  const [property] = visible;
  const propertyTone = OWNED_PROPERTY_TONES[page % OWNED_PROPERTY_TONES.length];
  const address = ownedPropertyAddress(property.url);
  const embed = ownedPropertyEmbed(property);
  const showsImage = !embed && Boolean(property.image);
  const openable = interactive && showsImage;

  return (
    <SectionFrame tone={tone} {...frame}>
      <div className="relative">
        {/* A browser window around the page, so a visitor sees where the link
            goes before they take it. */}
        <div
          className="group overflow-hidden rounded-2xl border shadow-[0_18px_44px_-30px_rgba(15,23,42,0.55)]"
          style={{
            borderColor: toneWash(propertyTone, 22),
            background: toneWash(propertyTone, 8),
          }}
        >
          {/* Toolbar. The frame opens here: a tab strip repeated the name that
              the caption below already carries, and the window reads as a
              browser from the address bar alone. */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ background: toneWash(propertyTone, 11) }}
            dir="ltr"
            aria-hidden="true"
          >
            <span className="flex shrink-0 gap-1.5">
              {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
                <span
                  key={dot}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: dot }}
                />
              ))}
            </span>

            <span className="flex shrink-0 items-center gap-1.5 opacity-40">
              <ArrowLeft className="h-3.5 w-3.5" />
              <ArrowRight className="h-3.5 w-3.5" />
              <RotateCw className="h-3.5 w-3.5" />
            </span>

            {address && (
              <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] dark:bg-slate-950/60">
                {address.secure && (
                  <Lock
                    className="h-3 w-3 shrink-0"
                    style={{ color: propertyTone }}
                  />
                )}
                <span className="truncate">
                  <span
                    className="font-semibold"
                    style={{ color: propertyTone }}
                  >
                    {address.host}
                  </span>
                  <span className="opacity-45">{address.path}</span>
                </span>
              </span>
            )}

            <EllipsisVertical className="h-3.5 w-3.5 shrink-0 opacity-40" />
          </div>

          {/* The page itself: a live embed when the business supplied a public
              post, otherwise their own artwork. */}
          {embed ? (
            <iframe
              title={embed.title}
              src={embed.src}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              className={`w-full border-0 bg-white ${embed.aspect} ${
                interactive ? "" : "pointer-events-none"
              }`}
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : property.image ? (
            <span
              className={`relative block aspect-[16/9] w-full bg-white ${
                openable
                  ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  : ""
              }`}
              data-mini-image-src={openable ? property.image : undefined}
              data-mini-image-alt={property.name}
              data-mini-image-group="owned-properties"
              role={openable ? "button" : undefined}
              tabIndex={openable ? 0 : undefined}
              aria-label={openable ? `کردنەوەی وێنەی ${property.name}` : undefined}
              onKeyDown={(event) => {
                if (openable && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
              style={
                openable
                  ? ({
                      "--tw-ring-color": toneWash(propertyTone, 65),
                    } as CSSProperties)
                  : undefined
              }
            >
              <Image
                src={property.image}
                alt={property.name}
                fill
                sizes="(max-width: 768px) 100vw, 70vw"
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
                unoptimized
              />
            </span>
          ) : (
            <span
              className="flex aspect-[16/9] w-full items-center justify-center"
              style={{
                background: toneWash(propertyTone, 10),
                color: propertyTone,
              }}
            >
              {ownedPropertyIcon(property)}
            </span>
          )}
        </div>

        {shown.length > 1 && (
          <>
            <RailButton side="left" label="پەڕەی پێشوو" onClick={previous} />
            <RailButton side="right" label="پەڕەی دواتر" onClick={next} />
          </>
        )}
      </div>

      <div className="mt-3.5 min-w-0 px-0.5">
        <span
          className="block text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: propertyTone }}
          dir="auto"
        >
          {property.relationship}
        </span>
        <strong
          className="mt-1 block text-base font-semibold leading-snug tracking-[-0.015em] sm:text-lg"
          dir="auto"
        >
          {property.name}
        </strong>
        <span className="mt-1 block text-[11px] font-medium opacity-45" dir="ltr">
          {OWNED_PROPERTY_TYPE_TEXT[property.propertyType]}
          {property.foundedYear ? ` · ${property.foundedYear}` : ""}
        </span>

        {property.description && (
          <p
            className="mt-2.5 text-xs leading-6 opacity-60 sm:text-[13px]"
            dir="auto"
          >
            {property.description}
          </p>
        )}

        <a
          href={interactive ? property.url : undefined}
          onClick={(event) => {
            if (!interactive) event.preventDefault();
          }}
          target="_blank"
          rel="noreferrer"
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold tracking-wide text-white transition duration-300 hover:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          style={{ background: propertyTone }}
          data-mini-action={`owned-property:${property.id}`}
        >
          {OWNED_PROPERTY_VISIT_TEXT[property.propertyType]}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </SectionFrame>
  );
}
