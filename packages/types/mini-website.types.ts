/**
 * Every section key the renderer knows how to draw.
 *
 * Wider than what is currently offered: earlier work left renderers for a
 * number of sections that are not wired up yet, and keeping their keys in the
 * union lets that code stay compiling until it is finished.
 */
export type MiniWebsiteSectionKey =
  | "socials"
  | "location"
  | "hero"
  | "contacts"
  | "services"
  | "products"
  | "hours"
  | "gallery"
  | "socialPosts"
  | "reviews"
  | "articles"
  | "beforeAfter"
  | "faq"
  | "booking"
  | "team"
  | "credentials"
  | "shortVideos"
  | "youtubeVideos"
  | "stories"
  | "courses"
  | "education"
  | "experience"
  | "payments"
  | "offers"
  | "events"
  | "audio"
  | "whyChooseUs"
  | "impactStats"
  | "process"
  | "documents"
  | "ownedProperties"
  | "branches"
  | "partners"
  | "serviceAreas"
  | "leadForm"
  | "pricing"
  | "customBlocks";

export interface MiniWebsiteSection {
  key: MiniWebsiteSectionKey;
  enabled: boolean;
}

export const MINI_WEBSITE_BACKGROUND_STYLES = [
  "none",
  "grid",
  "grid45",
  "dots",
  "diagonal",
  "cross",
  "circles",
  "waves",
  "zigzag",
] as const;

export type MiniWebsiteBackgroundStyle =
  (typeof MINI_WEBSITE_BACKGROUND_STYLES)[number];

export const MINI_WEBSITE_PROFESSION_TEMPLATE_KEYS = [
  "custom",
  "student",
  "graduate",
  "teacher",
  "professor",
  "researcher",
  "schoolLeader",
  "universityLeader",
  "doctor",
  "dentist",
  "pharmacist",
  "nurse",
  "therapist",
  "clinic",
  "engineer",
  "architect",
  "softwareDeveloper",
  "itCybersecurity",
  "dataAi",
  "entrepreneur",
  "executive",
  "consultant",
  "accountant",
  "lawyer",
  "marketingSales",
  "realEstate",
  "freelancer",
  "craftsman",
  "technician",
  "mechanic",
  "contractor",
  "beautyProfessional",
  "fashionDesigner",
  "graphicDesigner",
  "photographer",
  "artist",
  "musician",
  "writerJournalist",
  "contentCreator",
  "restaurantCafe",
  "chefBaker",
  "hotelTourism",
  "agricultureProfessional",
  "logisticsTransport",
  "aviationProfessional",
  "athlete",
  "sportsCoach",
  "governmentLeader",
  "politicianDiplomat",
  "ngoCommunity",
  "religiousLeader",
  "securityProfessional",
  "company",
  "educationInstitution",
  "healthcareInstitution",
  "ecommerceStore",
] as const;

export type MiniWebsiteProfessionTemplateKey =
  (typeof MINI_WEBSITE_PROFESSION_TEMPLATE_KEYS)[number];

/**
 * How precisely a business wants to be found.
 *
 * `exact` drops a pin on the coordinates. `approximate` draws a radius around
 * them instead and never reveals the exact point — for businesses that work
 * from home or only want to advertise an area.
 */
export type MiniWebsiteLocationPrecision = "exact" | "approximate";

/**
 * A day of the week, ordered the way the week is read locally — Saturday first.
 */
export type MiniWebsiteDayKey =
  "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";

/**
 * One day's opening times.
 *
 * Opening times belong to the business, not to any one branch: the hours
 * section stands on its own and a page can publish it without ever naming a
 * place.
 *
 * `open` and `close` are wall-clock `HH:MM` strings in the business's own time,
 * never timestamps — a shop opens at nine regardless of who is reading the page.
 * A `close` earlier than `open` means the day runs past midnight (18:00 → 02:00),
 * which is normal for restaurants and is handled rather than rejected.
 */
export interface MiniWebsiteDayHours {
  day: MiniWebsiteDayKey;
  closed: boolean;
  open: string;
  close: string;
}

/** Always seven entries, in `MINI_WEBSITE_DAY_KEYS` order. */
export type MiniWebsiteWeekHours = MiniWebsiteDayHours[];

export const MINI_WEBSITE_DAY_KEYS: readonly MiniWebsiteDayKey[] = [
  "sat",
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
] as const;

/** Maps a day key onto `Date.prototype.getDay()`, where Sunday is 0. */
export const MINI_WEBSITE_DAY_INDEX: Record<MiniWebsiteDayKey, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** A plain week: open every day, with Friday off. */
export function createMiniWebsiteWeekHours(): MiniWebsiteWeekHours {
  return MINI_WEBSITE_DAY_KEYS.map((day) => ({
    day,
    closed: day === "fri",
    open: "09:00",
    close: "18:00",
  }));
}

/**
 * One place a business can be found. A single-location business has exactly
 * one; a multi-branch business has several, and the first is the primary.
 */
export interface MiniWebsiteLocation {
  /** Branch name, e.g. "Erbil — Downtown". Empty for a single location. */
  name: string;
  /** Contact number for this branch, stored without its country code. */
  phone: string;
  /** Dialling code for `phone`, matching how social links store theirs. */
  phoneCountryCode: string;
  /** Street address, shown as written. */
  address: string;
  /** Neighborhood or district, e.g. "Downtown". */
  area: string;
  city: string;
  /** Null until the business places the pin. */
  lat: number | null;
  lng: number | null;
  precision: MiniWebsiteLocationPrecision;
  /** Radius of the approximate circle, in metres. Ignored when precision is exact. */
  radiusMeters: number;
  /** Map zoom the business framed the pin at. */
  zoom: number;
  /** Optional external directions link. */
  mapUrl: string;
  /** Photo of the place, shown beside the address. Empty when not set. */
  image: string;
}

/**
 * One picture in the gallery.
 *
 * `id` is the client's own key, kept across a save so a caption being typed is
 * not attached to a different photo when the list is reordered.
 */
export interface MiniWebsiteGalleryImage {
  id: string;
  /** Path of an image already uploaded through the mini website's endpoint. */
  image: string;
  /** Optional line shown under the photo. */
  caption: string;
}

/** Upper bound on gallery photos, so one page cannot grow without limit. */
export const MINI_WEBSITE_MAX_GALLERY_IMAGES = 12;

export function createMiniWebsiteGalleryImage(
  image = "",
  id = `gallery-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteGalleryImage {
  return { id, image, caption: "" };
}

/**
 * The TikTok event a single offer reports when it is clicked.
 *
 * Per item rather than per page: a page usually mixes an enquiry, a booking and
 * a purchase, and reporting all three as the same event makes the funnel
 * unreadable.
 */
export type MiniWebsiteItemPixelEvent =
  "None" | "Contact" | "Lead" | "InitiateCheckout" | "CompletePayment";

export const MINI_WEBSITE_ITEM_PIXEL_EVENTS: readonly MiniWebsiteItemPixelEvent[] =
  ["None", "Contact", "Lead", "InitiateCheckout", "CompletePayment"] as const;

/**
 * How an offer's button reaches the business.
 *
 * A kind plus a value rather than a bare address: a phone number entered as a
 * number can be dialled, sent to WhatsApp, and shown with its country's flag,
 * and the server — not the client — decides what URL any of that becomes.
 */
export type MiniWebsiteActionType = "none" | "link" | "whatsapp" | "phone";

export const MINI_WEBSITE_ACTION_TYPES: readonly MiniWebsiteActionType[] = [
  "none",
  "link",
  "whatsapp",
  "phone",
] as const;

/** One service or product a business offers. */
export interface MiniWebsiteService {
  id: string;
  title: string;
  description: string;
  /** Free text, so "٢٥,٠٠٠ د.ع" and "بەپێی داواکاری" are both sayable. */
  price: string;
  /** Optional picture, uploaded through the mini website's own endpoint. */
  image: string;
  /** Label of the button; empty falls back to a default. */
  actionLabel: string;
  actionType: MiniWebsiteActionType;
  /** A web address, or a national number without its dialling code. */
  actionValue: string;
  /** Dialling code for `actionValue`, matching how social links store theirs. */
  actionCountryCode: string;
  /**
   * The destination the server built from the three fields above. Read-only for
   * clients: anything sent here is ignored.
   */
  url: string;
  pixelEvent: MiniWebsiteItemPixelEvent;
}

/** Upper bound on offers, so one page cannot grow without limit. */
export const MINI_WEBSITE_MAX_SERVICES = 24;

export function createMiniWebsiteService(
  id = `service-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteService {
  return {
    id,
    title: "",
    description: "",
    price: "",
    image: "",
    actionLabel: "",
    actionType: "whatsapp",
    actionValue: "",
    actionCountryCode: "964",
    url: "",
    pixelEvent: "Contact",
  };
}

/**
 * The external scheduler a booking card opens.
 *
 * Providers are descriptive rather than authenticated in the first release:
 * the business supplies its public scheduling URL. WhatsApp is the exception;
 * it is built from a phone number in the same way as service actions.
 */
export type MiniWebsiteBookingProvider =
  "calendly" | "calcom" | "google" | "custom" | "whatsapp";

export const MINI_WEBSITE_BOOKING_PROVIDERS: readonly MiniWebsiteBookingProvider[] =
  ["calendly", "calcom", "google", "custom", "whatsapp"] as const;

/** One appointment type offered by the business. */
export interface MiniWebsiteBooking {
  id: string;
  title: string;
  description: string;
  /** Displayed duration in minutes; the provider remains responsible for slots. */
  durationMinutes: number;
  /** Optional free-text price, matching service cards. */
  price: string;
  provider: MiniWebsiteBookingProvider;
  actionLabel: string;
  /**
   * A public scheduling URL, or a national WhatsApp number when the provider is
   * `whatsapp`.
   */
  actionValue: string;
  actionCountryCode: string;
  /** Server-built destination. Clients may read it but cannot choose it. */
  url: string;
}

export const MINI_WEBSITE_MAX_BOOKINGS = 12;
export const MINI_WEBSITE_BOOKING_DURATION_MIN = 5;
export const MINI_WEBSITE_BOOKING_DURATION_MAX = 1_440;

export function createMiniWebsiteBooking(
  id = `booking-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteBooking {
  return {
    id,
    title: "",
    description: "",
    durationMinutes: 30,
    price: "",
    provider: "calendly",
    actionLabel: "",
    actionValue: "",
    actionCountryCode: "964",
    url: "",
  };
}

/** One person presented in the Team / Specialists section. */
export interface MiniWebsiteTeamMember {
  id: string;
  name: string;
  role: string;
  experience: string;
  bio: string;
  image: string;
  actionLabel: string;
  actionType: MiniWebsiteActionType;
  actionValue: string;
  actionCountryCode: string;
  /** Server-built destination. Clients may read it but cannot choose it. */
  url: string;
}

export const MINI_WEBSITE_MAX_TEAM_MEMBERS = 12;

export function createMiniWebsiteTeamMember(
  id = `team-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteTeamMember {
  return {
    id,
    name: "",
    role: "",
    experience: "",
    bio: "",
    image: "",
    actionLabel: "",
    actionType: "none",
    actionValue: "",
    actionCountryCode: "964",
    url: "",
  };
}

export interface MiniWebsiteCertificate {
  id: string;
  title: string;
  issuer: string;
  year: string;
  description: string;
  image: string;
  verificationUrl: string;
}

export const MINI_WEBSITE_MAX_CERTIFICATES = 20;

export function createMiniWebsiteCertificate(
  id = `certificate-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteCertificate {
  return {
    id,
    title: "",
    issuer: "",
    year: "",
    description: "",
    image: "",
    verificationUrl: "",
  };
}

export type MiniWebsiteVideoPlatform =
  "youtube" | "tiktok" | "instagram" | "facebook" | "other";

export interface MiniWebsiteVideo {
  id: string;
  title: string;
  platform: MiniWebsiteVideoPlatform;
  url: string;
}

export const MINI_WEBSITE_MAX_VIDEOS = 20;

export function createMiniWebsiteVideo(
  id = `video-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteVideo {
  return { id, title: "", platform: "youtube", url: "" };
}

export interface MiniWebsiteYoutubeVideo {
  id: string;
  title: string;
  platform: "youtube";
  url: string;
}

export const MINI_WEBSITE_MAX_YOUTUBE_VIDEOS = 3;

export function createMiniWebsiteYoutubeVideo(
  id = `youtube-video-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteYoutubeVideo {
  return { id, title: "", platform: "youtube", url: "" };
}

export type MiniWebsiteStoryPlatform =
  "instagram" | "telegram" | "facebook" | "snapchat" | "tiktok" | "other";
export type MiniWebsiteStoryMediaType = "image" | "video";

export interface MiniWebsiteStory {
  id: string;
  title: string;
  platform: MiniWebsiteStoryPlatform;
  mediaType: MiniWebsiteStoryMediaType;
  image: string;
  url: string;
}

export const MINI_WEBSITE_MAX_STORIES = 20;

export function createMiniWebsiteStory(
  id = `story-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteStory {
  return {
    id,
    title: "",
    platform: "instagram",
    mediaType: "image",
    image: "",
    url: "",
  };
}

export interface MiniWebsitePartner {
  id: string;
  /** Optional accessible label; the logo remains the visible content. */
  name: string;
  image: string;
  url: string;
}

export const MINI_WEBSITE_MAX_PARTNERS = 30;

export function createMiniWebsitePartner(
  id = `partner-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsitePartner {
  return { id, name: "", image: "", url: "" };
}

/**
 * One customer's word about the business.
 *
 * Entered by the business, not submitted by the public: a page anyone can write
 * to needs moderation, rate limiting and a spam story, none of which a review
 * card is worth on its own.
 */
export interface MiniWebsiteReview {
  id: string;
  /** Who said it. */
  author: string;
  /** One to five stars. */
  rating: number;
  /** What they said. */
  text: string;
  /** Their photo. Optional — the card falls back to an avatar glyph. */
  image: string;
}

export const MINI_WEBSITE_MAX_REVIEWS = 24;
export const MINI_WEBSITE_MAX_RATING = 5;

export function createMiniWebsiteReview(
  id = `review-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteReview {
  return { id, author: "", rating: 5, text: "", image: "" };
}

export interface MiniWebsiteBeforeAfter {
  id: string;
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  beforeLabel: string;
  afterLabel: string;
}

export const MINI_WEBSITE_MAX_BEFORE_AFTER = 12;

export function createMiniWebsiteBeforeAfter(
  id = `comparison-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteBeforeAfter {
  return {
    id,
    title: "",
    description: "",
    beforeImage: "",
    afterImage: "",
    beforeLabel: "Before",
    afterLabel: "After",
  };
}

export type MiniWebsiteCoverageKind = "language";

export interface MiniWebsiteCoverageItem {
  id: string;
  kind: MiniWebsiteCoverageKind;
  name: string;
  detail: string;
}

export const MINI_WEBSITE_MAX_COVERAGE_ITEMS = 30;

export function createMiniWebsiteCoverageItem(
  kind: MiniWebsiteCoverageKind,
  id = `coverage-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteCoverageItem {
  return { id, kind, name: "", detail: "" };
}

export type MiniWebsitePaymentProvider =
  | "fib"
  | "fastpay"
  | "qicard"
  | "korek"
  | "zaincash"
  | "nasspay"
  | "cash"
  | "bankTransfer"
  | "custom";

export const MINI_WEBSITE_PAYMENT_PROVIDERS: readonly MiniWebsitePaymentProvider[] =
  [
    "fib",
    "fastpay",
    "qicard",
    "korek",
    "zaincash",
    "nasspay",
    "cash",
    "bankTransfer",
    "custom",
  ] as const;

export const MINI_WEBSITE_PAYMENT_PROVIDER_LABELS: Record<
  MiniWebsitePaymentProvider,
  string
> = {
  fib: "First Iraqi Bank (FIB)",
  fastpay: "FastPay",
  qicard: "Qi Card / SuperQi",
  korek: "MyKorek",
  zaincash: "ZainCash",
  nasspay: "NassWallet",
  cash: "پارەی نەقد",
  bankTransfer: "گواستنەوەی بانکی",
  custom: "شێوازی پارەدانی تایبەت",
};

export interface MiniWebsitePaymentMethod {
  id: string;
  provider: MiniWebsitePaymentProvider;
  name: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  /** Optional custom-provider logo; known providers use their built-in logo. */
  image: string;
}

export const MINI_WEBSITE_MAX_PAYMENT_METHODS = 12;

export function createMiniWebsitePaymentMethod(
  provider: MiniWebsitePaymentProvider = "fib",
  id = `payment-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsitePaymentMethod {
  return {
    id,
    provider,
    name: MINI_WEBSITE_PAYMENT_PROVIDER_LABELS[provider],
    accountName: "",
    accountNumber: "",
    instructions: "",
    image: "",
  };
}

export interface MiniWebsiteSpecialOffer {
  id: string;
  title: string;
  description: string;
  originalPrice: string;
  offerPrice: string;
  couponCode: string;
  /** Local calendar date in YYYY-MM-DD format; empty means no expiry. */
  expiresAt: string;
  image: string;
  url: string;
}

export const MINI_WEBSITE_MAX_SPECIAL_OFFERS = 20;

export function createMiniWebsiteSpecialOffer(
  id = `offer-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteSpecialOffer {
  return {
    id,
    title: "",
    description: "",
    originalPrice: "",
    offerPrice: "",
    couponCode: "",
    expiresAt: "",
    image: "",
    url: "",
  };
}

export interface MiniWebsiteEvent {
  id: string;
  title: string;
  description: string;
  /** Local date and time in the business's timezone. */
  startsAt: string;
  location: string;
  image: string;
  registrationUrl: string;
}

export const MINI_WEBSITE_MAX_EVENTS = 20;

export function createMiniWebsiteEvent(
  id = `event-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteEvent {
  return {
    id,
    title: "",
    description: "",
    startsAt: "",
    location: "",
    image: "",
    registrationUrl: "",
  };
}

export type MiniWebsiteAudioPlatform =
  "direct" | "spotify" | "soundcloud" | "apple" | "youtube" | "other";

export interface MiniWebsiteAudio {
  id: string;
  title: string;
  description: string;
  platform: MiniWebsiteAudioPlatform;
  url: string;
  image: string;
}

export const MINI_WEBSITE_MAX_AUDIO_ITEMS = 20;

export function createMiniWebsiteAudio(
  id = `audio-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteAudio {
  return {
    id,
    title: "",
    description: "",
    platform: "direct",
    url: "",
    image: "",
  };
}

export type MiniWebsiteAdvantageIcon =
  | "check"
  | "shield"
  | "clock"
  | "award"
  | "heart"
  | "users"
  | "sparkles"
  | "leaf"
  | "zap"
  | "globe";

export interface MiniWebsiteAdvantage {
  id: string;
  title: string;
  description: string;
  icon: MiniWebsiteAdvantageIcon;
}

export const MINI_WEBSITE_MAX_ADVANTAGES = 20;

export function createMiniWebsiteAdvantage(
  id = `advantage-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteAdvantage {
  return { id, title: "", description: "", icon: "check" };
}

export interface MiniWebsiteImpactStat {
  id: string;
  value: string;
  label: string;
  suffix: string;
  icon: MiniWebsiteAdvantageIcon;
}

export const MINI_WEBSITE_MAX_IMPACT_STATS = 20;

export function createMiniWebsiteImpactStat(
  id = `impact-stat-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteImpactStat {
  return { id, value: "", label: "", suffix: "", icon: "award" };
}

export interface MiniWebsiteProcessStep {
  id: string;
  title: string;
  description: string;
  icon: MiniWebsiteAdvantageIcon;
  actionLabel: string;
  actionUrl: string;
}

export const MINI_WEBSITE_MAX_PROCESS_STEPS = 20;

export function createMiniWebsiteProcessStep(
  id = `process-step-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteProcessStep {
  return {
    id,
    title: "",
    description: "",
    icon: "check",
    actionLabel: "",
    actionUrl: "",
  };
}

export interface MiniWebsiteDocument {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  /** Display hint such as PDF, DOCX, XLSX, ZIP, menu, or report. */
  fileType: string;
  /** Optional human-readable size, e.g. 2.4 MB. */
  fileSize: string;
}

export const MINI_WEBSITE_MAX_DOCUMENTS = 24;

export function createMiniWebsiteDocument(
  id = `document-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteDocument {
  return {
    id,
    title: "",
    description: "",
    fileUrl: "",
    fileType: "",
    fileSize: "",
  };
}

export type MiniWebsiteOwnedPropertyType =
  | "brand"
  | "company"
  | "shop"
  | "organization"
  | "facebook"
  | "instagram"
  | "youtube"
  | "website"
  | "other";

export interface MiniWebsiteOwnedProperty {
  id: string;
  name: string;
  /** Owner, Founder, Co-founder, Creator, Director, or another honest role. */
  relationship: string;
  propertyType: MiniWebsiteOwnedPropertyType;
  description: string;
  image: string;
  /** Official page, channel, brand, or website destination. */
  url: string;
  /** Optional public post, reel, video, or playlist shown inside the card. */
  featuredUrl: string;
  foundedYear: string;
}

export const MINI_WEBSITE_MAX_OWNED_PROPERTIES = 20;

export function createMiniWebsiteOwnedProperty(
  id = `owned-property-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteOwnedProperty {
  return {
    id,
    name: "",
    relationship: "خاوەن",
    propertyType: "brand",
    description: "",
    image: "",
    url: "",
    featuredUrl: "",
    foundedYear: "",
  };
}

export type MiniWebsiteEducationStatus =
  "studying" | "graduated" | "paused" | "other";

export interface MiniWebsiteEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  location: string;
  startYear: string;
  endYear: string;
  status: MiniWebsiteEducationStatus;
  grade: string;
  description: string;
  image: string;
  verificationUrl: string;
}

export const MINI_WEBSITE_MAX_EDUCATION_ENTRIES = 20;

export function createMiniWebsiteEducation(
  id = `education-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteEducation {
  return {
    id,
    institution: "",
    degree: "",
    fieldOfStudy: "",
    location: "",
    startYear: "",
    endYear: "",
    status: "studying",
    grade: "",
    description: "",
    image: "",
    verificationUrl: "",
  };
}

export type MiniWebsiteExperienceStatus = "current" | "completed";

export interface MiniWebsiteExperience {
  id: string;
  title: string;
  organization: string;
  employmentType: string;
  location: string;
  startDate: string;
  endDate: string;
  status: MiniWebsiteExperienceStatus;
  description: string;
  image: string;
  verificationUrl: string;
}

export const MINI_WEBSITE_MAX_EXPERIENCE_ENTRIES = 20;

export function createMiniWebsiteExperience(
  id = `experience-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteExperience {
  return {
    id,
    title: "",
    organization: "",
    employmentType: "",
    location: "",
    startDate: "",
    endDate: "",
    status: "current",
    description: "",
    image: "",
    verificationUrl: "",
  };
}

/**
 * One question and its answer.
 *
 * `id` is the editor's key, kept across a save so an answer being written stays
 * with its question when the list is reordered.
 */
export interface MiniWebsiteFaqEntry {
  id: string;
  question: string;
  answer: string;
}

/** Upper bound on questions, so one page cannot grow without limit. */
export const MINI_WEBSITE_MAX_FAQ_ENTRIES = 20;

export function createMiniWebsiteFaqEntry(
  id = `faq-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteFaqEntry {
  return { id, question: "", answer: "" };
}

/**
 * What a single question on the lead form asks for.
 *
 * `phone` and `email` are separate from `text` because they decide the mobile
 * keyboard, the browser autofill hint, and — through the field's mapping — which
 * encrypted CRM contact column the answer is stored in.
 */
export type MiniWebsiteLeadFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "date"
  | "checkbox";

export const MINI_WEBSITE_LEAD_FIELD_TYPES: readonly MiniWebsiteLeadFieldType[] =
  [
    "text",
    "textarea",
    "email",
    "phone",
    "number",
    "select",
    "date",
    "checkbox",
  ] as const;

/**
 * Which CRM identity column an answer becomes.
 *
 * The three mapped answers are the only ones treated as identity: they are
 * encrypted at rest, hashed for de-duplication, and are what a TikTok custom
 * audience is later built from. Everything else is stored as lead metadata, so
 * a business asking "which branch is nearest to you?" never turns that answer
 * into a contact record it has no consent to match on.
 */
export type MiniWebsiteLeadFieldMapping = "none" | "name" | "email" | "phone";

export const MINI_WEBSITE_LEAD_FIELD_MAPPINGS: readonly MiniWebsiteLeadFieldMapping[] =
  ["none", "name", "email", "phone"] as const;

/** The mapping each field type may claim; anything else falls back to `none`. */
export const MINI_WEBSITE_LEAD_MAPPING_TYPES: Record<
  Exclude<MiniWebsiteLeadFieldMapping, "none">,
  readonly MiniWebsiteLeadFieldType[]
> = {
  name: ["text"],
  email: ["email"],
  phone: ["phone"],
};

export interface MiniWebsiteLeadField {
  id: string;
  label: string;
  placeholder: string;
  /** Optional line under the input, for a format hint or a reassurance. */
  helpText: string;
  type: MiniWebsiteLeadFieldType;
  mapping: MiniWebsiteLeadFieldMapping;
  required: boolean;
  /** Choices for a `select`; ignored by every other type. */
  options: string[];
}

export const MINI_WEBSITE_MAX_LEAD_FIELDS = 12;
export const MINI_WEBSITE_MAX_LEAD_FIELD_OPTIONS = 20;
/** Upper bound on one answer, so a submission cannot be used as storage. */
export const MINI_WEBSITE_MAX_LEAD_ANSWER_LENGTH = 1_000;

/**
 * The enquiry form a visitor fills in, and what happens around it.
 *
 * Unlike every other section, this one is written *by the public*: the business
 * describes the questions, and each submission becomes a CRM contact and lead.
 * The consent line is therefore part of the form rather than decoration — it is
 * the record of what the visitor agreed to when they handed over their details.
 */
export interface MiniWebsiteLeadForm {
  title: string;
  description: string;
  /** Text on the button; empty falls back to a default. */
  submitLabel: string;
  /** Shown in place of the form once a submission is accepted. */
  successMessage: string;
  /** The sentence beside the consent checkbox. Empty hides the checkbox. */
  consentText: string;
  /** When true the form cannot be submitted until consent is ticked. */
  consentRequired: boolean;
  fields: MiniWebsiteLeadField[];
}

export function createMiniWebsiteLeadField(
  type: MiniWebsiteLeadFieldType = "text",
  id = `lead-field-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsiteLeadField {
  return {
    id,
    label: "",
    placeholder: "",
    helpText: "",
    type,
    mapping: type === "email" ? "email" : type === "phone" ? "phone" : "none",
    required: false,
    options: [],
  };
}

/**
 * A blank form that already asks the three things a lead is useless without.
 *
 * Starting empty would let a business publish a form that collects answers it
 * can never follow up on, so the default asks for a name and one way to reply.
 */
export function createMiniWebsiteLeadForm(): MiniWebsiteLeadForm {
  return {
    title: "",
    description: "",
    submitLabel: "",
    successMessage: "",
    consentText: "",
    consentRequired: false,
    fields: [
      { ...createMiniWebsiteLeadField("text"), label: "ناو", mapping: "name", required: true },
      { ...createMiniWebsiteLeadField("phone"), label: "ژمارەی مۆبایل", required: true },
      { ...createMiniWebsiteLeadField("textarea"), label: "پەیامەکەت" },
    ],
  };
}

/**
 * One tier in the pricing table.
 *
 * `services` already lists what a business sells, one card at a time. A plan is
 * the other question a visitor asks — *which* of these do I want — and that is
 * only answerable side by side, which is why the tiers are their own section
 * rather than more service cards.
 *
 * `features` holds only what this tier *includes*. What it lacks is not stored:
 * the renderer takes the union of every tier's features and marks the ones a
 * tier is missing, so adding a feature to the top plan automatically shows up
 * as a gap in the cheaper ones instead of having to be typed into each.
 */
export interface MiniWebsitePlan {
  id: string;
  name: string;
  /** Free text, so "٢٥٠,٠٠٠ د.ع" and "بەپێی داواکاری" are both sayable. */
  price: string;
  /** What the price is per — "مانگانە", "ساڵانە", or empty for one-off. */
  period: string;
  description: string;
  /** The recommended tier. At most one plan may claim it. */
  featured: boolean;
  features: string[];
  actionLabel: string;
  actionType: MiniWebsiteActionType;
  actionValue: string;
  actionCountryCode: string;
  /** Server-built destination. Clients may read it but cannot choose it. */
  url: string;
  pixelEvent: MiniWebsiteItemPixelEvent;
}

export const MINI_WEBSITE_MAX_PLANS = 6;
export const MINI_WEBSITE_MAX_PLAN_FEATURES = 20;

export function createMiniWebsitePlan(
  id = `plan-${Math.random().toString(36).slice(2, 10)}`,
): MiniWebsitePlan {
  return {
    id,
    name: "",
    price: "",
    period: "",
    description: "",
    featured: false,
    features: [],
    actionLabel: "",
    actionType: "whatsapp",
    actionValue: "",
    actionCountryCode: "964",
    url: "",
    pixelEvent: "InitiateCheckout",
  };
}

/**
 * Every feature named by any tier, in the order the tiers introduce them.
 *
 * Shared between the editor's preview and the public renderer so both draw the
 * same rows; a tier that does not list one is showing a gap, not a blank.
 */
export function miniWebsitePlanFeatureRows(
  plans: MiniWebsitePlan[],
): string[] {
  const rows: string[] = [];
  for (const plan of plans)
    for (const feature of plan.features)
      if (!rows.includes(feature)) rows.push(feature);
  return rows;
}

export const MINI_WEBSITE_LOCATION_PRECISIONS: readonly MiniWebsiteLocationPrecision[] =
  ["exact", "approximate"] as const;

/**
 * Sections that are actually offered and persisted right now. The backend
 * filters incoming sections against this, so a key the product does not support
 * yet can never be stored.
 */
export const MINI_WEBSITE_SECTION_KEYS: readonly MiniWebsiteSectionKey[] = [
  "socials",
  "location",
  "hours",
  "gallery",
  "faq",
  "services",
  "booking",
  "team",
  "reviews",
  "credentials",
  "shortVideos",
  "youtubeVideos",
  "stories",
  "partners",
  "beforeAfter",
  "serviceAreas",
  "payments",
  "offers",
  "events",
  "audio",
  "whyChooseUs",
  "impactStats",
  "process",
  "documents",
  "ownedProperties",
  "education",
  "experience",
  "leadForm",
  "pricing",
] as const;

/** Radius bounds for the approximate circle, in metres. */
export const MINI_WEBSITE_LOCATION_RADIUS_MIN = 100;
export const MINI_WEBSITE_LOCATION_RADIUS_MAX = 20_000;

/** Upper bound on branches, so one record cannot grow without limit. */
export const MINI_WEBSITE_MAX_LOCATIONS = 12;

export function createMiniWebsiteLocation(): MiniWebsiteLocation {
  return {
    name: "",
    phone: "",
    phoneCountryCode: "964",
    address: "",
    area: "",
    city: "",
    lat: null,
    lng: null,
    precision: "exact",
    radiusMeters: 500,
    zoom: 14,
    mapUrl: "",
    image: "",
  };
}
