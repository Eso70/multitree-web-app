import type { ReactElement } from "react";
import {
  Award,
  BadgeCheck,
  BadgePercent,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  ClipboardList,
  Clock3,
  Columns2,
  CreditCard,
  Crown,
  FileDown,
  GraduationCap,
  Headphones,
  HelpCircle,
  Images,
  Languages,
  ListChecks,
  MapPin,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Users,
  Video,
  WalletCards,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import {
  AdvantagesSection,
  DocumentsSection,
  ImpactStatsSection,
  ProcessSection,
  ADVANTAGE_TONES,
  IMPACT_STAT_TONES,
  PROCESS_TONES,
} from "../LiquidGlassInformationalSections";
import { SWISS_ACCENT } from "../liquid-glass-utils";
import type { ProfileLike } from "../../types";
import {
  isShortFormVideoUrl,
  isYoutubeStandardVideoUrl,
} from "@/features/mini-website/video-links";
import {
  AUDIO_TONES,
  BOOKING_TONES,
  CREDENTIAL_TONES,
  EDUCATION_TONES,
  EVENT_TONES,
  EXPERIENCE_TONES,
  FAQ_TONES,
  LANGUAGE_TONES,
  OFFER_TONES,
  OWNED_PROPERTY_TONES,
  PLAN_TONES,
  REVIEW_TONES,
  SERVICE_CARD_TONES,
  TEAM_TONES,
} from "./section-tokens";
import { records } from "./section-utils";
import {
  AudioSection,
  BeforeAfterSection,
  BookingSection,
  BranchesSection,
  CardRecordsSection,
  CoverageSection,
  CredentialsSection,
  EducationSection,
  EventsSection,
  ExperienceSection,
  FaqSection,
  GallerySection,
  HoursSection,
  LeadFormSection,
  LinkRecordsSection,
  LocationSection,
  OwnedPropertiesSection,
  PartnersSection,
  PaymentMethodsSection,
  PricingSection,
  ReviewsSection,
  ServicesSection,
  SocialLinksSection,
  SocialSection,
  SpecialOffersSection,
  TeamSection,
  VideoSection,
} from ".";

/**
 * The Section Registry — the single place that knows how every public section
 * is drawn, headed, and placed on the full-page grid.
 *
 * Each entry carries the meta that used to live in `section-utils` (icon,
 * header tone, grid placement) plus a `render` function that pulls the section's
 * data out of the profile and calls its existing renderer. The template only
 * looks a key up; it no longer switches over the section names.
 */

/** Everything a registry render function needs to draw one section. */
export interface SectionRegistryContext {
  profile: ProfileLike;
  fullPage: boolean;
  interactive: boolean;
  whatsappHref?: string;
  leadFormEndpoint?: string;
  onLeadSubmitted?: (eventId: string) => void;
  dark?: boolean;
  index: number;
  /** The business's brand colour. */
  accent: string;
  /** Spread into every renderer: the invariants all sections share. */
  common: {
    fullPage: boolean;
    accent: string;
    tone: string;
    index: number;
  };
  /** Spread into every headed renderer: the frame title and icon. */
  header: { title: string; icon: LucideIcon };
}

export interface SectionRegistryEntry {
  label: string;
  icon: LucideIcon;
  palette: readonly string[];
  placement: "full" | "half";
  render: (ctx: SectionRegistryContext) => ReactElement | null;
}

/**
 * The sections that head themselves in the first tone of their own palette.
 * Every other section keeps the business's colour, even when its cards carry a
 * palette of their own.
 */
const PALETTE_HEADED_KEYS = new Set([
  "whyChooseUs",
  "impactStats",
  "process",
  "services",
  "experience",
  "education",
  "team",
]);

export function sectionHeaderTone(key: string) {
  const palette = SECTION_REGISTRY[key]?.palette;
  return PALETTE_HEADED_KEYS.has(key) && palette?.length ? palette[0] : SWISS_ACCENT;
}

/** The public portfolio follows the saved section order, on a predictable grid. */
export function sectionPlacementClass(key: string) {
  return SECTION_REGISTRY[key]?.placement === "half"
    ? "xl:col-span-1"
    : "xl:col-span-2";
}

export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  socials: {
    label: "سۆشیال میدیا",
    icon: Share2,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <SocialLinksSection profile={ctx.profile} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  services: {
    label: "خزمەتگوزاری و بەرهەم",
    icon: BriefcaseBusiness,
    palette: SERVICE_CARD_TONES,
    placement: "full",
    render: (ctx) => (
      <ServicesSection
        services={ctx.profile.services}
        interactive={ctx.interactive}
        fallbackHref={ctx.whatsappHref}
        {...ctx.header}
        {...ctx.common}
      />
    ),
  },
  products: {
    label: "بەرهەم و نرخ",
    icon: ShoppingBag,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <CardRecordsSection
        title="بەرهەم و نرخ"
        icon={ShoppingBag}
        items={records(ctx.profile.content.productsText)}
        actionHref={ctx.whatsappHref}
        actionLabel="کڕین"
        interactive={ctx.interactive}
        {...ctx.common}
      />
    ),
  },
  hours: {
    label: "کاتی کارکردن",
    icon: Clock3,
    palette: [],
    placement: "half",
    render: (ctx) => <HoursSection hours={ctx.profile.hours} {...ctx.header} {...ctx.common} />,
  },
  location: {
    label: "شوێن و نەخشە",
    icon: MapPin,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <LocationSection
        locations={ctx.profile.locations}
        interactive={ctx.interactive}
        dark={ctx.dark}
        {...ctx.header}
        {...ctx.common}
      />
    ),
  },
  gallery: {
    label: "گەلەری وێنەکان",
    icon: Images,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <GallerySection images={ctx.profile.gallery} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  shortVideos: {
    label: "ڕیلز و شۆرتس",
    icon: Video,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <VideoSection
        videos={ctx.profile.videos}
        acceptsUrl={isShortFormVideoUrl}
        interactive={ctx.interactive}
        brandLabels
        {...ctx.header}
        {...ctx.common}
      />
    ),
  },
  youtubeVideos: {
    label: "ڤیدیۆکانی یوتوب",
    icon: Youtube,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <VideoSection
        videos={ctx.profile.youtubeVideos}
        acceptsUrl={isYoutubeStandardVideoUrl}
        interactive={ctx.interactive}
        layout="stack"
        {...ctx.header}
        {...ctx.common}
      />
    ),
  },
  socialPosts: {
    label: "پۆستەکان",
    icon: Sparkles,
    palette: [],
    placement: "full",
    render: (ctx) => {
      const socialsEnabled = ctx.profile.sections.some(
        (item) => item.key === "socials" && item.enabled,
      );
      return socialsEnabled ? null : (
        <SocialSection
          content={ctx.profile.content}
          interactive={ctx.interactive}
          showAccounts={false}
          showPosts
          {...ctx.header}
          {...ctx.common}
        />
      );
    },
  },
  reviews: {
    label: "ڕای کڕیاران",
    icon: Star,
    palette: REVIEW_TONES,
    placement: "full",
    render: (ctx) => <ReviewsSection reviews={ctx.profile.reviews} {...ctx.header} {...ctx.common} />,
  },
  articles: {
    label: "وتارەکان",
    icon: BookOpen,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <LinkRecordsSection
        title="وتارەکان"
        icon={BookOpen}
        items={records(ctx.profile.content.articlesText)}
        interactive={ctx.interactive}
        {...ctx.common}
      />
    ),
  },
  beforeAfter: {
    label: "پێش و دوا",
    icon: Columns2,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <BeforeAfterSection comparisons={ctx.profile.beforeAfter} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  serviceAreas: {
    label: "زمانەکان",
    icon: Languages,
    palette: LANGUAGE_TONES,
    placement: "half",
    render: (ctx) => <CoverageSection items={ctx.profile.coverage} {...ctx.header} {...ctx.common} />,
  },
  payments: {
    label: "شێوازەکانی پارەدان",
    icon: CreditCard,
    palette: [],
    placement: "half",
    render: (ctx) => <PaymentMethodsSection methods={ctx.profile.paymentMethods} {...ctx.header} {...ctx.common} />,
  },
  offers: {
    label: "ئۆفەرە تایبەتەکان",
    icon: BadgePercent,
    palette: OFFER_TONES,
    placement: "half",
    render: (ctx) => (
      <SpecialOffersSection offers={ctx.profile.specialOffers} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  events: {
    label: "ڕووداو و وۆرکشۆپەکان",
    icon: CalendarRange,
    palette: EVENT_TONES,
    placement: "half",
    render: (ctx) => (
      <EventsSection events={ctx.profile.events} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  audio: {
    label: "دەنگ و پۆدکاست",
    icon: Headphones,
    palette: AUDIO_TONES,
    placement: "half",
    render: (ctx) => (
      <AudioSection items={ctx.profile.audio} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  whyChooseUs: {
    label: "بۆچی ئێمە هەڵبژێریت؟",
    icon: BadgeCheck,
    palette: ADVANTAGE_TONES,
    placement: "full",
    render: (ctx) => <AdvantagesSection items={ctx.profile.advantages} {...ctx.header} {...ctx.common} />,
  },
  impactStats: {
    label: "ژمارە و کاریگەری",
    icon: ChartNoAxesCombined,
    palette: IMPACT_STAT_TONES,
    placement: "full",
    render: (ctx) => <ImpactStatsSection items={ctx.profile.impactStats} {...ctx.header} {...ctx.common} />,
  },
  process: {
    label: "چۆنیەتی کارکردن",
    icon: ListChecks,
    palette: PROCESS_TONES,
    placement: "full",
    render: (ctx) => (
      <ProcessSection steps={ctx.profile.processSteps} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  documents: {
    label: "بەڵگەنامە و داگرتنەکان",
    icon: FileDown,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <DocumentsSection documents={ctx.profile.documents} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  ownedProperties: {
    label: "براند و پەیجەکانی من",
    icon: Crown,
    palette: OWNED_PROPERTY_TONES,
    placement: "full",
    render: (ctx) => (
      <OwnedPropertiesSection items={ctx.profile.ownedProperties} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  education: {
    label: "خوێندن و پەروەردە",
    icon: GraduationCap,
    palette: EDUCATION_TONES,
    placement: "full",
    render: (ctx) => (
      <EducationSection entries={ctx.profile.education} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  experience: {
    label: "ئەزموون و مێژووی کار",
    icon: BriefcaseBusiness,
    palette: EXPERIENCE_TONES,
    placement: "full",
    render: (ctx) => (
      <ExperienceSection entries={ctx.profile.experience} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  faq: {
    label: "پرسیارە دووبارەکان",
    icon: HelpCircle,
    palette: FAQ_TONES,
    placement: "half",
    render: (ctx) => <FaqSection entries={ctx.profile.faq} {...ctx.header} {...ctx.common} />,
  },
  leadForm: {
    label: "فۆرمی داواکاری و پەیوەندی",
    icon: ClipboardList,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <LeadFormSection
        form={ctx.profile.leadForm}
        endpoint={ctx.leadFormEndpoint}
        onSubmitted={ctx.onLeadSubmitted}
        interactive={ctx.interactive}
        {...ctx.header}
        {...ctx.common}
      />
    ),
  },
  pricing: {
    label: "پلان و پاکێجەکان",
    icon: WalletCards,
    palette: PLAN_TONES,
    placement: "full",
    render: (ctx) => (
      <PricingSection plans={ctx.profile.plans} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  booking: {
    label: "حجزکردنی کات",
    icon: CalendarDays,
    palette: BOOKING_TONES,
    placement: "half",
    render: (ctx) => (
      <BookingSection bookings={ctx.profile.bookings} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  team: {
    label: "تیم و پسپۆڕان",
    icon: Users,
    palette: TEAM_TONES,
    placement: "full",
    render: (ctx) => (
      <TeamSection team={ctx.profile.team} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  credentials: {
    label: "بڕوانامە و دەستکەوتەکان",
    icon: Award,
    palette: CREDENTIAL_TONES,
    placement: "full",
    render: (ctx) => (
      <CredentialsSection certificates={ctx.profile.certificates} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  courses: {
    label: "کۆرس و بەرنامەکان",
    icon: GraduationCap,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <CardRecordsSection
        title="کۆرس و بەرنامەکان"
        icon={GraduationCap}
        items={records(ctx.profile.content.coursesText)}
        interactive={ctx.interactive}
        {...ctx.common}
      />
    ),
  },
  branches: {
    label: "لقەکان",
    icon: Store,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <BranchesSection value={ctx.profile.content.branchesText} interactive={ctx.interactive} {...ctx.common} />
    ),
  },
  partners: {
    label: "هاوبەش و براندەکان",
    icon: Users,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <PartnersSection partners={ctx.profile.partners} interactive={ctx.interactive} {...ctx.header} {...ctx.common} />
    ),
  },
  customBlocks: {
    label: "زیاتر",
    icon: Sparkles,
    palette: [],
    placement: "full",
    render: (ctx) => (
      <CardRecordsSection
        title="زیاتر"
        icon={Sparkles}
        items={records(ctx.profile.content.customBlocksText)}
        interactive={ctx.interactive}
        {...ctx.common}
      />
    ),
  },
};
