import Image from "next/image";
import type { CSSProperties } from "react";
import type { Star } from "lucide-react";
import { BriefcaseBusiness, ExternalLink, Tag } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import { SnapRail } from "../ui";
import { latinDigits } from "@/features/mini-website/hours";
import { SERVICE_CARD_TONES } from "./section-tokens";
import {
  actionLabelFor,
  serviceActionHref,
} from "@/features/mini-website/service-action";
import { getPlatformBrand } from "@/lib/brand/platform-brands";
import { PlatformIcon } from "@/lib/brand/PlatformVisuals";
import type { MiniWebsiteService } from "@/features/mini-website/types";

export function ServicesSection({
  services,
  interactive,
  fallbackHref,
  tone = SWISS_ACCENT,
  fullPage,
  ...frame
}: {
  services: MiniWebsiteService[];
  interactive: boolean;
  fallbackHref?: string;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = services.filter((service) => service.title.trim());
  if (!shown.length) return null;

  const renderService = (service: MiniWebsiteService, serviceIndex: number) => {
    const href = serviceActionHref(service) || fallbackHref;
    const label = actionLabelFor(service) || "داواکاری";
    const brand =
      service.actionType === "whatsapp" || service.actionType === "phone"
        ? getPlatformBrand(service.actionType)
        : null;
    const serviceTone =
      SERVICE_CARD_TONES[serviceIndex % SERVICE_CARD_TONES.length];
    // WhatsApp and phone keep their platform colour because visitors recognise
    // it; every other action takes the card's own tone. Both are used at full
    // strength so the button's white label stays above the contrast floor.
    const buttonBackground = brand?.background ?? serviceTone;

    return (
      <article
        key={service.id}
        data-mini-service-card
        className={
          fullPage
            ? "group flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-slate-900/10 bg-white/65 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.65)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_34px_80px_-38px_rgba(15,23,42,0.75)] dark:border-white/10 dark:bg-white/[0.055]"
            : "flex w-[86vw] max-w-[27rem] flex-col transition duration-300 hover:-translate-y-0.5 sm:w-[58vw] lg:w-[26rem]"
        }
        dir="rtl"
      >
        <div
          data-mini-service-image
          data-mini-image-src={service.image || undefined}
          data-mini-image-alt={service.image ? service.title : undefined}
          data-mini-image-group="services"
          role={interactive && service.image ? "button" : undefined}
          tabIndex={interactive && service.image ? 0 : undefined}
          aria-label={
            interactive && service.image
              ? `کردنەوەی وێنەی ${service.title}`
              : undefined
          }
          onKeyDown={(event) => {
            if (
              interactive &&
              service.image &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
          className={`relative overflow-hidden ${
            fullPage
              ? `aspect-[16/10] w-full bg-slate-100 dark:bg-slate-900 ${interactive && service.image ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset" : ""}`
              : "aspect-[4/5] w-full rounded-2xl"
          }`}
          style={
            interactive && service.image
              ? ({
                  "--tw-ring-color": toneWash(serviceTone, 65),
                } as CSSProperties)
              : undefined
          }
        >
          {service.image ? (
            <Image
              src={service.image}
              alt={service.title}
              fill
              className="object-cover transition duration-700 group-hover:scale-[1.045]"
              unoptimized
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center"
              style={{ background: toneWash(serviceTone, 14) }}
            >
              <BriefcaseBusiness
                className={fullPage ? "h-6 w-6" : "h-10 w-10"}
                style={{ color: serviceTone }}
              />
            </span>
          )}

          {service.image && fullPage && (
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(to top, ${toneWash(serviceTone, 34)}, transparent 58%)`,
              }}
            />
          )}

          <span
            className={`absolute left-4 top-4 flex items-center justify-center font-black text-white shadow-[0_14px_30px_-16px_rgba(15,23,42,0.95)] backdrop-blur-md ${
              fullPage
                ? "h-11 min-w-11 rounded-2xl px-3 text-sm"
                : "h-9 min-w-9 rounded-xl px-2.5 text-xs"
            }`}
            style={{ background: toneWash(serviceTone, 84) }}
            dir="ltr"
          >
            {latinDigits(String(serviceIndex + 1).padStart(2, "0"))}
          </span>

          {!fullPage && (
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/20 to-transparent"
              aria-hidden="true"
            />
          )}
        </div>

        <div
          className={`flex min-w-0 flex-1 flex-col ${
            fullPage ? "p-5 sm:p-6" : "px-1 pt-4"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3
              data-mini-service-title
              className={`${fullPage ? "text-xl sm:text-2xl" : "text-base sm:text-lg"} font-black leading-snug tracking-tight`}
              style={{ color: serviceTone }}
              dir="auto"
            >
              {service.title}
            </h3>
            {service.price && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black"
                style={{
                  color: serviceTone,
                  background: toneWash(serviceTone, 10),
                }}
                dir="auto"
              >
                <Tag className="h-3 w-3" />
                {latinDigits(service.price)}
              </span>
            )}
          </div>
          {service.description && (
            <p
              className={`${fullPage ? "mt-3 text-sm leading-7" : "mt-2 text-xs leading-7 sm:text-[13px]"} flex-1 opacity-60`}
              dir="auto"
            >
              {service.description}
            </p>
          )}

          {href && (
            <a
              href={interactive ? href : undefined}
              onClick={(event) => {
                if (!interactive) event.preventDefault();
              }}
              target={
                interactive && /^https?:/i.test(href) ? "_blank" : undefined
              }
              rel="noreferrer"
              data-mini-action={`mini:service:${service.id}`}
              className={`${fullPage ? "mt-5 min-h-11 px-5 text-sm" : "mt-5 py-2 pl-2 pr-5 text-xs sm:text-sm"} mini-glass-action inline-flex items-center justify-center gap-2 self-start rounded-full font-black text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:opacity-95`}
              style={{ backgroundColor: buttonBackground }}
              dir="auto"
            >
              {label}
              {brand ? (
                <PlatformIcon
                  platform={service.actionType}
                  className="h-4 w-4"
                  tone="brand"
                />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
            </a>
          )}
        </div>
      </article>
    );
  };

  return (
    <SectionFrame tone={tone} fullPage={fullPage} {...frame}>
      {fullPage ? (
        <div className="grid gap-5 md:grid-cols-2 xl:gap-7">
          {shown.map(renderService)}
        </div>
      ) : (
        <SnapRail
          label="خزمەتگوزارییەکان"
          items={shown}
          renderItem={renderService}
        />
      )}
    </SectionFrame>
  );
}
