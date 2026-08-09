/**
 * The advertising shapes now live in `@linktree/types`, because the backend
 * projection assembles exactly this config and both public pages consume it.
 *
 * Re-exported here so the feature's own files keep importing from `../types`,
 * and so there is still one definition rather than a frontend copy drifting
 * away from what the API sends.
 */
export type {
  AdvertisingClosingCtaContent,
  AdvertisingDraftConfig,
  AdvertisingFaq,
  AdvertisingPackageCategory,
  AdvertisingPageStatus,
  AdvertisingPaymentProvider,
  AdvertisingPriceRow,
  AdvertisingResultColor,
  AdvertisingResultItem,
  AdvertisingSectionVisibility,
  AdvertisingServiceConfig,
  AdvertisingTestimonial,
  AdvertisingTestimonialColor,
} from "@linktree/types";

/** Branding is a frontend-only concern: it comes from the business record, not the advertising config. */
export interface AdvertisingBusinessBranding {
  name: string;
  logo?: string | null;
  accentColor?: string | null;
  /** Business contact number, used to prefill the closing CTA's WhatsApp field. */
  phone?: string | null;
}
