import type { PublicPageAnalytics } from "@linktree/types";
import type { SocialLink } from "@/features/link-editor/types";
import {
  createMiniWebsiteLeadForm,
  createMiniWebsiteWeekHours,
  type MiniWebsiteBackgroundStyle,
  type MiniWebsiteLeadField,
  type MiniWebsiteLeadFieldMapping,
  type MiniWebsiteLeadFieldType,
  type MiniWebsiteLeadForm,
  type MiniWebsitePlan,
  type MiniWebsiteBeforeAfter,
  type MiniWebsiteAdvantage,
  type MiniWebsiteImpactStat,
  type MiniWebsiteProcessStep,
  type MiniWebsiteAudio,
  type MiniWebsiteAudioPlatform,
  type MiniWebsiteBooking,
  type MiniWebsiteBookingProvider,
  type MiniWebsiteCertificate,
  type MiniWebsiteCoverageItem,
  type MiniWebsiteDocument,
  type MiniWebsiteEducation,
  type MiniWebsiteEducationStatus,
  type MiniWebsiteExperience,
  type MiniWebsiteExperienceStatus,
  type MiniWebsiteEvent,
  type MiniWebsiteDayHours,
  type MiniWebsiteFaqEntry,
  type MiniWebsiteGalleryImage,
  type MiniWebsiteDayKey,
  type MiniWebsiteLocation,
  type MiniWebsiteSection,
  type MiniWebsiteReview,
  type MiniWebsiteSectionKey,
  type MiniWebsiteService,
  type MiniWebsiteTeamMember,
  type MiniWebsitePartner,
  type MiniWebsiteOwnedProperty,
  type MiniWebsiteOwnedPropertyType,
  type MiniWebsitePaymentMethod,
  type MiniWebsitePaymentProvider,
  type MiniWebsiteProfessionTemplateKey,
  type MiniWebsiteSpecialOffer,
  type MiniWebsiteStory,
  type MiniWebsiteStoryMediaType,
  type MiniWebsiteStoryPlatform,
  type MiniWebsiteVideo,
  type MiniWebsiteVideoPlatform,
  type MiniWebsiteYoutubeVideo,
  type MiniWebsiteWeekHours,
} from "@linktree/types";

export type {
  MiniWebsiteBeforeAfter,
  MiniWebsiteBackgroundStyle,
  MiniWebsiteLeadField,
  MiniWebsiteLeadFieldMapping,
  MiniWebsiteLeadFieldType,
  MiniWebsiteLeadForm,
  MiniWebsitePlan,
  MiniWebsiteAdvantage,
  MiniWebsiteImpactStat,
  MiniWebsiteProcessStep,
  MiniWebsiteAudio,
  MiniWebsiteAudioPlatform,
  MiniWebsiteBooking,
  MiniWebsiteBookingProvider,
  MiniWebsiteCertificate,
  MiniWebsiteCoverageItem,
  MiniWebsiteDocument,
  MiniWebsiteEducation,
  MiniWebsiteEducationStatus,
  MiniWebsiteExperience,
  MiniWebsiteExperienceStatus,
  MiniWebsiteEvent,
  MiniWebsiteDayHours,
  MiniWebsiteReview,
  MiniWebsiteService,
  MiniWebsiteTeamMember,
  MiniWebsitePartner,
  MiniWebsiteOwnedProperty,
  MiniWebsiteOwnedPropertyType,
  MiniWebsitePaymentMethod,
  MiniWebsitePaymentProvider,
  MiniWebsiteProfessionTemplateKey,
  MiniWebsiteSpecialOffer,
  MiniWebsiteStory,
  MiniWebsiteStoryMediaType,
  MiniWebsiteStoryPlatform,
  MiniWebsiteVideo,
  MiniWebsiteVideoPlatform,
  MiniWebsiteYoutubeVideo,
  MiniWebsiteFaqEntry,
  MiniWebsiteGalleryImage,
  MiniWebsiteDayKey,
  MiniWebsiteLocation,
  MiniWebsiteSection,
  MiniWebsiteSectionKey,
  MiniWebsiteWeekHours,
};

export type MiniWebsiteStatus = "draft" | "published" | "paused";
export type MiniWebsiteVariation = "soft" | "glass" | "minimal" | "warm";
export interface MiniWebsiteContent {
  heroBackgroundType: "" | "image" | "color" | "video";
  heroBackgroundColor: string;
  heroYoutubeUrl: string;
  whatsappCountryCode: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneCountryCode: string;
  socialTikTok: string;
  socialInstagram: string;
  socialFacebook: string;
  socialYoutube: string;
  socialSnapchat: string;
  socialTelegram: string;
  socialLinkedin: string;
  socialDiscord: string;
  socialGoogleReview: string;
  servicesText: string;
  productsText: string;
  workingHoursText: string;
  address: string;
  mapUrl: string;
  galleryImages: string[];
  galleryYoutubeUrl: string;
  socialPostsText: string;
  reviewsText: string;
  articlesText: string;
  beforeImage: string | null;
  afterImage: string | null;
  faqText: string;
  bookingUrl: string;
  credentialsText: string;
  credentialImages: string[];
  coursesText: string;
  educationText: string;
  paymentsText: string;
  branchesText: string;
  partnersText: string;
  partnerImages: string[];
  customBlocksText: string;
  showShareTools: boolean;
  showViewCount: boolean;
  allowVcard: boolean;
  allowInstall: boolean;
}

export interface MiniWebsite {
  id: string;
  name: string;
  slug: string;
  headline: string;
  bio: string;
  avatar: string | null;
  cover: string | null;
  variation: MiniWebsiteVariation;
  backgroundStyle: MiniWebsiteBackgroundStyle;
  professionTemplate: MiniWebsiteProfessionTemplateKey | "";
  accentColor: string;
  businessWebsiteColor?: string | null;
  status: MiniWebsiteStatus;
  primaryAction: "none" | "whatsapp" | "call" | "booking";
  whatsappNumber: string;
  pixelEvent: "Contact" | "Lead" | "InitiateCheckout" | "CompletePayment";
  eventValue: number;
  socialLinks: SocialLink[];
  sections: MiniWebsiteSection[];
  locations: MiniWebsiteLocation[];
  /** Opening times for the business as a whole, one entry per weekday. */
  hours: MiniWebsiteWeekHours;
  /** Photos of the work or the place, in the order they are shown. */
  gallery: MiniWebsiteGalleryImage[];
  /** Questions customers keep asking, with their answers. */
  faq: MiniWebsiteFaqEntry[];
  /** What the business sells, in the order it is shown. */
  services: MiniWebsiteService[];
  /** External appointment types, in the order they are shown. */
  bookings: MiniWebsiteBooking[];
  /** People presented by the business, in the order they are shown. */
  team: MiniWebsiteTeamMember[];
  /** Certificates and awards, in display order. */
  certificates: MiniWebsiteCertificate[];
  /** Public video and reel links, in display order. */
  videos: MiniWebsiteVideo[];
  /** YouTube-only embeds, capped at three and displayed in their own section. */
  youtubeVideos: MiniWebsiteYoutubeVideo[];
  /** Temporary image and video posts shown in a story strip. */
  stories: MiniWebsiteStory[];
  /** Partner logos used by the continuous marquee. */
  partners: MiniWebsitePartner[];
  /** What customers said, as entered by the business. */
  reviews: MiniWebsiteReview[];
  /** Repeatable interactive image comparisons. */
  beforeAfter: MiniWebsiteBeforeAfter[];
  /** Languages spoken. */
  coverage: MiniWebsiteCoverageItem[];
  /** Accepted Iraqi and general payment methods. */
  paymentMethods: MiniWebsitePaymentMethod[];
  /** Limited-time promotions and coupon codes. */
  specialOffers: MiniWebsiteSpecialOffer[];
  /** Upcoming events, workshops, and registration destinations. */
  events: MiniWebsiteEvent[];
  /** Playable podcast, interview, music, and voice entries. */
  audio: MiniWebsiteAudio[];
  /** Short reasons visitors should choose the business. */
  advantages: MiniWebsiteAdvantage[];
  /** Measurable achievements and key figures. */
  impactStats: MiniWebsiteImpactStat[];
  /** A visitor-facing sequence for completing a service or request. */
  processSteps: MiniWebsiteProcessStep[];
  /** Downloadable or externally hosted documents. */
  documents: MiniWebsiteDocument[];
  /** Brands, businesses, pages, and channels the profile owner owns or leads. */
  ownedProperties: MiniWebsiteOwnedProperty[];
  /** Formal and ongoing study history in résumé order. */
  education: MiniWebsiteEducation[];
  /** Current and past positions in résumé order. */
  experience: MiniWebsiteExperience[];
  /**
   * The enquiry form visitors fill in. The only section whose content is
   * written by the public: each submission becomes a CRM contact and lead.
   */
  leadForm: MiniWebsiteLeadForm;
  /** Priced tiers, compared side by side. */
  plans: MiniWebsitePlan[];
  content: MiniWebsiteContent;
  views: number;
  actions: number;
  conversions: number;
  /**
   * Present only on the public read. The editor never receives it, because the
   * pixel does not load in the dashboard — see docs/tracking.md.
   */
  analytics?: PublicPageAnalytics;
  updatedAt: string;
}

export type MiniWebsiteDraft = Omit<
  MiniWebsite,
  "id" | "views" | "actions" | "conversions" | "updatedAt"
>;

/**
 * Sections offered by the editor's picker, in display order.
 *
 * Only sections that actually persist and render belong here — the list used to
 * advertise 22 of them while the backend stored none, so every one but the hero
 * silently vanished on save.
 */
export const MINI_WEBSITE_SECTIONS: Array<{
  key: MiniWebsiteSectionKey;
  label: string;
}> = [
  { key: "socials", label: "سۆشیال میدیا" },
  { key: "stories", label: "ستۆرییەکانی سۆشیال میدیا" },
  { key: "whyChooseUs", label: "بۆچی ئێمە هەڵبژێریت؟" },
  { key: "services", label: "خزمەتگوزاری و بەرهەم" },
  { key: "process", label: "چۆنیەتی کارکردن" },
  { key: "impactStats", label: "ژمارە و کاریگەری" },
  { key: "experience", label: "ئەزموون و مێژووی کار" },
  { key: "education", label: "خوێندن و پەروەردە" },
  { key: "team", label: "تیم و پسپۆڕان" },
  { key: "gallery", label: "گەلەری وێنەکان" },
  { key: "beforeAfter", label: "پێش و دوا" },
  { key: "shortVideos", label: "ڕیلز و شۆرتس" },
  { key: "youtubeVideos", label: "ڤیدیۆکانی یوتوب" },
  { key: "credentials", label: "بڕوانامە و دەستکەوتەکان" },
  { key: "reviews", label: "ڕای کڕیاران" },
  { key: "partners", label: "هاوبەش و براندەکان" },
  { key: "ownedProperties", label: "براند و پەیجەکانی من" },
  { key: "offers", label: "ئۆفەرە تایبەتەکان" },
  { key: "booking", label: "حجزکردنی کات" },
  { key: "events", label: "ڕووداو و وۆرکشۆپەکان" },
  { key: "audio", label: "دەنگ و پۆدکاست" },
  { key: "documents", label: "بەڵگەنامە و داگرتنەکان" },
  { key: "payments", label: "شێوازەکانی پارەدان" },
  { key: "serviceAreas", label: "زمانەکان" },
  { key: "hours", label: "کاتی کارکردن" },
  { key: "faq", label: "پرسیارە دووبارەکان" },
  { key: "leadForm", label: "فۆرمی داواکاری و پەیوەندی" },
  { key: "pricing", label: "پلان و پاکێجەکان" },
  { key: "location", label: "شوێن و نەخشە" },
];

export const createMiniWebsiteDraft = (input?: {
  businessLogo?: string | null;
  businessDefaultAvatar?: string | null;
  accentColor?: string | null;
}): MiniWebsiteDraft => ({
  name: "",
  slug: "mini-website",
  headline: "",
  bio: "",
  avatar:
    input?.businessDefaultAvatar ||
    input?.businessLogo ||
    "/images/DefaultAvatar.png",
  cover: null,
  variation: "soft",
  backgroundStyle: "none",
  professionTemplate: "",
  accentColor: input?.accentColor || "#b6f20d",
  status: "draft",
  primaryAction: "none",
  whatsappNumber: "",
  pixelEvent: "Contact",
  eventValue: 0,
  socialLinks: [],
  // Nothing preselected — the business chooses which sections their page has.
  // Validation still requires at least one before the wizard will continue.
  sections: [],
  locations: [],
  hours: createMiniWebsiteWeekHours(),
  gallery: [],
  faq: [],
  services: [],
  bookings: [],
  team: [],
  certificates: [],
  videos: [],
  youtubeVideos: [],
  stories: [],
  partners: [],
  reviews: [],
  beforeAfter: [],
  coverage: [],
  paymentMethods: [],
  specialOffers: [],
  events: [],
  audio: [],
  advantages: [],
  impactStats: [],
  processSteps: [],
  documents: [],
  ownedProperties: [],
  education: [],
  experience: [],
  leadForm: createMiniWebsiteLeadForm(),
  plans: [],
  content: {
    heroBackgroundType: "color",
    heroBackgroundColor: "#000000",
    heroYoutubeUrl: "",
    whatsappCountryCode: "964",
    contactEmail: "",
    contactPhone: "",
    contactPhoneCountryCode: "964",
    socialTikTok: "",
    socialInstagram: "",
    socialFacebook: "",
    socialYoutube: "",
    socialSnapchat: "",
    socialTelegram: "",
    socialLinkedin: "",
    socialDiscord: "",
    socialGoogleReview: "",
    servicesText: "",
    productsText: "",
    workingHoursText: "",
    address: "",
    mapUrl: "",
    galleryImages: [],
    galleryYoutubeUrl: "",
    socialPostsText: "",
    reviewsText: "",
    articlesText: "",
    beforeImage: null,
    afterImage: null,
    faqText: "",
    bookingUrl: "",
    credentialsText: "",
    credentialImages: [],
    coursesText: "",
    educationText: "",
    paymentsText: "",
    branchesText: "",
    partnersText: "",
    partnerImages: [],
    customBlocksText: "",
    showShareTools: true,
    showViewCount: true,
    allowVcard: true,
    allowInstall: true,
  },
});
