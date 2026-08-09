import Image from "next/image";
import { useSyncExternalStore } from "react";
import type { Star } from "lucide-react";
import { BadgePercent, Clock3, ExternalLink, Tag } from "lucide-react";
import { RailButton, SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, safeUrl, toneWash } from "../liquid-glass-utils";
import {
  formatPublicMiniWebsiteDate,
  readClientIsoDate,
  readServerIsoDate,
  subscribeToClientDate,
} from "@/features/mini-website/public-date";
import { OFFER_TONES } from "./section-tokens";
import { offerDiscount } from "./section-utils";
import { usePagedItems } from "./use-paged-items";
import type { MiniWebsiteSpecialOffer } from "@/features/mini-website/types";

const OFFERS_PER_PAGE = 4;

export function SpecialOffersSection({
  offers,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  offers: MiniWebsiteSpecialOffer[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = offers.filter((offer) => offer.title.trim());
  const today = useSyncExternalStore(
    subscribeToClientDate,
    readClientIsoDate,
    readServerIsoDate,
  );
  // Declared before the early return so the hook order never depends on
  // whether a business is running any promotions.
  const { pageCount, start, visible, next, previous } = usePagedItems(
    shown,
    OFFERS_PER_PAGE,
  );

  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      {/* A board rather than a rail: a promotion the visitor has to find behind
          an arrow is a promotion that does not get read. Past the first four
          the arrows take over, so a long list cannot stretch the section — and
          the row it shares with its neighbour — down the page. */}
      <div className="relative">
      <div className={frame.fullPage ? "grid gap-3.5 sm:grid-cols-2" : "grid gap-2.5"}>
        {visible.map((offer, visibleIndex) => {
          // Keyed to the offer's place in the whole list, not the page, so a
          // card keeps its colour when the visitor pages back to it.
          const offerTone =
            OFFER_TONES[(start + visibleIndex) % OFFER_TONES.length];
          const expired = Boolean(offer.expiresAt && offer.expiresAt < today);
          const href = safeUrl(offer.url);
          const discount = offerDiscount(offer.originalPrice, offer.offerPrice);
          return (
            <article
              key={offer.id}
              dir="rtl"
              className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border transition duration-300 ${
                expired ? "opacity-55 grayscale" : "hover:-translate-y-0.5"
              }`}
              style={{
                borderColor: toneWash(offerTone, 24),
                background: toneWash(offerTone, 7),
              }}
            >
              <div className="relative">
                {offer.image ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <Image
                      src={offer.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  // Without artwork the card still needs a coloured head, or a
                  // column of them reads as plain text blocks.
                  <div
                    className="flex aspect-[16/5] w-full items-center justify-center"
                    style={{
                      background: toneWash(offerTone, 13),
                      color: offerTone,
                    }}
                  >
                    <BadgePercent className="h-7 w-7" />
                  </div>
                )}

                {discount !== null && (
                  <span
                    className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black text-white shadow-sm"
                    style={{ background: offerTone }}
                    dir="ltr"
                  >
                    −{discount}%
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col p-3.5">
                <strong
                  className="block text-sm font-black leading-snug"
                  dir="auto"
                >
                  {offer.title}
                </strong>
                {offer.description && (
                  <span
                    className="mt-1.5 block text-[11px] leading-5 opacity-55"
                    dir="auto"
                  >
                    {offer.description}
                  </span>
                )}

                {(offer.offerPrice || offer.originalPrice) && (
                  <div className="mt-3 flex items-baseline gap-2" dir="auto">
                    {offer.offerPrice && (
                      <strong
                        className="text-lg font-black leading-none"
                        style={{ color: offerTone }}
                      >
                        {offer.offerPrice}
                      </strong>
                    )}
                    {offer.originalPrice && (
                      <span className="text-xs opacity-40 line-through">
                        {offer.originalPrice}
                      </span>
                    )}
                  </div>
                )}

                {(offer.couponCode || offer.expiresAt) && (
                  // Torn along a dashed line, the way a voucher is.
                  <div
                    className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed pt-3"
                    style={{ borderColor: toneWash(offerTone, 30) }}
                  >
                    {offer.couponCode && (
                      <code
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-[10px] font-black"
                        style={{ borderColor: offerTone, color: offerTone }}
                        dir="ltr"
                      >
                        <Tag className="h-3 w-3" />
                        {offer.couponCode}
                      </code>
                    )}
                    {offer.expiresAt && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          expired ? "text-rose-500" : "opacity-50"
                        }`}
                        dir="auto"
                      >
                        <Clock3 className="h-3 w-3" />
                        {/* English for the same reason as the experience and
                            owned-property chips: a short status beside a date
                            reads as metadata, not prose. The date itself stays
                            Kurdish — it is the content. */}
                        {expired ? "Expired" : "Until"}{" "}
                        {formatPublicMiniWebsiteDate(offer.expiresAt)}
                      </span>
                    )}
                  </div>
                )}

                {href && !expired && (
                  // Pushed to the floor so every card in a row ends on the same
                  // line, however much copy sits above it.
                  <div className="mt-auto pt-3.5">
                    <a
                      href={interactive ? href : undefined}
                      target="_blank"
                      rel="noreferrer"
                      // `dir` is set against the card's RTL, so the arrow
                      // trails the English label the way it does on the
                      // owned-property visit button.
                      dir="ltr"
                      className="mini-glass-action flex h-10 items-center justify-center gap-1.5 rounded-xl text-[11px] font-black text-white transition duration-300 hover:gap-2.5"
                      style={{ background: offerTone }}
                      data-mini-action={`offer:${offer.id}`}
                    >
                      View offer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {pageCount > 1 && (
        <>
          <RailButton side="left" label="ئۆفەری پێشوو" onClick={previous} />
          <RailButton side="right" label="ئۆفەری دواتر" onClick={next} />
        </>
      )}
      </div>
    </SectionFrame>
  );
}
