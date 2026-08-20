"use client";

import { useState } from "react";
import { Building2, User, type LucideIcon } from "lucide-react";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";
import { AdvertisingPriceTable, SPONSOR_CATEGORY_THEME } from "./AdvertisingPriceTable";
import type { AdvertisingPriceRow, SponsorCategory } from "../pricing-data";

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
  const rows = packageTiers?.[category] ?? [];

  return (
    <PublicSection
      id="packages"
      decorations={
        <BusinessSectionDecorations
          colors={["#a3e635", "#a78bfa"]}
          labels={["پاکێجی گونجاو", "نرخی ڕوون"]}
          variant={2}
        />
      }
    >
        <PublicSectionHeading
          title="نرخی سپۆنسەر"
          description="ژمارەی بینینەکان مەزەندەییە و بە جۆری ناوەڕۆک دەگۆڕێت"
        />

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
    </PublicSection>
  );
}
