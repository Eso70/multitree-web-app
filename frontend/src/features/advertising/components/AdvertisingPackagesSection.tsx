"use client";

import { useState } from "react";
import { Building2, User, type LucideIcon } from "lucide-react";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { AdvertisingPriceTable, SPONSOR_CATEGORY_THEME } from "./AdvertisingPriceTable";
import { ADVERTISING_PRICING, type AdvertisingPriceRow, type SponsorCategory } from "../pricing-data";

interface AdvertisingPackagesSectionProps {
  packageTiers?: Record<SponsorCategory, AdvertisingPriceRow[]>;
}

const CATEGORIES: Record<SponsorCategory, { icon: LucideIcon; badge: number; label: string }> = {
  personal: { icon: User, badge: 1, label: "بۆ ڕەسم یان ڤیدیۆی خۆت" },
  business: { icon: Building2, badge: 2, label: "تایبەت بە ئیش و کار و بازرگانی" },
};

const formatThousandDinar = (price: number) => `${price / 1000} هەزار دینار`;

export function AdvertisingPackagesSection({ packageTiers }: AdvertisingPackagesSectionProps) {
  const [category, setCategory] = useState<SponsorCategory>("personal");
  const theme = SPONSOR_CATEGORY_THEME[category];
  const rows = packageTiers?.[category]?.length
    ? packageTiers[category]
    : ADVERTISING_PRICING[category];

  return (
    <section
      id="packages"
      className="relative scroll-mt-24 overflow-hidden bg-transparent px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <BusinessSectionDecorations
        colors={["#a3e635", "#a78bfa"]}
        labels={["پاکێجی گونجاو", "نرخی ڕوون"]}
        variant={2}
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="break-words text-[clamp(2.35rem,5vw,4.9rem)] font-medium leading-[1.06] tracking-[-0.04em] text-balance [overflow-wrap:anywhere]">
            نرخی سپۆنسەر
          </h2>
          <p className="mx-auto mt-4 max-w-2xl break-words text-sm leading-7 text-black/52 [overflow-wrap:anywhere] dark:text-white/52">
            ژمارەی بینینەکان مەزەندەییە و بە جۆری ناوەڕۆک دەگۆڕێت
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <div
            role="tablist"
            aria-label="جۆری پاکێج"
            className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            {(Object.keys(CATEGORIES) as SponsorCategory[]).map((id) => {
              const item = CATEGORIES[id];
              const itemTheme = SPONSOR_CATEGORY_THEME[id];
              const isActive = category === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setCategory(id)}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${
                    isActive
                      ? `${itemTheme.ring} ${itemTheme.soft} ${itemTheme.text}`
                      : "border-transparent text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <AdvertisingPriceTable
            className="mt-4"
            rows={rows}
            theme={theme}
            formatPrice={formatThousandDinar}
          />
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-black/45 dark:text-white/40">
          ژمارەی بینەرەکان (قیو) نزیکەیی و خەملێنراون؛ ئەنجامی کۆتایی پەیوەندی بە ناوەڕۆکی ڤیدیۆ، ئامانجی سپۆنسەر و ڕەفتاری بینەران جیاواز دەبێت.
        </p>
      </div>
    </section>
  );
}
