"use client";

import { AdvertisingPriceTable, SPONSOR_CATEGORY_THEME } from "./AdvertisingPriceTable";
import type { AdvertisingPriceRow, SponsorCategory } from "../pricing-data";
import type { SponsorType } from "../journey-types";

interface AdvertisingPackageStepProps {
  sponsorType: SponsorType;
  selectedPrices: Record<SponsorType, number>;
  onPriceChange: (type: SponsorType, price: number) => void;
  packageTiers?: Record<SponsorCategory, AdvertisingPriceRow[]>;
}

export function AdvertisingPackageStep({
  sponsorType,
  selectedPrices,
  onPriceChange,
  packageTiers,
}: AdvertisingPackageStepProps) {
  const rows = packageTiers?.[sponsorType] ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <AdvertisingPriceTable
        compact
        rows={rows}
        theme={SPONSOR_CATEGORY_THEME[sponsorType]}
        selectedPrice={selectedPrices[sponsorType]}
        onSelectPrice={(price) => onPriceChange(sponsorType, price)}
      />
    </div>
  );
}
