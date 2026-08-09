import { useEffect, useState } from "react";
import type { Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT } from "../liquid-glass-utils";
import {
  DAY_LABELS,
  formatDayRange,
  hasOpenDay,
  isOpenAllWeek,
  latinDigits,
  normalizeWeek,
  openState,
} from "@/features/mini-website/hours";
import type { MiniWebsiteWeekHours } from "@/features/mini-website/types";

export function HoursSection({
  hours,
  tone = SWISS_ACCENT,
  ...frame
}: {
  hours: MiniWebsiteWeekHours;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  const week = normalizeWeek(hours);
  if (!hasOpenDay(week)) return null;

  const allWeek = isOpenAllWeek(week);
  const state = now ? openState(week, now) : null;
  const statusLabel = allWeek
    ? "24/7 کراوەیە"
    : !state
      ? ""
      : state.open
        ? `ئێستا کراوەیە · تا ${latinDigits(state.closesAt ?? "")}`
        : state.opensAt
          ? `ئێستا داخراوە · ${state.opensDay ? `${DAY_LABELS[state.opensDay]} ` : ""}${latinDigits(state.opensAt)} دەکرێتەوە`
          : "ئێستا داخراوە";
  const open = allWeek || state?.open === true;

  return (
    <SectionFrame tone={tone} {...frame}>
      <div>
        {statusLabel && (
          <div className="flex items-center gap-2.5 px-1 py-3">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                open
                  ? "bg-emerald-500"
                  : "border border-slate-400 dark:border-slate-500"
              }`}
            />
            <span className="text-sm font-black" dir="auto">
              {statusLabel}
            </span>
          </div>
        )}

        {!allWeek && (
          <div className="overflow-hidden rounded-2xl border border-slate-900/10 dark:border-white/10">
            <div className="grid grid-cols-2 border-b border-slate-900/10 px-4 py-2.5 dark:border-white/10">
              <span className="text-[10px] font-black opacity-45" dir="auto">
                Day
              </span>
              <span className="text-left text-[10px] font-black opacity-45" dir="auto">
                Hours
              </span>
            </div>
            {week.map((entry) => (
              <div
                key={entry.day}
                className={`grid grid-cols-2 px-4 py-3 odd:bg-slate-900/[0.02] dark:odd:bg-white/[0.02] ${entry.closed ? "opacity-50" : ""}`}
              >
                <span className="text-xs font-black sm:text-sm" dir="auto">
                  {DAY_LABELS[entry.day]}
                </span>
                <span className="text-left text-xs opacity-70 sm:text-sm" dir="auto">
                  {latinDigits(formatDayRange(entry, "Closed"))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionFrame>
  );
}