/**
 * The TikTok sponsorship service page.
 *
 * Shared because the dashboard editor, the public page, and the backend
 * projection all speak this one shape: the server reads relational rows and
 * assembles an `AdvertisingServiceConfig`, and both frontends consume it
 * unchanged. A second copy on either side would drift.
 */

/** One price point inside a package category. */
export interface AdvertisingPriceRow {
  id: string;
  price: number;
  /** Free text, not a number: businesses write "25K – 35K" as often as "30000". */
  views: string;
}

export interface AdvertisingPaymentProvider {
  /** Stable key for edits/deletes — name is user-editable so it can't double as identity. */
  id: string;
  /**
   * Free-form. Catalog names ("FIB" and the rest) resolve a bundled logo on the
   * client; anything else renders with `logoUrl` or no logo at all.
   */
  name: string;
  /** Contact number customers send payment to; free-form so businesses can format it however their bank or wallet expects. */
  phone: string;
  /** Uploaded logo for a custom provider; catalog names resolve theirs from PROVIDER_LOGOS instead. */
  logoUrl?: string;
}

export interface AdvertisingPackageCategory {
  id: string;
  label: string;
  /** A preset colour name, or an explicit `#rrggbb`; unrecognized values fall back to the default. */
  color?: string;
}

export interface AdvertisingFaq {
  id: string;
  question: string;
  answer: string;
}

export type AdvertisingResultColor =
  | "rose"
  | "indigo"
  | "amber"
  | "emerald"
  | "sky"
  | "violet"
  | "orange"
  | "cyan";

export interface AdvertisingResultItem {
  id: string;
  category: string;
  before: string;
  after: string;
  price: number;
  color: AdvertisingResultColor;
  /** Optional uploaded photos for the comparison slider; each side shows a neutral placeholder when unset. */
  beforeImageUrl?: string;
  afterImageUrl?: string;
}

export type AdvertisingTestimonialColor =
  | "orange"
  | "rose"
  | "emerald"
  | "violet"
  | "sky"
  | "amber"
  | "cyan"
  | "fuchsia";

export interface AdvertisingTestimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  color: AdvertisingTestimonialColor;
  /** Optional avatar photo; falls back to a generic person icon when unset. */
  avatarUrl?: string;
}

export interface AdvertisingClosingCtaContent {
  title: string;
  description: string;
  buttonLabel: string;
}

export interface AdvertisingSectionVisibility {
  hero: boolean;
  journey: boolean;
  results: boolean;
  packages: boolean;
  testimonials: boolean;
  faq: boolean;
  closingCta: boolean;
}

/** Every status an advertising page can hold; only `published` is live. */
export type AdvertisingPageStatus =
  | "draft"
  | "published"
  | "paused"
  | "archived";

export interface AdvertisingServiceConfig {
  /**
   * Whether the page is live. There is no separate `enabled` flag: two fields
   * that can disagree about the same question have no correct answer when they
   * do.
   */
  status: AdvertisingPageStatus;
  sections: AdvertisingSectionVisibility;
  title: string;
  description: string;
  /** Digits only. The server builds the wa.me destination, so the button cannot publish another scheme. */
  whatsappNumber: string;
  packageCategories: AdvertisingPackageCategory[];
  packageTiers: Record<string, AdvertisingPriceRow[]>;
  results: AdvertisingResultItem[];
  testimonials: AdvertisingTestimonial[];
  faqs: AdvertisingFaq[];
  closingCta: AdvertisingClosingCtaContent;
  /** Shared TikTok code-extraction video; empty string means no video is configured. */
  videoUrl: string;
  /** Heading above the code-extraction tutorial (journey step 5 and the /advertising/video-code page). */
  videoTutorialTitle: string;
  tutorialSteps: string[];
  paymentProviders: AdvertisingPaymentProvider[];
  /** Optional mockup image for the guide's receipt step. */
  receiptExampleImageUrl?: string;
}

/** What the editor additionally needs and the public page must never receive. */
export interface AdvertisingDraftConfig extends AdvertisingServiceConfig {
  /** True when the draft holds edits that the published version does not. */
  hasUnpublishedChanges: boolean;
  publishedVersion: number | null;
}
