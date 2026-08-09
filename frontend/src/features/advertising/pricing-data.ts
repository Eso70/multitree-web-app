import type { AdvertisingPriceRow } from "@linktree/types";

// Defined in the shared types package, since the backend builds these rows.
export type { AdvertisingPriceRow };

export type SponsorCategory = "personal" | "business";

const PERSONAL_PRICING: readonly AdvertisingPriceRow[] = [
  { id: "personal-1", price: 15_000, views: "25K – 35K" },
  { id: "personal-2", price: 20_000, views: "35K – 50K" },
  { id: "personal-3", price: 25_000, views: "50K – 70K" },
  { id: "personal-4", price: 30_000, views: "65K – 90K" },
  { id: "personal-5", price: 35_000, views: "80K – 110K" },
  { id: "personal-6", price: 40_000, views: "100K – 130K" },
  { id: "personal-7", price: 45_000, views: "120K – 155K" },
  { id: "personal-8", price: 50_000, views: "140K – 175K" },
  { id: "personal-9", price: 60_000, views: "160K – 195K" },
  { id: "personal-10", price: 70_000, views: "180K – 215K" },
  { id: "personal-11", price: 80_000, views: "200K – 235K" },
  { id: "personal-12", price: 90_000, views: "220K – 255K" },
  { id: "personal-13", price: 100_000, views: "250K – 300K" },
];

const BUSINESS_PRICING: readonly AdvertisingPriceRow[] = [
  { id: "business-1", price: 25_000, views: "40K – 50K" },
  { id: "business-2", price: 30_000, views: "50K – 65K" },
  { id: "business-3", price: 36_000, views: "60K – 80K" },
  { id: "business-4", price: 40_000, views: "65K – 80K" },
  { id: "business-5", price: 45_000, views: "110K – 140K" },
  { id: "business-6", price: 50_000, views: "125K – 155K" },
  { id: "business-7", price: 60_000, views: "140K – 175K" },
  { id: "business-8", price: 70_000, views: "160K – 195K" },
  { id: "business-9", price: 80_000, views: "180K – 215K" },
  { id: "business-10", price: 90_000, views: "200K – 235K" },
  { id: "business-11", price: 100_000, views: "230K – 270K" },
];

/** Single source of truth for sponsorship pricing — read by the packages section and the sponsorship guide's package step. */
export const ADVERTISING_PRICING: Record<SponsorCategory, readonly AdvertisingPriceRow[]> = {
  personal: PERSONAL_PRICING,
  business: BUSINESS_PRICING,
};
