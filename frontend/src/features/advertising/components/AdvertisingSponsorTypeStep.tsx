"use client";

import { BriefcaseBusiness, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPONSOR_CATEGORY_THEME } from "./AdvertisingPriceTable";
import { AdvertisingSelectionCheck } from "./AdvertisingSelectionCheck";
import type { SponsorType } from "../journey-types";

const SPONSOR_TYPES = [
  {
    id: "personal" as const,
    englishLabel: "Personal",
    title: "سپۆنسەری شەخسی",
    description: "بۆ ڤیدیۆ و هەژماری کەسی",
    icon: UserRound,
  },
  {
    id: "business" as const,
    englishLabel: "Business",
    title: "سپۆنسەری بازرگانی",
    description: "بۆ کۆمپانیا، دوکان و ئیش و کار",
    icon: BriefcaseBusiness,
  },
] as const;

interface AdvertisingSponsorTypeStepProps {
  selected: SponsorType;
  onChange: (type: SponsorType) => void;
}

export function AdvertisingSponsorTypeStep({ selected, onChange }: AdvertisingSponsorTypeStepProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:gap-4">
      {SPONSOR_TYPES.map((item) => {
        const isSelected = selected === item.id;
        const Icon = item.icon;
        const theme = SPONSOR_CATEGORY_THEME[item.id];

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(item.id)}
            className={cn(
              "group min-w-0 rounded-3xl border p-4 text-start outline-none transition-all focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#151719] sm:p-6",
              isSelected
                ? cn(theme.ring, theme.soft, "shadow-sm")
                : "border-black/8 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]",
              item.id === "personal" ? "focus-visible:ring-lime-500" : "focus-visible:ring-violet-500",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", theme.soft, theme.text)}>
                <Icon className="h-5 w-5" />
              </span>
              <AdvertisingSelectionCheck selected={isSelected} selectedClassName={theme.solid} />
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-black/35 dark:text-white/35 sm:mt-6">
              {item.englishLabel}
            </p>
            <h4 className="mt-2 break-words text-lg font-black leading-7" dir="auto">
              {item.title}
            </h4>
            <p className="mt-2 break-words text-sm leading-7 text-black/48 dark:text-white/48" dir="auto">
              {item.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
