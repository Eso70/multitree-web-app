import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion } from "motion/react";
import {
  GLASS_CONTROL_CLASS,
  GLASS_CONTROL_SHADOW,
  SWISS_ACCENT,
} from "./liquid-glass-utils";

/**
 * Floating paging arrow shared by every section that steps through more items
 * than it shows at once — offers, events, audio, documents.
 */
export function RailButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full ${GLASS_CONTROL_CLASS} ${side === "left" ? "left-1.5" : "right-1.5"}`}
      style={{ boxShadow: GLASS_CONTROL_SHADOW }}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.975 }}
    >
      <Icon className="h-5 w-5" strokeWidth={2.5} />
    </motion.button>
  );
}

/**
 * Structural section heading. Public surface, spacing and layout are owned by
 * the section's explicit Stitch-style placement in the portfolio grid.
 */
export function SectionFrame({
  title,
  icon: Icon,
  children,
  fullPage,
  tone = SWISS_ACCENT,
  index = 0,
  trailing,
}: {
  title: string;
  icon: typeof Star;
  children: ReactNode;
  fullPage: boolean;
  accent?: string;
  tone?: string;
  index?: number;
  /** Sits on the heading line, opposite the title. */
  trailing?: ReactNode;
}) {
  return (
    <motion.section
      className={`mini-section relative h-full ${
        fullPage
          ? ""
          : "m-3 overflow-hidden rounded-2xl border border-slate-900/10 bg-white/70 p-3.5 dark:border-white/10 dark:bg-white/[0.05]"
      }`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.68, delay: Math.min(index, 6) * 0.09 }}
    >
      <div className="relative z-[1]">
        <div
          className={`${fullPage ? "mb-7 items-center sm:mb-8" : "mb-3.5 items-center"} flex gap-3.5`}
        >
          <span className="flex min-w-0 items-center gap-4">
            <span
              className={`mini-section-icon ${fullPage ? "h-12 w-12 rounded-full" : "h-9 w-9 rounded-xl"} flex shrink-0 items-center justify-center transition-colors duration-500`}
              // A section that owns a palette heads itself in that palette's
              // first tone; the rest still fall back to the business's colour.
              style={{
                backgroundColor: `color-mix(in srgb, ${tone} 10%, transparent)`,
                color: tone,
              }}
            >
              <Icon
                className={fullPage ? "h-5 w-5" : "h-[18px] w-[18px]"}
                strokeWidth={2}
              />
            </span>
            <h2
              className={`mini-section-title ${fullPage ? "text-xl sm:text-2xl lg:text-[2rem]" : "text-[13px]"} font-extrabold leading-tight tracking-[-0.015em]`}
              dir="auto"
            >
              {title}
            </h2>
          </span>
          {trailing ? (
            <span className="ms-auto shrink-0">{trailing}</span>
          ) : (
            fullPage && (
              <span
                className="ml-auto flex min-w-8 flex-1 items-center justify-end gap-2 opacity-20"
                aria-hidden="true"
              >
                <span className="h-px w-full max-w-28 bg-current" />
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              </span>
            )
          )}
        </div>
        {children}
      </div>
    </motion.section>
  );
}
