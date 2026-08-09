import Image from "next/image";
import { Award, ExternalLink, Eye, Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import {
  GLASS_CONTROL_SHADOW,
  GLASS_SURFACE_CLASS,
  SWISS_ACCENT,
  toneWash,
} from "../liquid-glass-utils";
import { CREDENTIAL_TONES } from "./section-tokens";
import type { MiniWebsiteCertificate } from "@/features/mini-website/types";

export function CredentialsSection({
  certificates,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  certificates: MiniWebsiteCertificate[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = certificates.filter(
    (certificate) => certificate.title.trim() && certificate.issuer.trim(),
  );

  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {shown.map((certificate, certificateIndex) => {
          const credentialTone =
            CREDENTIAL_TONES[certificateIndex % CREDENTIAL_TONES.length];
          return (
            <article
              key={certificate.id}
              // A framed award rather than a bare thumbnail: the certificate is
              // matted on its own colour, which is what a printed one looks like
              // on a wall.
              className="group/card min-w-0 overflow-hidden rounded-[1.25rem] transition duration-300 hover:-translate-y-0.5"
              style={{
                backgroundImage: `linear-gradient(150deg, ${toneWash(credentialTone, 13)}, ${toneWash(credentialTone, 4)})`,
              }}
              dir="rtl"
            >
              {/* Edge to edge: the certificate fills the card's whole width,
                  and the card's own rounding clips its corners. */}
              <div className="relative">
                {certificate.image ? (
                  <button
                    type="button"
                    data-mini-image-src={
                      interactive ? certificate.image : undefined
                    }
                    data-mini-image-alt={
                      interactive ? certificate.title : undefined
                    }
                    data-mini-image-group="credentials"
                    aria-label={`کردنەوەی ${certificate.title}`}
                    className={`group relative block aspect-[4/3] w-full overflow-hidden bg-white ${interactive ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <Image
                      src={certificate.image}
                      alt={certificate.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      unoptimized
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5 opacity-0 transition group-hover:opacity-100" />
                    <span
                      className={`absolute bottom-2 left-2 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 ${GLASS_SURFACE_CLASS}`}
                      style={{ boxShadow: GLASS_CONTROL_SHADOW }}
                    >
                      <Eye className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  </button>
                ) : (
                  <span
                    className="flex aspect-[4/3] w-full items-center justify-center"
                    style={{
                      background: toneWash(credentialTone, 16),
                      color: credentialTone,
                    }}
                  >
                    <Award className="h-11 w-11 sm:h-14 sm:w-14" />
                  </span>
                )}

                {/* The year rides the corner of the certificate like a seal. */}
                {certificate.year && (
                  <span
                    className="absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow-md sm:text-[11px]"
                    style={{ background: credentialTone }}
                    dir="ltr"
                  >
                    {certificate.year}
                  </span>
                )}
              </div>

              <div className="min-w-0 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                <h3
                  className="line-clamp-2 text-sm font-semibold leading-6 sm:text-base"
                  dir="auto"
                >
                  {certificate.title}
                </h3>
                <p
                  className="mt-1 line-clamp-1 min-w-0 text-[11px] font-semibold sm:text-xs"
                  style={{ color: credentialTone }}
                  dir="auto"
                >
                  {certificate.issuer}
                </p>
                {certificate.description && (
                  <p
                    className="mt-2 line-clamp-2 text-[11px] leading-5 opacity-55 sm:text-xs"
                    dir="auto"
                  >
                    {certificate.description}
                  </p>
                )}
                {certificate.verificationUrl && (
                  <a
                    href={interactive ? certificate.verificationUrl : undefined}
                    onClick={(event) => {
                      if (!interactive) event.preventDefault();
                    }}
                    target={interactive ? "_blank" : undefined}
                    rel="noreferrer"
                    data-mini-action={`mini:certificate:${certificate.id}`}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold tracking-wide transition duration-300 hover:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current sm:text-[11px]"
                    style={{
                      background: toneWash(credentialTone, 12),
                      color: credentialTone,
                    }}
                  >
                    Verify
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </SectionFrame>
  );
}
