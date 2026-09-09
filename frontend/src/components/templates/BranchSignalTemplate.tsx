"use client";

import { memo, useCallback, useMemo, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  getPlatformIcon,
  getPlatformName,
} from "@/components/public/LinktreeButtons";
import {
  platformBackground,
  platformBorder,
} from "@/lib/brand/platform-brands";
import { SPONSOR_KRD_ACCENT_COLOR } from "@/lib/sponsor-krd-theme";
import {
  deriveTextColor,
  deriveTextSecondaryColor,
} from "@/lib/utils/theme-colors";
import {
  isWebsiteColor,
  parseWebsiteColor,
} from "@/lib/utils/parse-website-color";
import type { TemplateComponentProps, TemplateTheme } from "./types";
import {
  TemplateActionButton,
  TemplateActionButtonList,
  TemplateFooter,
  TemplateHeader,
  TemplateLinkLabel,
  TemplateViewportLayout,
  STANDARD_TEMPLATE_HEADER_AVATAR_SIZES,
  STANDARD_TEMPLATE_HEADER_CLASSES,
  templateBackgroundStyle,
} from "./shared";

const SIGNAL_TEXT = "#f7faf8";
const SIGNAL_TEXT_MUTED = "rgba(226, 232, 228, 0.68)";

function SignalBackdrop({
  accent,
  isPreview,
}: {
  accent: string;
  isPreview: boolean;
}) {
  const dotPattern = `radial-gradient(circle, color-mix(in srgb, ${accent} 32%, transparent) 1px, transparent 1.5px)`;

  return (
    <div
      className={`pointer-events-none inset-0 z-0 overflow-hidden ${isPreview ? "absolute" : "fixed"}`}
      data-signal-backdrop
      aria-hidden="true"
    >
      <div
        className="absolute -left-24 top-16 size-72 rounded-full border sm:-left-32 sm:size-96 md:-left-40 md:top-24 md:size-[28rem] lg:-left-24 lg:size-[32rem]"
        style={{
          borderColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
        }}
      />
      <div
        className="absolute -left-12 top-25 size-52 rounded-full border sm:-left-16 sm:size-72 md:-left-20 md:top-36 md:size-80 lg:-left-4 lg:size-96"
        style={{ borderColor: `color-mix(in srgb, ${accent} 9%, transparent)` }}
      />
      <div
        className="absolute -right-32 top-[30%] size-80 rounded-full border sm:-right-40 sm:size-[28rem] md:-right-48 md:size-[34rem] lg:-right-28 lg:size-[38rem]"
        style={{
          borderColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
        }}
      />
      <div
        className="absolute inset-y-0 left-0 w-16 opacity-40 sm:w-28 md:w-40 lg:w-56"
        style={{
          backgroundImage: dotPattern,
          backgroundSize: "13px 13px",
          maskImage: "linear-gradient(to right, black, transparent)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-16 opacity-30 sm:w-28 md:w-40 lg:w-56"
        style={{
          backgroundImage: dotPattern,
          backgroundSize: "15px 15px",
          maskImage: "linear-gradient(to left, black, transparent)",
        }}
      />
    </div>
  );
}

function SignalAvatarGlow({ accent }: { accent: string }) {
  const ring = `color-mix(in srgb, ${accent} 34%, transparent)`;
  const node = `0 0 0 4px color-mix(in srgb, ${accent} 14%, transparent), 0 0 18px ${accent}`;

  return (
    <div
      className="pointer-events-none absolute inset-1/2 z-0 size-0"
      data-avatar-signal-glow
      aria-hidden="true"
    >
      <span
        className="absolute -left-16 -top-16 size-32 rounded-full border"
        style={{ borderColor: ring }}
      />
      <span
        className="absolute -left-[4.375rem] -top-[4.375rem] size-[8.75rem] rounded-full border"
        style={{
          borderColor: `color-mix(in srgb, ${accent} 17%, transparent)`,
        }}
      />
      <span
        className="absolute -left-14 -top-14 size-2 rounded-full"
        style={{ background: accent, boxShadow: node }}
      />
      <span
        className="absolute left-[3.75rem] top-0 size-1.5 rounded-full"
        style={{ background: accent, boxShadow: node }}
      />
      <span
        className="absolute -left-16 top-6 size-1 rounded-full"
        style={{ background: accent, boxShadow: node }}
      />
    </div>
  );
}

function BranchConnector({
  accent,
  side,
}: {
  accent: string;
  side: "left" | "right";
}) {
  const endX = side === "left" ? 24 : 76;
  const startX = side === "left" ? 76 : 24;
  const trace = `M ${startX} -4 C ${startX} 15, ${endX} 23, ${endX} 44`;

  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-12 w-full overflow-visible"
      viewBox="0 -4 100 48"
      preserveAspectRatio="none"
      data-signal-connector={side}
      aria-hidden="true"
    >
      <path
        d={trace}
        fill="none"
        stroke={`color-mix(in srgb, ${accent} 22%, transparent)`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d={trace}
        fill="none"
        stroke={accent}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function branchSurface(accent: string, theme: TemplateTheme): CSSProperties {
  const textColor = deriveTextColor(theme.from, theme.via, theme.to);
  const background = templateBackgroundStyle(
    theme,
    `linear-gradient(160deg, ${theme.from}, ${theme.via} 48%, ${theme.to})`,
  );

  return {
    ...background,
    "--branch-signal-accent": accent,
    "--business-website-color": accent,
    colorScheme: textColor === "#ffffff" ? "dark" : "light",
  } as CSSProperties;
}

export const BranchSignalTemplate = memo(function BranchSignalTemplate({
  linktree,
  links,
  theme,
  onLinkClick,
}: TemplateComponentProps) {
  const accent = useMemo(() => {
    const value = linktree.business_website_color;
    return isWebsiteColor(value)
      ? parseWebsiteColor(value).primary
      : SPONSOR_KRD_ACCENT_COLOR;
  }, [linktree.business_website_color]);
  const isPreview = useMemo(
    () => linktree.id.includes("preview"),
    [linktree.id],
  );
  const textColor = useMemo(
    () => deriveTextColor(theme.from, theme.via, theme.to),
    [theme.from, theme.via, theme.to],
  );
  const textSecondaryColor = useMemo(
    () => deriveTextSecondaryColor(theme.from, theme.via, theme.to),
    [theme.from, theme.via, theme.to],
  );
  const usesLightCardSurface = textColor !== "#ffffff";
  const cardTextColor = usesLightCardSurface ? "#1f2937" : SIGNAL_TEXT;
  const cardSecondaryColor = usesLightCardSurface
    ? "rgba(31, 41, 55, 0.58)"
    : "rgba(255, 255, 255, 0.48)";
  const cardBackground = usesLightCardSurface
    ? "linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 249, 0.9))"
    : "linear-gradient(145deg, rgba(24, 31, 27, 0.94), rgba(10, 14, 12, 0.9))";
  const cardShadow = usesLightCardSurface
    ? `0 16px 34px rgba(15, 23, 42, 0.12), inset 0 1px rgba(255,255,255,.8), 0 0 18px color-mix(in srgb, ${accent} 5%, transparent)`
    : `0 16px 34px rgba(0,0,0,.32), inset 0 1px rgba(255,255,255,.035), 0 0 18px color-mix(in srgb, ${accent} 5%, transparent)`;
  const activeLinks = useMemo(
    () => links.filter((link) => link.is_active !== false),
    [links],
  );
  const handleClick = useCallback(
    (
      linkId: string,
      url: string,
      platform: string,
      defaultMessage?: string | null,
    ) => onLinkClick(linkId, url, platform, defaultMessage),
    [onLinkClick],
  );

  return (
    <TemplateViewportLayout
      isPreview={isPreview}
      dir="ltr"
      backgroundPattern={theme.backgroundPattern}
      backgroundPatternAccent={accent}
      backgroundPatternOpacityScale={1.4}
      className={`isolate px-4 sm:px-5 ${isPreview ? "pt-14" : "pt-10"}`}
      style={branchSurface(accent, theme)}
      header={
        <div className="relative">
          <SignalBackdrop accent={accent} isPreview={isPreview} />
          <TemplateHeader
            name={linktree.name}
            subtitle={linktree.subtitle}
            description={linktree.description}
            image={linktree.image}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            subtitleColor={linktree.subtitle_color || accent}
            className="relative z-10 w-full px-3 sm:px-4"
            contentWrapperClassName={STANDARD_TEMPLATE_HEADER_CLASSES.content}
            avatarOuterClassName="relative isolate shrink-0"
            avatarGlow={<SignalAvatarGlow accent={accent} />}
            avatarWrapperClassName={`relative z-10 ${STANDARD_TEMPLATE_HEADER_CLASSES.avatar} overflow-hidden rounded-full border-2 bg-[#111714] p-1`}
            avatarWrapperStyle={{
              borderColor: `color-mix(in srgb, ${accent} 72%, white 8%)`,
              boxShadow: `0 0 0 7px color-mix(in srgb, ${accent} 8%, transparent), 0 0 48px color-mix(in srgb, ${accent} 32%, transparent)`,
            }}
            avatarClassName="rounded-full"
            avatarSizes={STANDARD_TEMPLATE_HEADER_AVATAR_SIZES}
            textWrapperClassName={`relative z-20 ${STANDARD_TEMPLATE_HEADER_CLASSES.text}`}
            nameClassName={STANDARD_TEMPLATE_HEADER_CLASSES.name}
            subtitleClassName={STANDARD_TEMPLATE_HEADER_CLASSES.subtitle}
            descriptionClassName={STANDARD_TEMPLATE_HEADER_CLASSES.description}
          />
        </div>
      }
      main={
        <TemplateActionButtonList
          isEmpty={activeLinks.length === 0}
          className="relative flex w-full flex-col"
          emptyStateClassName="rounded-3xl border px-5 py-8 text-center"
          emptyStateStyle={{
            color: usesLightCardSurface
              ? "rgba(31, 41, 55, 0.68)"
              : SIGNAL_TEXT_MUTED,
            borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`,
            background: usesLightCardSurface
              ? "rgba(255, 255, 255, 0.82)"
              : "rgba(13, 18, 15, 0.78)",
          }}
          emptyStateTextClassName="text-sm"
        >
          {activeLinks.map((link, index) => {
            const side = index % 2 === 0 ? "left" : "right";
            const customColor = link.metadata?.custom_color as
              string | undefined;
            const iconSurface = platformBackground(link.platform, customColor);
            const edge = platformBorder(link.platform, customColor);
            const title = link.display_name || getPlatformName(link.platform);

            return (
              <div
                key={link.id}
                className={`relative ${index === 0 ? "" : "pt-10"}`}
                data-branch-side={side}
              >
                {index > 0 ? (
                  <BranchConnector accent={accent} side={side} />
                ) : null}
                <TemplateActionButton
                  id={`link-${link.platform.toLowerCase()}`}
                  data-platform={link.platform.toLowerCase()}
                  data-action-key={`link:${link.id}`}
                  onClick={() =>
                    handleClick(
                      link.id,
                      link.url,
                      link.platform,
                      link.default_message,
                    )
                  }
                  aria-label={title}
                  className={`group relative z-10 flex min-h-[5.25rem] w-[calc(100%-1.25rem)] items-center gap-3.5 overflow-hidden rounded-[1.4rem] border px-3.5 py-3 text-left backdrop-blur-md ${
                    side === "left" ? "mr-5" : "ml-5"
                  }`}
                  initial={isPreview ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileTap={{ opacity: 0.92 }}
                  transition={{ duration: 0.42, delay: index * 0.065 }}
                  style={{
                    color: cardTextColor,
                    borderColor: usesLightCardSurface
                      ? `color-mix(in srgb, ${accent} 24%, rgba(15,23,42,.12))`
                      : `color-mix(in srgb, ${accent} 22%, rgba(255,255,255,.07))`,
                    background: cardBackground,
                    boxShadow: cardShadow,
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-y-4 w-px opacity-70"
                    style={{
                      [side === "left" ? "right" : "left"]: 0,
                      background: `linear-gradient(transparent, ${accent}, transparent)`,
                      boxShadow: `0 0 12px ${accent}`,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-[inset_0_1px_rgba(255,255,255,.12)]"
                    style={{
                      color: "#ffffff",
                      background:
                        iconSurface === "transparent"
                          ? "rgba(255,255,255,.08)"
                          : iconSurface,
                      borderColor: edge || "rgba(255,255,255,.1)",
                    }}
                  >
                    {getPlatformIcon(
                      link.platform,
                      "size-5 text-white",
                      (link.metadata as Record<string, string>)?.custom_icon,
                      customColor,
                    )}
                  </span>

                  <TemplateLinkLabel
                    link={link}
                    titleClassName="block truncate text-[0.95rem] font-bold leading-tight"
                    platformStyle={{ color: cardSecondaryColor }}
                  />

                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{
                      color: accent,
                      borderColor: `color-mix(in srgb, ${accent} 62%, transparent)`,
                      background: `color-mix(in srgb, ${accent} 7%, transparent)`,
                      boxShadow: `0 0 14px color-mix(in srgb, ${accent} 10%, transparent)`,
                    }}
                  >
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </span>

                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `linear-gradient(110deg, transparent 30%, color-mix(in srgb, ${accent} 7%, transparent), transparent 70%)`,
                    }}
                    aria-hidden="true"
                  />
                </TemplateActionButton>
              </div>
            );
          })}
        </TemplateActionButtonList>
      }
      footer={
        <TemplateFooter
          footerText={linktree.footer_text}
          footerPhone={linktree.footer_phone}
          footerHidden={linktree.footer_hidden ?? false}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          className="w-full px-4 pb-7 pt-10"
          innerClassName="mx-auto w-full max-w-sm text-center"
          sponsorTextClassName="text-[10px] font-semibold uppercase tracking-[0.16em]"
          nameButtonClassName="mt-2 inline-flex min-h-9 items-center justify-center rounded-full border px-5 py-2 text-xs font-bold transition hover:-translate-y-0.5"
        />
      }
    />
  );
});
