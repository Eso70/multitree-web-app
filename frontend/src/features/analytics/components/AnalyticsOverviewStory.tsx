"use client";

import {
  Compass,
  Lock,
  MapPin,
  Smartphone,
  Sparkles,
  Target,
} from "lucide-react";
import { getCountryInfo } from "../countryInfo";
import { StatCard } from "@/components/shared/StatCard";

interface BreakdownItem {
  key: string;
  total: number;
}

interface OverviewTotals {
  total_views: number;
  unique_views: number;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  new_visitors: number;
  returning_visitors: number;
  returning_rate: number;
  bounce_rate: number;
  avg_engagement_seconds: number;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function percent(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

const deviceLabels: Record<string, string> = {
  mobile: "مۆبایل",
  desktop: "کۆمپیوتەر",
  tablet: "تابلێت",
  bot: "بۆتی ئۆتۆماتیکی",
  Unknown: "نەزانراو",
};

const sourceLabels: Record<string, string> = {
  Direct: "هاتنی ڕاستەوخۆ",
  Unattributed: "سەرچاوەی نەزانراو",
  Unknown: "سەرچاوەی نەزانراو",
};

function RankedCards({
  items,
  kind,
}: {
  items: BreakdownItem[];
  kind: "source" | "device" | "country";
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 dark:border-white/10">
        هێشتا زانیارییەکی بەس نییە
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {items.slice(0, 4).map((item, index) => {
        const country = kind === "country" ? getCountryInfo(item.key) : null;
        const label =
          kind === "country"
            ? `${country?.flag || "🏳️"} ${country?.name || "نەزانراو"}`
            : kind === "device"
              ? deviceLabels[item.key] || item.key
              : sourceLabels[item.key] || item.key;
return (
      <div
        key={`${kind}-${item.key}`}
        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-slate-800/30"
      >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black"
              style={{
                background:
                  "color-mix(in srgb, var(--theme-primary) 13%, transparent)",
                color: "var(--theme-primary)",
              }}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                {label}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-400">
                {formatNumber(item.total)} سەردان
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsOverviewStory({
  totals,
  referrers,
  devices,
  countries,
  detailsLocked,
}: {
  totals: OverviewTotals;
  referrers: BreakdownItem[];
  devices: BreakdownItem[];
  countries: BreakdownItem[];
  detailsLocked: boolean;
}) {
  const clickRate = percent(totals.total_clicks, totals.total_views);
  const conversionRate = percent(totals.conversions, totals.total_views);
  const performanceLabel =
    clickRate >= 30
      ? "کارایی زۆر باشە"
      : clickRate >= 15
        ? "کارایی باشە"
        : clickRate > 0
          ? "دەکرێت باشتر بێت"
          : "چاوەڕێی یەکەم کلیک";

  return (
    <div className="space-y-5 border-t border-slate-100 pt-6 dark:border-white/5">
      <section
        className="relative overflow-hidden rounded-3xl border p-5 sm:p-7 dark:bg-slate-900/30"
        style={{
          borderColor:
            "color-mix(in srgb, var(--theme-primary) 24%, transparent)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 14%, var(--theme-surface)), color-mix(in srgb, var(--theme-primary) 4%, var(--theme-surface)))",
        }}
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[var(--theme-primary)]/10 blur-3xl dark:bg-[var(--theme-primary)]/5" />
        <div className="relative grid items-center gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold"
              style={{
                background:
                  "color-mix(in srgb, var(--theme-primary) 15%, transparent)",
                color: "var(--theme-primary)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {performanceLabel}
            </span>
            <h3 className="mt-4 max-w-2xl text-xl font-black leading-9 text-slate-800 dark:text-slate-100 sm:text-2xl">
              ڕێژەی کلیککردنی سەردانکەران
            </h3>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500 dark:text-slate-400">
              ئەمە بە ڕوونی پیشانت دەدات پەڕەکەت تا چەند سەردانکەر هان دەدات
              کردارێک ئەنجام بدات.
            </p>
          </div>
          <StatCard
            color="purple"
            label="ڕێژەی کلیک"
            value={`${clickRate.toFixed(1)}٪`}
            variant="story"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-900/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
              ئەنجامە گرنگە تەواوکراوەکان
            </h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              ئەو کردارە گرنگانەی سەردانکەران تەواویان کردووە
            </p>
          </div>
          <div className="flex gap-3">
            <div className="min-w-24 rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-slate-800/30">
              <span className="block text-xl font-black text-slate-800 dark:text-slate-100">
                {formatNumber(totals.conversions)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                کۆی ئەنجام
              </span>
            </div>
            <div className="min-w-24 rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-slate-800/30">
              <span className="block text-xl font-black text-slate-800 dark:text-slate-100">
                {conversionRate.toFixed(1)}٪
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                ڕێژەی ئەنجام
              </span>
            </div>
          </div>
        </div>
      </section>

      {detailsLocked ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center dark:border-white/10 dark:bg-slate-800/30">
          <Lock className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            زانیاری وردتر لە پلانی ئێستادا داخراوە
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-400">
            بە نوێکردنەوەی پلان، سەرچاوەی سەردان، ئامێر و شوێنی
            سەردانکەران دەبینیت.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-800/30">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <Compass className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  لە کوێوە هاتوون؟
                </h3>
                <p className="text-[10px] text-slate-400">
                  سەرچاوە سەرەکییەکانی سەردان
                </p>
              </div>
            </div>
            <RankedCards items={referrers} kind="source" />
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-800/30">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                <Smartphone className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  چی بەکاردەهێنن؟
                </h3>
                <p className="text-[10px] text-slate-400">
                  ئامێری سەردانکەران
                </p>
              </div>
            </div>
            <RankedCards items={devices} kind="device" />
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-800/30">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <MapPin className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  لە کام وڵاتن؟
                </h3>
                <p className="text-[10px] text-slate-400">
                  شوێنی سەردانکەرانی پەڕەکانت
                </p>
              </div>
            </div>
            <RankedCards items={countries} kind="country" />
          </div>
        </section>
      )}
    </div>
  );
}
