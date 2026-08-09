"use client";

import { ArrowLeft, Eye, MousePointerClick, RotateCcw, Target } from "lucide-react";
import {
  StatCard,
  type StatCardColor,
} from "@/components/shared/StatCard";

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function FunnelChart({
  steps,
  dropoff,
}: {
  steps: Array<{ key: string; label: string; count: number }>;
  dropoff: Array<{ fromKey: string; toKey: string; rate: number }>;
}) {
  if (steps.every((step) => step.count === 0)) {
    return (
      <p className="py-8 text-center text-xs text-slate-400">
        هێشتا داتای گۆڕانکاری نییە
      </p>
    );
  }
  const stepColors: StatCardColor[] = ["blue", "purple", "green"];
  return (
    <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
      {steps.map((step, index) => {
        const drop = dropoff.find((item) => item.fromKey === step.key);
        const label =
          index === 0
            ? "بینینی پەڕە"
            : index === steps.length - 1
              ? "ئەنجامی گرنگ"
              : "کلیک یان چالاکی";
        const Icon =
          index === 0
            ? Eye
            : index === steps.length - 1
              ? Target
              : MousePointerClick;
        const continued = drop ? Math.max(0, 100 - drop.rate) : null;
        const color = stepColors[Math.min(index, stepColors.length - 1)];
        return (
          <div key={step.key} className="contents">
            <StatCard
              color={color}
              description={
                index === 0
                  ? "کۆی ئەو کەسانەی پەڕەکەیان بینیوە"
                  : index === steps.length - 1
                    ? "ئەو کەسانەی کردارە گرنگەکەیان تەواو کردووە"
                    : "ئەو کەسانەی لە پەڕەکەدا کردارێکیان کردووە"
              }
              icon={Icon}
              label={label}
              value={formatNumber(step.count)}
              variant="funnel"
            />
            {index < steps.length - 1 ? (
              <div className="flex items-center justify-center">
                <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/30 lg:w-28 lg:flex-col">
                  <ArrowLeft className="h-4 w-4 text-slate-300" />
                  <span className="text-[10px] leading-4 text-slate-400">
                    {continued === null
                      ? "هەنگاوی دواتر"
                      : `${continued.toFixed(0)}٪ بەردەوام بوون`}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function RetentionGrid({
  rows,
}: {
  rows: Array<{ cohortWeek: string; size: number; rates: number[] }>;
}) {
  if (!rows.length) {
    return (
      <p className="py-8 text-center text-xs text-slate-400">
        هێشتا داتای کۆمەڵی سەردانکەران نییە
      </p>
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((row) => (
        <article
          key={row.cohortWeek}
          className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-800/30"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "color-mix(in srgb, var(--theme-primary) 12%, transparent)",
                  color: "var(--theme-primary)",
                }}
              >
                <RotateCcw className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-700 dark:text-slate-200">
                  دەستپێکی {row.cohortWeek}
                </h3>
                <p className="mt-1 text-[10px] text-slate-400">
                  {formatNumber(row.size)} سەردانکەری نوێ
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {row.rates.map((rate, index) => (
              <div
                key={index}
                className="rounded-2xl border p-3 text-center"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--theme-primary) 18%, transparent)",
                  background: `color-mix(in srgb, var(--theme-primary) ${Math.max(5, Math.min(22, rate / 4))}%, transparent)`,
                }}
              >
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {rate > 0 ? `${rate.toFixed(0)}٪` : "—"}
                </p>
                <p className="mt-1 text-[9px] text-slate-400">
                  هەفتەی {index}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                  گەڕانەوە
                </p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

