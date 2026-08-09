"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  ChartNoAxesCombined,
  CircleCheckBig,
  Clock3,
  Compass,
  Download,
  FileDown,
  Globe2,
  Heart,
  HeartHandshake,
  Leaf,
  Rocket,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Timer,
  Trophy,
  Users,
  UsersRound,
  WandSparkles,
  Zap,
} from "lucide-react";
import type {
  MiniWebsiteAdvantage,
  MiniWebsiteDocument,
  MiniWebsiteImpactStat,
  MiniWebsiteProcessStep,
} from "@/features/mini-website/types";
import { latinDigits } from "@/features/mini-website/hours";
import { RailButton, SectionFrame } from "./LiquidGlassSectionFrame";
import { safeUrl, SWISS_ACCENT, toneWash } from "./liquid-glass-utils";

const ADVANTAGE_ICONS: Record<MiniWebsiteAdvantage["icon"], typeof BadgeCheck> =
  {
    check: BadgeCheck,
    shield: ShieldCheck,
    clock: Clock3,
    award: Award,
    heart: Heart,
    users: Users,
    sparkles: Sparkles,
    leaf: Leaf,
    zap: Zap,
    globe: Globe2,
  };

/**
 * The three item lists on a public page — advantages, services, and process
 * steps — are one palette grid, not three independent palettes. All are the
 * same length and each position holds three far-apart hues, so the first card
 * of one section never repeats the colour of the first card of another. Adding
 * or reordering a tone here means re-checking the matching position in
 * `PROCESS_TONES` and in `SERVICE_CARD_TONES`.
 */
export const ADVANTAGE_TONES = [
  "#0891b2",
  "#a16207",
  "#db2777",
  "#059669",
  "#b45309",
] as const;

export function AdvantagesSection({
  items,
  tone = SWISS_ACCENT,
  ...frame
}: {
  items: MiniWebsiteAdvantage[];
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = items.filter((item) => item.title.trim());
  if (!shown.length) return null;
  return (
    <SectionFrame tone={tone} {...frame}>
      <div className="grid gap-x-6 sm:grid-cols-2">
        {shown.map((item, index) => {
          const Icon = ADVANTAGE_ICONS[item.icon] ?? BadgeCheck;
          const iconTone = ADVANTAGE_TONES[index % ADVANTAGE_TONES.length];
          return (
            <article
              key={item.id}
              className="flex gap-3 border-b border-current/[0.08] py-4 first:pt-1 sm:[&:nth-child(2)]:pt-1"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
                data-mini-advantage-icon
                style={{
                  background: toneWash(iconTone, 16),
                  borderColor: toneWash(iconTone, 28),
                  boxShadow: `0 10px 24px -18px ${iconTone}`,
                  color: iconTone,
                }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <strong
                  className="block text-xs font-black sm:text-sm"
                  dir="auto"
                >
                  {item.title}
                </strong>
                {item.description && (
                  <span
                    className="mt-1 block text-[10px] leading-5 opacity-55 sm:text-[11px]"
                    dir="auto"
                  >
                    {item.description}
                  </span>
                )}
              </span>
            </article>
          );
        })}
      </div>
    </SectionFrame>
  );
}

/**
 * Position `n` here is a different hue from position `n` of the advantage,
 * process, and service palettes — see the note on `ADVANTAGE_TONES`.
 */
export const IMPACT_STAT_TONES = [
  "#166534",
  "#be123c",
  "#155e75",
  "#92400e",
  "#a21caf",
] as const;

function AnimatedStatValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.35 });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    const target = Number(value.replace(/,/g, "").trim());
    if (!Number.isFinite(target) || target < 0) return;
    const node = ref.current;
    if (!node) return;
    const decimals = value.includes(".") ? value.split(".")[1]?.length || 0 : 0;
    const format = (number: number) =>
      latinDigits(
        number.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
      );
    if (reduceMotion) {
      node.textContent = format(target);
      return;
    }

    const playback = animate(0, target, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    return () => playback.stop();
  }, [isInView, reduceMotion, value]);

  return <span ref={ref}>{value}</span>;
}

export function ImpactStatsSection({
  items,
  tone = SWISS_ACCENT,
  fullPage,
  ...frame
}: {
  items: MiniWebsiteImpactStat[];
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = items.filter((item) => item.value.trim() && item.label.trim());
  if (!shown.length) return null;
  return (
    <SectionFrame tone={tone} fullPage={fullPage} {...frame}>
      <ol
        className={`grid grid-cols-2 gap-x-5 sm:grid-cols-3 lg:grid-cols-4 ${
          fullPage ? "" : "lg:mx-auto lg:max-w-5xl"
        }`}
      >
        {shown.map((item, index) => {
          const Icon = ADVANTAGE_ICONS[item.icon] ?? ChartNoAxesCombined;
          const statTone = IMPACT_STAT_TONES[index % IMPACT_STAT_TONES.length];
          return (
            <li
              key={item.id}
              className="group flex min-w-0 flex-col border-b border-current/[0.08] py-5 first:pt-1 [&:nth-child(2)]:pt-1 sm:[&:nth-child(3)]:pt-1 lg:[&:nth-child(4)]:pt-1"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black transition duration-200 group-hover:scale-105"
                data-mini-impact-icon
                style={{
                  background: toneWash(statTone, 16),
                  borderColor: toneWash(statTone, 30),
                  boxShadow: `0 12px 26px -18px ${statTone}`,
                  color: statTone,
                }}
                dir="ltr"
              >
                {latinDigits(String(index + 1).padStart(2, "0"))}
              </span>
              <strong
                className={`mt-4 ${fullPage ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"} font-black leading-none tracking-tighter`}
                style={{
                  backgroundImage: `linear-gradient(135deg, ${statTone}, color-mix(in srgb, ${statTone} 72%, #ffffff))`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
                dir="ltr"
              >
                <AnimatedStatValue key={item.value} value={item.value} />
                {item.suffix}
              </strong>
              <span className="mt-2 flex items-center gap-1.5">
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  strokeWidth={2.4}
                  style={{ color: statTone }}
                />
                <span
                  className="text-[11px] font-bold opacity-60 sm:text-xs"
                  dir="auto"
                >
                  {item.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </SectionFrame>
  );
}

/**
 * The same business-selected icon keys, drawn with step-flavored glyphs so a
 * process step is not mistaken for the advantage entry that shares its key.
 */
const PROCESS_ICONS: Record<MiniWebsiteAdvantage["icon"], typeof BadgeCheck> = {
  check: CircleCheckBig,
  shield: ShieldCheck,
  clock: Timer,
  award: Trophy,
  heart: HeartHandshake,
  users: UsersRound,
  sparkles: WandSparkles,
  leaf: Sprout,
  zap: Rocket,
  globe: Compass,
};

/**
 * Position `n` here is deliberately a different hue from position `n` of
 * `ADVANTAGE_TONES` and `SERVICE_CARD_TONES` — see the note on those. Steps
 * also differ from their own neighbours by hue rather than by lightness, and
 * every tone clears the contrast floor for the step numeral and its icon.
 */
export const PROCESS_TONES = [
  "#7e22ce",
  "#0369a1",
  "#4d7c0f",
  "#1e40af",
  "#115e59",
] as const;

export function ProcessSection({
  steps,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  steps: MiniWebsiteProcessStep[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = steps.filter((step) => step.title.trim());
  if (!shown.length) return null;
  return (
    <SectionFrame tone={tone} {...frame}>
      <ol className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((step, index) => {
          const Icon = PROCESS_ICONS[step.icon] ?? Compass;
          const href = safeUrl(step.actionUrl);
          const stepTone = PROCESS_TONES[index % PROCESS_TONES.length];
          return (
            <li
              key={step.id}
              className="group relative flex gap-3 border-b border-current/[0.08] py-5 first:pt-1 sm:[&:nth-child(2)]:pt-1 lg:[&:nth-child(3)]:pt-1"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black transition duration-200 group-hover:scale-105"
                data-mini-process-step
                style={{
                  background: toneWash(stepTone, 16),
                  borderColor: toneWash(stepTone, 30),
                  boxShadow: `0 12px 26px -18px ${stepTone}`,
                  color: stepTone,
                }}
                dir="ltr"
              >
                {latinDigits(String(index + 1).padStart(2, "0"))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <Icon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={2.1}
                    style={{ color: stepTone }}
                  />
                  <strong className="text-xs font-black sm:text-sm" dir="auto">
                    {step.title}
                  </strong>
                </span>
                {step.description && (
                  <span
                    className="mt-1.5 block text-[10px] leading-5 opacity-60 sm:text-[11px]"
                    dir="auto"
                  >
                    {step.description}
                  </span>
                )}
                {href && (
                  <a
                    href={interactive ? href : undefined}
                    onClick={(event) => {
                      if (!interactive) event.preventDefault();
                    }}
                    target="_blank"
                    rel="noreferrer"
                    className="mini-glass-action mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black transition duration-200 hover:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                    style={{ color: stepTone }}
                    data-mini-action={`process:${step.id}`}
                  >
                    {step.actionLabel || "دەستپێکردن"}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </SectionFrame>
  );
}

/**
 * Position `n` is a distinct hue from the same slot of the palettes in this
 * file, and neighbours inside this list sit far apart so the rows of one
 * section never share a colour. No hex in this list is repeated by any other
 * section palette.
 */
const DOCUMENT_TONES = [
  "#10b981",
  "#eab308",
  "#8b5cf6",
  "#f97316",
  "#ec4899",
] as const;

/** Documents are compact rows, so a full board of four fits before the arrows. */
const DOCUMENTS_PER_PAGE = 4;

export function DocumentsSection({
  documents,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  documents: MiniWebsiteDocument[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = documents.filter(
    (document) => document.title.trim() && safeUrl(document.fileUrl),
  );
  // Declared before the early return so the hook order never depends on
  // whether a business has any documents.
  const [page, setPage] = useState(0);

  if (!shown.length) return null;

  const pageCount = Math.ceil(shown.length / DOCUMENTS_PER_PAGE);
  const current = Math.min(page, pageCount - 1);
  const start = current * DOCUMENTS_PER_PAGE;
  const visible = shown.slice(start, start + DOCUMENTS_PER_PAGE);

  return (
    <SectionFrame tone={tone} {...frame}>
      <div className="relative">
        <div className="space-y-2">
          {visible.map((document, documentIndex) => {
            const documentTone =
              DOCUMENT_TONES[
                (start + documentIndex) % DOCUMENT_TONES.length
              ];
            const meta = [document.fileType, document.fileSize]
              .filter(Boolean)
              .join(" · ");
            return (
              <a
                key={document.id}
                href={interactive ? document.fileUrl : undefined}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl border px-3.5 py-3.5 transition duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: toneWash(documentTone, 24),
                  background: toneWash(documentTone, 7),
                }}
                data-mini-action={`document:${document.id}`}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background: toneWash(documentTone, 14),
                    color: documentTone,
                  }}
                >
                  <FileDown className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <strong
                      className="block text-xs font-black sm:text-sm"
                      dir="auto"
                    >
                      {document.title}
                    </strong>
                    {meta && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase"
                        style={{
                          background: toneWash(documentTone, 14),
                          color: documentTone,
                        }}
                        dir="ltr"
                      >
                        {meta}
                      </span>
                    )}
                  </span>
                  {document.description && (
                    <span
                      className="mt-1 block text-[10px] leading-4 opacity-50"
                      dir="auto"
                    >
                      {document.description}
                    </span>
                  )}
                </span>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition duration-200 group-hover:scale-105"
                  style={{
                    background: toneWash(documentTone, 14),
                    color: documentTone,
                  }}
                >
                  <Download className="h-4 w-4" />
                </span>
              </a>
            );
          })}
        </div>

        {pageCount > 1 && (
          <>
            <RailButton
              side="left"
              label="بەڵگەنامەی پێشوو"
              onClick={() =>
                setPage((value) => (value - 1 + pageCount) % pageCount)
              }
            />
            <RailButton
              side="right"
              label="بەڵگەنامەی دواتر"
              onClick={() => setPage((value) => (value + 1) % pageCount)}
            />
          </>
        )}
      </div>
    </SectionFrame>
  );
}
