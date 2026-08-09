"use client";

import { Marquee } from "@/components/ui/marquee";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import {
  BUSINESS_LANDING_DECORATION_COLORS,
  BUSINESS_LANDING_DECORATION_LABELS,
} from "@/components/business/business-landing-sections";

export interface TrustedPartner {
  id: string;
  name: string;
  image: string;
  url?: string | null;
}

export function BusinessTrustedBy({
  partners,
  title = "متمانەپێکراو لەلایەن",
}: {
  partners: TrustedPartner[];
  title?: string;
}) {
  if (partners.length === 0) return null;

  return (
    <section
      aria-labelledby="business-trusted-by-title"
      className="relative mx-auto w-full max-w-7xl py-24 sm:py-28 lg:py-32"
    >
      <BusinessSectionDecorations
        colors={BUSINESS_LANDING_DECORATION_COLORS.trusted}
        labels={BUSINESS_LANDING_DECORATION_LABELS.trusted}
        variant={2}
      />
      <h2
        id="business-trusted-by-title"
        className="mx-auto max-w-4xl break-words text-center text-[clamp(2.35rem,5vw,4.9rem)] font-medium leading-[1.06] tracking-[-0.04em] text-[#111827] text-balance [overflow-wrap:anywhere] dark:text-white"
      >
        {title}
      </h2>

      <Marquee
        pauseOnHover
        speed={30}
        mobileSpeed={60}
        className="business-trusted-marquee mt-16 sm:mt-20"
      >
        {partners.map((partner) => {
          const logo = (
            // Tenant logos have unknown natural aspect ratios.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partner.image}
              alt={partner.name}
              className="business-trusted-logo"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          );
          const className =
            "business-trusted-logo-wrap group focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2";

          return partner.url ? (
            <a
              key={partner.id}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              aria-label={partner.name}
            >
              {logo}
            </a>
          ) : (
            <span key={partner.id} className={className}>
              {logo}
            </span>
          );
        })}
      </Marquee>
    </section>
  );
}
