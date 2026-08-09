import Image from "next/image";
import type { Star } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT } from "../liquid-glass-utils";
import type { MiniWebsitePartner } from "@/features/mini-website/types";

/**
 * The partner strip.
 *
 * A transform-only CSS loop at one flat duration, paused whenever it is off
 * screen. Logos are sized by height with an automatic width, so a wordmark and
 * a square badge both sit on the same optical line without being forced into a
 * fixed-width box.
 *
 * Earlier revisions timed this three different ways — by viewport breakpoint,
 * by container width, then by distance over a pixels-per-second speed. Each one
 * gave the duration a way to disagree with the width actually rendered, and a
 * single constant reads better than any of them did.
 */
export function PartnersSection({
  partners,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  partners: MiniWebsitePartner[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = partners.filter((partner) => partner.image);
  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <Marquee
        pauseOnHover
        speed={45}
        mobileSpeed={60}
        className="mini-logo-marquee [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
              {shown.map((partner, partnerIndex) => {
                const name = partner.name || `Partner ${partnerIndex + 1}`;
                const body = (
                  <>
                    {/* Every logo gets the same square, and sits inside it with
                        `object-contain` — a wide wordmark and a round badge end
                        up optically the same size instead of one dwarfing the
                        other. */}
                    <Image
                      src={partner.image}
                      alt={partner.name ? name : ""}
                      width={128}
                      height={128}
                      className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                      unoptimized
                    />
                    {partner.name && (
                      <span
                        className="mt-2.5 line-clamp-2 w-16 text-center text-[11px] font-semibold leading-4 text-slate-900 dark:text-slate-100 sm:w-20 sm:text-xs"
                        dir="auto"
                      >
                        {partner.name}
                      </span>
                    )}
                  </>
                );
                const itemClass =
                  "me-8 flex shrink-0 flex-col items-center justify-start transition duration-300";

                return partner.url ? (
                  <a
                    key={`${partner.id}-${partnerIndex}`}
                    href={interactive ? partner.url : undefined}
                    onClick={(event) => {
                      if (!interactive) event.preventDefault();
                    }}
                    target={interactive ? "_blank" : undefined}
                    rel="noreferrer"
                    data-mini-action={`mini:partner:${partner.id}`}
                    aria-label={name}
                    className={`${itemClass} hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current`}
                  >
                    {body}
                  </a>
                ) : (
                  <span key={`${partner.id}-${partnerIndex}`} className={itemClass}>
                    {body}
                  </span>
                );
              })}
      </Marquee>
    </SectionFrame>
  );
}
