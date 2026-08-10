import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { VerifiedBadge } from "./VerifiedBadge";
import { getAppBaseUrl } from "@/lib/utils/app-url";

export type PublicFooterLink = {
  label: string;
  href?: string;
  external?: boolean;
};

export type PublicFooterColumn = {
  title: string;
  links: PublicFooterLink[];
};

type PublicSiteFooterProps = {
  brandName: string;
  logo?: string | null;
  description: string;
  columns: PublicFooterColumn[];
  accentColor?: string;
  copyrightText: string;
  bottomLinks?: PublicFooterLink[];
  showPoweredBy?: boolean;
  poweredByLabel?: string;
  showVerifiedBadge?: boolean;
  verifiedLabel?: string;
  appearance?: "adaptive" | "dark" | "landing";
  /** When set, the logo + brand name link back to this href. */
  homeHref?: string;
};

function FooterLink({ link }: { link: PublicFooterLink }) {
  const className =
    "group/link inline-flex w-fit items-center gap-0 text-sm text-gray-600 transition-all hover:gap-1.5 hover:text-[var(--public-footer-accent)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-footer-accent)]/30 dark:text-slate-400 dark:hover:text-white";

  if (!link.href) {
    return (
      <span className="text-sm text-gray-500 dark:text-slate-400" dir="auto">
        {link.label}
      </span>
    );
  }

  const content = (
    <>
      <span
        aria-hidden="true"
        className="h-1 w-0 shrink-0 rounded-full bg-[var(--public-footer-accent)] opacity-0 transition-all duration-200 group-hover/link:w-1 group-hover/link:opacity-100"
      />
      <span className="truncate">{link.label}</span>
    </>
  );

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} dir="auto">
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className} dir="auto">
      {content}
    </Link>
  );
}

function BrandBlock({
  brandName,
  logo,
  homeHref,
  children,
}: {
  brandName: string;
  logo?: string | null;
  homeHref?: string;
  children?: ReactNode;
}) {
  const inner = (
    <>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl p-[3px]"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--public-footer-accent) 45%, transparent), transparent)",
        }}
      >
        <Image
          src={logo || "/images/DefaultAvatar.png"}
          alt={`${brandName} logo`}
          width={42}
          height={42}
          className="h-full w-full rounded-[0.85rem] object-cover shadow-sm"
          unoptimized
        />
      </span>
      <strong
        className="flex min-w-0 items-center gap-1.5 text-xl font-black tracking-tight text-gray-800 dark:text-white"
        dir="auto"
      >
        <span className="truncate">{brandName}</span>
        {children}
      </strong>
    </>
  );

  if (homeHref) {
    return (
      <Link
        href={homeHref}
        className="flex items-center gap-3 transition-opacity hover:opacity-80 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-footer-accent)]/30"
      >
        {inner}
      </Link>
    );
  }

  return <div className="flex items-center gap-3">{inner}</div>;
}

/**
 * Shared public-site footer used by tenant homepages and mini websites.
 * Callers own the content; the responsive layout and visual system stay here.
 */
export function PublicSiteFooter({
  brandName,
  logo,
  description,
  columns,
  accentColor = "var(--business-website-color, var(--multitree-accent))",
  copyrightText,
  bottomLinks = [],
  showPoweredBy = true,
  poweredByLabel = "Powered by",
  showVerifiedBadge = false,
  verifiedLabel,
  appearance = "adaptive",
  homeHref,
}: PublicSiteFooterProps) {
  const totalColumns = 1 + columns.length;
  const gridClass =
    totalColumns >= 5
      ? "md:grid-cols-5"
      : totalColumns === 4
        ? "md:grid-cols-4"
        : totalColumns === 3
          ? "md:grid-cols-3"
          : "md:grid-cols-2";
  const appearanceClass =
    appearance === "dark"
      ? "dark border-gray-800 bg-[#0b0d0e] text-white"
      : appearance === "landing"
        ? "border-black/10 bg-[#f8f9fa] text-[#111827] dark:border-white/10 dark:bg-[#0b0d0e] dark:text-white"
        : "border-gray-200 bg-white text-[#111827] dark:border-gray-800 dark:bg-[#0f172a] dark:text-white";

  return (
    <footer
      className={`relative z-10 overflow-hidden border-t py-12 transition-colors duration-300 sm:py-16 ${appearanceClass}`}
      style={{ "--public-footer-accent": accentColor } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--public-footer-accent) 55%, transparent), transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 0%, color-mix(in srgb, var(--public-footer-accent) 6%, transparent) 0%, transparent 75%)",
        }}
      />

      <div
        className={`relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 sm:px-6 ${gridClass}`}
      >
        <div className="flex max-w-sm flex-col gap-4">
          <BrandBlock brandName={brandName} logo={logo} homeHref={homeHref}>
            {showVerifiedBadge && (
              <VerifiedBadge compact label={verifiedLabel} />
            )}
          </BrandBlock>
          <p
            className="text-sm leading-6 text-gray-600 dark:text-slate-400"
            dir="auto"
          >
            {description}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-4">
            <h2
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#111827] dark:text-white"
              dir="auto"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--public-footer-accent)]"
              />
              {column.title}
            </h2>
            <nav
              className="flex flex-col gap-2.5"
              aria-label={column.title}
            >
              {column.links.map((link, index) => (
                <FooterLink
                  key={`${column.title}-${link.href || link.label}-${index}`}
                  link={link}
                />
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="relative mx-auto mt-12 max-w-7xl px-5 sm:mt-14 sm:px-6">
        <div
          aria-hidden="true"
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, currentColor 12%, transparent), transparent 60%)",
          }}
        />
        <div className="mt-7 flex flex-col items-center justify-between gap-4 pt-0 text-sm text-gray-500 dark:text-slate-400 sm:flex-row">
          <p className="text-center sm:text-left" dir="auto">
            {copyrightText}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {bottomLinks.map((link, index) => (
              <FooterLink
                key={`bottom-${link.href || link.label}-${index}`}
                link={link}
              />
            ))}
            {showPoweredBy && (
              <a
                href={getAppBaseUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-black/8 bg-black/[0.02] px-3 py-1.5 text-xs opacity-80 transition-all hover:border-[var(--public-footer-accent)]/40 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--public-footer-accent)]/30 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <Image
                  src="/images/Logo.jpg"
                  alt="MultiTree"
                  width={16}
                  height={16}
                  className="rounded-sm"
                  unoptimized
                />
                <span>
                  {poweredByLabel} <strong>MultiTree</strong>
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
