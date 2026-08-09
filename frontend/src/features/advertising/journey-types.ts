export type SponsorType = "personal" | "business";
/** Free-form: businesses can rename/add/delete providers, so this is no longer a fixed set. Known names ("FIB" etc) get a logo via PROVIDER_LOGOS; custom ones render without one. */
export type PaymentProvider = string;
