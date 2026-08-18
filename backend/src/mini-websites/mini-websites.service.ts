import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MiniWebsiteAdvantage,
  MiniWebsiteAdvantageIcon,
  MiniWebsiteAudio,
  MiniWebsiteAudioPlatform,
  MiniWebsiteBeforeAfter,
  MiniWebsiteBackgroundStyle,
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
  MiniWebsiteDayKey,
  MiniWebsiteFaqEntry,
  MiniWebsiteActionType,
  MiniWebsiteGalleryImage,
  MiniWebsiteImpactStat,
  MiniWebsiteProcessStep,
  MiniWebsiteItemPixelEvent,
  MiniWebsiteLeadField,
  MiniWebsiteLeadFieldMapping,
  MiniWebsiteLeadForm,
  MiniWebsitePlan,
  MiniWebsiteLocation,
  MiniWebsiteSection,
  MiniWebsiteReview,
  MiniWebsiteSectionKey,
  MiniWebsiteService,
  MiniWebsiteTeamMember,
  MiniWebsitePartner,
  MiniWebsiteOwnedProperty,
  MiniWebsiteOwnedPropertyType,
  MiniWebsitePaymentMethod,
  MiniWebsitePaymentProvider,
  MiniWebsiteSpecialOffer,
  MiniWebsiteStory,
  MiniWebsiteStoryPlatform,
  MiniWebsiteVideo,
  MiniWebsiteVideoPlatform,
  MiniWebsiteYoutubeVideo,
  MiniWebsiteWeekHours,
  MiniWebsiteVisualTemplateKey,
} from '@linktree/types';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { PublicPageAnalyticsService } from '../analytics/public-page-analytics.service';
import { toRecord, toRecordArray, toText } from '../common/coerce';
import { buildMiniWebsiteActions } from './mini-website-actions';
import type { SaveMiniWebsiteDto } from './dto/mini-website.dto';
import {
  MINI_WEBSITE_BACKGROUND_STYLES,
  MINI_WEBSITE_LEAD_FIELD_MAPPINGS,
  MINI_WEBSITE_LEAD_FIELD_TYPES,
  MINI_WEBSITE_LEAD_MAPPING_TYPES,
  MINI_WEBSITE_MAX_LEAD_FIELDS,
  MINI_WEBSITE_VISUAL_TEMPLATE_DEFAULT,
  MINI_WEBSITE_MAX_LEAD_FIELD_OPTIONS,
  MINI_WEBSITE_MAX_PLANS,
  MINI_WEBSITE_MAX_PLAN_FEATURES,
  MINI_WEBSITE_MAX_PAYMENT_METHODS,
  MINI_WEBSITE_PAYMENT_PROVIDERS,
} from './mini-website.constants';
import type { WebsiteRow } from './mini-website.projection';
import { MiniWebsitesRepository } from './mini-websites.repository';
import { TemplateAccessService } from '../billing/template-access.service';

const URL_KEYS = ['heroYoutubeUrl'];
const SOCIAL_PLATFORMS = new Set([
  'whatsapp',
  'viber',
  'telegram',
  'phone',
  'instagram',
  'facebook',
  'twitter',
  'tiktok',
  'youtube',
  'linkedin',
  'snapchat',
  'discord',
  'email',
  'website',
  'gps',
  'custom',
]);

/**
 * The image-bearing subset shared by a `defaults()` payload and a hydrated
 * website, so both can be scanned for uploaded-asset references.
 */
type ImageBearingWebsite = {
  avatar?: unknown;
  cover?: unknown;
  locations?: unknown;
  gallery?: unknown;
  services?: unknown;
  team?: unknown;
  certificates?: unknown;
  partners?: unknown;
  beforeAfter?: unknown;
  paymentMethods?: unknown;
  specialOffers?: unknown;
  events?: unknown;
  audio?: unknown;
  ownedProperties?: unknown;
  education?: unknown;
  experience?: unknown;
};

/** A social link after `defaults()` has filled in every field. */
type NormalizedSocialLink = {
  id: string;
  platform: string;
  url: string;
  value: string;
  countryCode: string;
  displayName: string;
  customColor: string;
  customIcon: string;
  enabled: boolean;
  order: number;
};

/**
 * The fully normalized payload `defaults()` produces. `validate()` and
 * `collectImageReferences()` both consume it, so naming it keeps those two in
 * step with the builder instead of falling back to `any`.
 */
type NormalizedMiniWebsite = {
  name: string;
  slug: string;
  headline: string;
  bio: string;
  avatar: string;
  cover: string | null;
  templateKey: MiniWebsiteVisualTemplateKey;
  variation: string;
  backgroundStyle: MiniWebsiteBackgroundStyle;
  professionTemplate: string;
  accentColor: string;
  status: string;
  primaryAction: string;
  whatsappNumber: string;
  pixelEvent: string;
  eventValue: number;
  sections: MiniWebsiteSection[];
  locations: MiniWebsiteLocation[];
  hours: MiniWebsiteWeekHours;
  gallery: MiniWebsiteGalleryImage[];
  faq: MiniWebsiteFaqEntry[];
  services: MiniWebsiteService[];
  bookings: MiniWebsiteBooking[];
  team: MiniWebsiteTeamMember[];
  certificates: MiniWebsiteCertificate[];
  videos: MiniWebsiteVideo[];
  youtubeVideos: MiniWebsiteYoutubeVideo[];
  stories: MiniWebsiteStory[];
  partners: MiniWebsitePartner[];
  reviews: MiniWebsiteReview[];
  beforeAfter: MiniWebsiteBeforeAfter[];
  coverage: MiniWebsiteCoverageItem[];
  paymentMethods: MiniWebsitePaymentMethod[];
  specialOffers: MiniWebsiteSpecialOffer[];
  events: MiniWebsiteEvent[];
  audio: MiniWebsiteAudio[];
  advantages: MiniWebsiteAdvantage[];
  impactStats: MiniWebsiteImpactStat[];
  processSteps: MiniWebsiteProcessStep[];
  documents: MiniWebsiteDocument[];
  ownedProperties: MiniWebsiteOwnedProperty[];
  education: MiniWebsiteEducation[];
  experience: MiniWebsiteExperience[];
  leadForm: MiniWebsiteLeadForm;
  plans: MiniWebsitePlan[];
  socialLinks: NormalizedSocialLink[];
  content: {
    heroBackgroundType: string;
    heroBackgroundColor: string;
    heroYoutubeUrl: string;
  };
};

/**
 * The shape `defaults()` accepts: a save DTO, or a previously hydrated website
 * merged with a partial update. Section collections stay `unknown` because each
 * one is run through its own `normalize*` guard.
 */
type MiniWebsiteInput = {
  name?: string;
  slug?: string;
  headline?: string | null;
  bio?: string | null;
  avatar?: string | null;
  cover?: string | null;
  templateKey?: string | null;
  variation?: string | null;
  backgroundStyle?: unknown;
  professionTemplate?: unknown;
  accentColor?: string | null;
  status?: string | null;
  primaryAction?: string | null;
  whatsappNumber?: string | null;
  pixelEvent?: string | null;
  eventValue?: number | string | null;
  content?: unknown;
  socialLinks?: unknown;
  sections?: unknown;
  location?: unknown;
  locations?: unknown;
  hours?: unknown;
  gallery?: unknown;
  faq?: unknown;
  services?: unknown;
  bookings?: unknown;
  team?: unknown;
  certificates?: unknown;
  videos?: unknown;
  youtubeVideos?: unknown;
  stories?: unknown;
  partners?: unknown;
  reviews?: unknown;
  beforeAfter?: unknown;
  coverage?: unknown;
  paymentMethods?: unknown;
  specialOffers?: unknown;
  events?: unknown;
  audio?: unknown;
  advantages?: unknown;
  impactStats?: unknown;
  processSteps?: unknown;
  documents?: unknown;
  ownedProperties?: unknown;
  education?: unknown;
  experience?: unknown;
  leadForm?: unknown;
  plans?: unknown;
};

function normalizeBackgroundStyle(value: unknown): MiniWebsiteBackgroundStyle {
  return (
    MINI_WEBSITE_BACKGROUND_STYLES.find((style) => style === value) ?? 'grid'
  );
}

/** A social link once `defaults()` has filled in every field. */
interface StoredSocialLink {
  id: string;
  platform: string;
  url: string;
  value: string;
  countryCode: string;
  displayName: string;
  customColor: string;
  customIcon: string;
  enabled: boolean;
}

/** The parts of a saved payload that live in child tables. */
interface StoredContent {
  sections: MiniWebsiteSection[];
  socialLinks: StoredSocialLink[];
  locations: MiniWebsiteLocation[];
  hours: MiniWebsiteWeekHours;
  gallery: MiniWebsiteGalleryImage[];
  faq: MiniWebsiteFaqEntry[];
  services: MiniWebsiteService[];
  bookings: MiniWebsiteBooking[];
  team: MiniWebsiteTeamMember[];
  certificates: MiniWebsiteCertificate[];
  videos: MiniWebsiteVideo[];
  youtubeVideos: MiniWebsiteYoutubeVideo[];
  stories: MiniWebsiteStory[];
  partners: MiniWebsitePartner[];
  reviews: MiniWebsiteReview[];
  beforeAfter: MiniWebsiteBeforeAfter[];
  coverage: MiniWebsiteCoverageItem[];
  paymentMethods: MiniWebsitePaymentMethod[];
  specialOffers: MiniWebsiteSpecialOffer[];
  events: MiniWebsiteEvent[];
  audio: MiniWebsiteAudio[];
  advantages: MiniWebsiteAdvantage[];
  impactStats: MiniWebsiteImpactStat[];
  processSteps: MiniWebsiteProcessStep[];
  documents: MiniWebsiteDocument[];
  ownedProperties: MiniWebsiteOwnedProperty[];
  education: MiniWebsiteEducation[];
  experience: MiniWebsiteExperience[];
  leadForm: MiniWebsiteLeadForm;
  plans: MiniWebsitePlan[];
}

/**
 * Section keys and location bounds are declared here rather than imported from
 * `@linktree/types`.
 *
 * That package is source-only (`main` points at `index.ts`) and re-exports with
 * extensionless specifiers, which Node cannot resolve as ESM at runtime. Every
 * other backend reference to it is therefore `import type`, which the compiler
 * erases. Importing a *value* would drag the barrel into the runtime graph and
 * crash the server on boot, so the types stay shared and these few constants
 * are mirrored.
 *
 * The mirrors are exported so `mini-website-shared-constants.spec.ts` can
 * assert they still match the shared package. A test runs under ts-jest in
 * CommonJS, where the value import resolves, so the duplication stays checked
 * rather than silently drifting.
 */
export const OFFERED_SECTION_KEYS: readonly MiniWebsiteSectionKey[] = [
  'socials',
  'stories',
  'whyChooseUs',
  'services',
  'process',
  'impactStats',
  'experience',
  'education',
  'team',
  'gallery',
  'beforeAfter',
  'shortVideos',
  'youtubeVideos',
  'credentials',
  'reviews',
  'partners',
  'ownedProperties',
  'offers',
  'booking',
  'events',
  'audio',
  'documents',
  'payments',
  'serviceAreas',
  'hours',
  'faq',
  'leadForm',
  'pricing',
  'location',
];
const MAX_GALLERY_IMAGES = 12;
const MAX_FAQ_ENTRIES = 20;
const MAX_SERVICES = 24;
const MAX_BOOKINGS = 12;
const MAX_TEAM_MEMBERS = 12;
const MAX_CERTIFICATES = 20;
const MAX_VIDEOS = 20;
const MAX_YOUTUBE_VIDEOS = 3;
const MAX_STORIES = 20;
const MAX_PARTNERS = 30;
const BOOKING_DURATION_MIN = 5;
const BOOKING_DURATION_MAX = 1_440;
const MAX_REVIEWS = 24;
const MAX_BEFORE_AFTER = 12;
const MAX_COVERAGE_ITEMS = 30;
const MAX_SPECIAL_OFFERS = 20;
const MAX_EVENTS = 20;
const MAX_AUDIO_ITEMS = 20;
const MAX_ADVANTAGES = 20;
const MAX_IMPACT_STATS = 20;
const MAX_PROCESS_STEPS = 20;
const MAX_DOCUMENTS = 24;
const MAX_OWNED_PROPERTIES = 20;
const MAX_EDUCATION_ENTRIES = 20;
const MAX_EXPERIENCE_ENTRIES = 20;
const MAX_RATING = 5;
const ACTION_TYPES: readonly MiniWebsiteActionType[] = [
  'none',
  'link',
  'whatsapp',
  'phone',
];
export const ITEM_PIXEL_EVENTS: readonly MiniWebsiteItemPixelEvent[] = [
  'None',
  'Contact',
  'Lead',
  'InitiateCheckout',
  'CompletePayment',
];
const BOOKING_PROVIDERS: readonly MiniWebsiteBookingProvider[] = [
  'calendly',
  'calcom',
  'google',
  'custom',
  'whatsapp',
];
const STORY_PLATFORMS: readonly MiniWebsiteStoryPlatform[] = [
  'instagram',
  'telegram',
  'facebook',
  'snapchat',
  'tiktok',
  'other',
];
const AUDIO_PLATFORMS: readonly MiniWebsiteAudioPlatform[] = [
  'direct',
  'spotify',
  'soundcloud',
  'apple',
  'youtube',
  'other',
];
const ADVANTAGE_ICONS: readonly MiniWebsiteAdvantageIcon[] = [
  'check',
  'shield',
  'clock',
  'award',
  'heart',
  'users',
  'sparkles',
  'leaf',
  'zap',
  'globe',
];
const OWNED_PROPERTY_TYPES: readonly MiniWebsiteOwnedPropertyType[] = [
  'brand',
  'company',
  'shop',
  'organization',
  'facebook',
  'instagram',
  'youtube',
  'website',
  'other',
];
const EDUCATION_STATUSES: readonly MiniWebsiteEducationStatus[] = [
  'studying',
  'graduated',
  'paused',
  'other',
];
const EXPERIENCE_STATUSES: readonly MiniWebsiteExperienceStatus[] = [
  'current',
  'completed',
];
const MAX_LEAD_FIELDS = MINI_WEBSITE_MAX_LEAD_FIELDS;
const MAX_LEAD_FIELD_OPTIONS = MINI_WEBSITE_MAX_LEAD_FIELD_OPTIONS;
const MAX_PLANS = MINI_WEBSITE_MAX_PLANS;
const MAX_PLAN_FEATURES = MINI_WEBSITE_MAX_PLAN_FEATURES;
const LOCATION_RADIUS_MIN = 100;
const LOCATION_RADIUS_MAX = 20_000;
const MAX_LOCATIONS = 12;
const DAY_KEYS: readonly MiniWebsiteDayKey[] = [
  'sat',
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
];
const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '18:00';
/** Weekday numbers as stored, matching `Date.prototype.getDay()`. */
const DAY_KEY_BY_INDEX: readonly MiniWebsiteDayKey[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];
const DAY_INDEX_BY_KEY: Record<MiniWebsiteDayKey, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Sections, links and branches read back in the shape the client already
 * speaks, so a page is still one round trip now that its content lives in
 * child tables. Correlated on `website.id`, so it drops into any query that
 * selects from `mini_websites AS website`.
 */
@Injectable()
export class MiniWebsitesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
    private readonly pageAnalytics: PublicPageAnalyticsService,
    private readonly templateAccess: TemplateAccessService,
    private readonly repository: MiniWebsitesRepository = new MiniWebsitesRepository(
      database,
    ),
  ) {}

  async list(businessId: string) {
    return this.hydrate(await this.repository.listForBusiness(businessId));
  }

  async get(id: string, businessId: string) {
    const row = await this.repository.findForBusiness(id, businessId);
    if (!row) throw new NotFoundException('Mini website not found');
    return this.hydrate([row])[0];
  }

  private slugify(text: string): string {
    return (
      text
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 99) || 'untitled'
    );
  }

  async create(data: SaveMiniWebsiteDto, businessId: string) {
    if (!data.name) throw new BadRequestException('Name is required');
    const safeSlug =
      data.slug && /^[a-z0-9-]+$/.test(data.slug)
        ? data.slug
        : this.slugify(data.name);
    const payload = this.defaults({ ...data, slug: safeSlug });
    this.validate(payload);
    await this.templateAccess.assertAllowed(businessId, payload.templateKey);
    await this.assertSlugAvailable(businessId, payload.slug);
    const created = await this.database.transaction(async (client) => {
      const result = await client.query<WebsiteRow>(
        `INSERT INTO mini_websites
          (business_id,name,slug,headline,bio,avatar,cover,hero_background_type,hero_background_color,hero_video_url,variation,background_style,accent_color,status,primary_action,whatsapp_number,pixel_event,event_value,profession_template,template_key,published_at)
         VALUES ($1,$2,$3,$4,$5,COALESCE(NULLIF($6,'/images/DefaultAvatar.png'),(SELECT default_avatar FROM business_branding WHERE business_id=$1),'/images/DefaultAvatar.png'),$7,$8,$9,$10,$11,$12,$13,$14::varchar,$15,$16,$17,$18,$19,$20,CASE WHEN $14::varchar='published' THEN now() ELSE NULL END)
         RETURNING *`,
        [
          businessId,
          payload.name,
          payload.slug,
          payload.headline,
          payload.bio,
          payload.avatar,
          payload.cover,
          payload.content.heroBackgroundType,
          payload.content.heroBackgroundColor,
          payload.content.heroYoutubeUrl,
          payload.variation,
          payload.backgroundStyle,
          payload.accentColor,
          payload.status,
          payload.primaryAction,
          payload.whatsappNumber,
          payload.pixelEvent,
          payload.eventValue,
          payload.professionTemplate,
          payload.templateKey,
        ],
      );
      const row = result.rows[0];
      await this.writeContent(client, String(row.id), payload);
      await client.query(
        `INSERT INTO mini_website_versions (mini_website_id,version,payload,published) VALUES ($1,1,$2::jsonb,$3)`,
        [row.id, JSON.stringify(payload), payload.status === 'published'],
      );
      return row;
    });
    await this.storage.claimBusinessAssets(businessId, payload);
    return this.get(created.id, businessId);
  }

  async update(id: string, data: SaveMiniWebsiteDto, businessId: string) {
    const current = await this.get(id, businessId);
    const definedData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
    const existingImages = new Set(this.collectImageReferences(current));
    const nextSlug =
      data.slug && /^[a-z0-9-]+$/.test(data.slug) ? data.slug : current.slug;
    const merged = this.defaults({
      ...current,
      ...definedData,
      slug: nextSlug,
      content: { ...current.content, ...(data.content || {}) },
      // Omitting either field leaves what is already stored untouched, so a
      // partial update cannot silently wipe a configured section or location.
      sections: data.sections ?? current.sections,
      locations: data.locations ?? current.locations,
      hours: data.hours ?? current.hours,
      gallery: data.gallery ?? current.gallery,
      faq: data.faq ?? current.faq,
      services: data.services ?? current.services,
      bookings: data.bookings ?? current.bookings,
      team: data.team ?? current.team,
      certificates: data.certificates ?? current.certificates,
      videos: data.videos ?? current.videos,
      youtubeVideos: data.youtubeVideos ?? current.youtubeVideos,
      stories: data.stories ?? current.stories,
      partners: data.partners ?? current.partners,
      reviews: data.reviews ?? current.reviews,
      beforeAfter: data.beforeAfter ?? current.beforeAfter,
      coverage: data.coverage ?? current.coverage,
      paymentMethods: data.paymentMethods ?? current.paymentMethods,
      specialOffers: data.specialOffers ?? current.specialOffers,
      events: data.events ?? current.events,
      audio: data.audio ?? current.audio,
      advantages: data.advantages ?? current.advantages,
      impactStats: data.impactStats ?? current.impactStats,
      processSteps: data.processSteps ?? current.processSteps,
      documents: data.documents ?? current.documents,
      ownedProperties: data.ownedProperties ?? current.ownedProperties,
      education: data.education ?? current.education,
      experience: data.experience ?? current.experience,
      leadForm: data.leadForm ?? current.leadForm,
      plans: data.plans ?? current.plans,
    });
    this.validate(merged, existingImages);
    await this.templateAccess.assertAllowed(businessId, merged.templateKey);
    if (merged.slug !== current.slug)
      await this.assertSlugAvailable(businessId, merged.slug, id);
    const nextVersion = Number(current.currentVersion || 1) + 1;
    await this.database.transaction(async (client) => {
      await client.query(
        `UPDATE mini_websites SET name=$1,slug=$2,headline=$3,bio=$4,
           avatar=COALESCE(NULLIF($5,'/images/DefaultAvatar.png'),(SELECT default_avatar FROM business_branding WHERE business_id=$20),'/images/DefaultAvatar.png'),cover=$6,
           hero_background_type=$7,hero_background_color=$8,hero_video_url=$9,variation=$10,background_style=$11,accent_color=$12,
           status=$13,primary_action=$14,whatsapp_number=$15,pixel_event=$16,event_value=$17,current_version=$18,
           profession_template=$21,template_key=$22,
           published_at=CASE WHEN $13::varchar='published' THEN COALESCE(published_at,now()) ELSE published_at END
         WHERE id=$19 AND business_id=$20`,
        [
          merged.name,
          merged.slug,
          merged.headline,
          merged.bio,
          merged.avatar,
          merged.cover,
          merged.content.heroBackgroundType,
          merged.content.heroBackgroundColor,
          merged.content.heroYoutubeUrl,
          merged.variation,
          merged.backgroundStyle,
          merged.accentColor,
          merged.status,
          merged.primaryAction,
          merged.whatsappNumber,
          merged.pixelEvent,
          merged.eventValue,
          nextVersion,
          id,
          businessId,
          merged.professionTemplate,
          merged.templateKey,
        ],
      );
      await this.writeContent(client, id, merged);
      await client.query(
        `INSERT INTO mini_website_versions (mini_website_id,version,payload,published) VALUES ($1,$2,$3::jsonb,$4)`,
        [
          id,
          nextVersion,
          JSON.stringify(merged),
          merged.status === 'published',
        ],
      );
    });
    await this.storage.claimBusinessAssets(businessId, merged);
    await this.storage.deleteUnreferencedFromValues(
      current.avatar,
      current.cover,
      current.content,
      // Place photos and gallery pictures live in their own rows, which the
      // sweep would not otherwise look at — leaving replaced images orphaned.
      current.locations,
      current.gallery,
      current.services,
      current.team,
      current.certificates,
      current.partners,
      current.beforeAfter,
      current.paymentMethods,
      current.specialOffers,
      current.events,
      current.audio,
      current.ownedProperties,
      current.education,
      current.experience,
    );
    return this.get(id, businessId);
  }

  async remove(id: string, businessId: string) {
    const current = await this.get(id, businessId);
    await this.database.transaction(async (client) => {
      await client.query(
        `INSERT INTO public_page_tombstones
           (business_id, page_type, public_identifier, slug, deleted_at)
         VALUES ($1, 'mini_website', $2, $2, now())
         ON CONFLICT (business_id, page_type, public_identifier)
         DO UPDATE SET slug=EXCLUDED.slug, deleted_at=EXCLUDED.deleted_at`,
        [businessId, current.slug],
      );
      await client.query(
        'DELETE FROM mini_websites WHERE id=$1 AND business_id=$2',
        [id, businessId],
      );
    });
    await this.storage.deleteUnreferencedFromValues(
      current.avatar,
      current.cover,
      current.content,
      // Place photos and gallery pictures live in their own rows, which the
      // sweep would not otherwise look at — leaving replaced images orphaned.
      current.locations,
      current.gallery,
      current.services,
      current.team,
      current.certificates,
      current.partners,
      current.beforeAfter,
      current.paymentMethods,
      current.specialOffers,
      current.events,
      current.audio,
      current.ownedProperties,
      current.education,
      current.experience,
    );
    return { success: true };
  }

  async analytics(id: string, businessId: string) {
    await this.get(id, businessId);
    const result = await this.database.query(
      `SELECT daily.day,
              daily.total_views AS views,
              daily.total_clicks AS actions,
              daily.conversions
       FROM analytics_page_daily daily
       JOIN public_pages page ON page.id=daily.public_page_id
       WHERE page.source_mini_website_id=$1 AND page.business_id=$2
       ORDER BY daily.day DESC LIMIT 365`,
      [id, businessId],
    );
    return result.rows;
  }

  async clearAnalytics(id: string, businessId: string) {
    await this.get(id, businessId);
    await this.database.transaction(async (client) => {
      const page = await client.query<{ id: string }>(
        `SELECT id FROM public_pages
         WHERE source_mini_website_id=$1 AND business_id=$2`,
        [id, businessId],
      );
      if (!page.rows[0]) return;
      await client.query(
        'DELETE FROM analytics_events WHERE public_page_id=$1 AND business_id=$2',
        [page.rows[0].id, businessId],
      );
      await client.query(
        'DELETE FROM analytics_page_daily WHERE public_page_id=$1 AND business_id=$2',
        [page.rows[0].id, businessId],
      );
      await client.query(
        'DELETE FROM analytics_action_daily WHERE public_page_id=$1 AND business_id=$2',
        [page.rows[0].id, businessId],
      );
    });
    return { success: true };
  }

  async listBySubdomain(subdomain: string) {
    return this.repository.listForSubdomain(subdomain);
  }

  async getPublic(subdomain: string, slug: string) {
    const row = await this.repository.findPublished(subdomain, slug);
    if (!row) {
      const tombstone = await this.database.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1
           FROM public_page_tombstones tombstone
           JOIN businesses business ON business.id=tombstone.business_id
           WHERE tombstone.page_type='mini_website'
             AND tombstone.public_identifier=$1
             AND lower(business.subdomain)=lower($2)
         ) AS exists`,
        [slug, subdomain],
      );
      if (tombstone.rows[0]?.exists) {
        throw new GoneException('Mini website permanently removed');
      }
      throw new NotFoundException('Mini website not found');
    }
    const website = this.hydrate([row])[0];
    const allowedTemplates = await this.templateAccess.getEffectiveKeys(
      website.businessId,
    );
    website.templateKey = allowedTemplates.includes(website.templateKey)
      ? website.templateKey
      : MINI_WEBSITE_VISUAL_TEMPLATE_DEFAULT;
    return {
      ...website,
      // Same resolver the public linktree read uses, so the two surfaces that
      // are allowed a pixel cannot drift on how they decide it. See
      // docs/tracking.md.
      analytics: await this.pageAnalytics.forSource('mini_website', website.id),
    };
  }

  /**
   * Replaces a page's content rows with what was just saved.
   *
   * Opening times are the page's own, so they are written once here rather than
   * once per branch.
   *
   * Rewritten wholesale rather than diffed: the lists are short, order is part
   * of the meaning, and a delete-then-insert cannot leave a stale row behind.
   * Social links keep their `link_key`, so anything keyed to a link — the
   * editor's own ids, the page's action keys — survives the rewrite even though
   * the row is new. Branch rows cascade, so their hours go with them.
   */
  private async writeContent(
    client: PoolClient,
    websiteId: string,
    payload: StoredContent,
  ) {
    await client.query(
      'DELETE FROM mini_website_sections WHERE mini_website_id=$1',
      [websiteId],
    );
    if (payload.sections.length) {
      const values: unknown[] = [websiteId];
      const rows = payload.sections.map((section, index) => {
        values.push(section.key, section.enabled, index);
        return `($1,$${values.length - 2},$${values.length - 1},$${values.length})`;
      });
      await client.query(
        `INSERT INTO mini_website_sections (mini_website_id,section_key,enabled,position)
         VALUES ${rows.join(',')}`,
        values,
      );
    }

    await client.query(
      'DELETE FROM mini_website_social_links WHERE mini_website_id=$1',
      [websiteId],
    );
    if (payload.socialLinks.length) {
      const values: unknown[] = [websiteId];
      const rows = payload.socialLinks.map((link, index) => {
        values.push(
          link.id,
          link.platform,
          link.url,
          link.value,
          link.countryCode,
          link.displayName,
          link.customColor,
          link.customIcon,
          link.enabled !== false,
          index,
        );
        const first = values.length - 9;
        return `($1,${Array.from({ length: 10 }, (_, offset) => `$${first + offset}`).join(',')})`;
      });
      await client.query(
        `INSERT INTO mini_website_social_links
           (mini_website_id,link_key,platform,url,value,country_code,display_name,custom_color,custom_icon,enabled,position)
         VALUES ${rows.join(',')}`,
        values,
      );
    }

    // Hours cascade with their branch, so this one delete clears both.
    await client.query(
      'DELETE FROM mini_website_locations WHERE mini_website_id=$1',
      [websiteId],
    );
    for (const [index, location] of payload.locations.entries()) {
      await client.query(
        `INSERT INTO mini_website_locations
           (mini_website_id,position,name,phone,phone_country_code,address,area,city,lat,lng,precision,radius_meters,zoom,map_url,image)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          websiteId,
          index,
          location.name,
          location.phone,
          location.phoneCountryCode,
          location.address,
          location.area,
          location.city,
          location.lat,
          location.lng,
          location.precision,
          location.radiusMeters,
          location.zoom,
          location.mapUrl,
          location.image,
        ],
      );
    }

    await client.query(
      'DELETE FROM mini_website_hours WHERE mini_website_id=$1',
      [websiteId],
    );
    const week = this.normalizeWeekHours(payload.hours);
    const hourValues: unknown[] = [websiteId];
    const hourRows = week.map((entry) => {
      hourValues.push(
        DAY_INDEX_BY_KEY[entry.day],
        entry.closed,
        entry.open,
        entry.close,
      );
      const first = hourValues.length - 3;
      return `($1,$${first},$${first + 1},$${first + 2},$${first + 3})`;
    });
    await client.query(
      `INSERT INTO mini_website_hours (mini_website_id,day,closed,open_time,close_time)
       VALUES ${hourRows.join(',')}`,
      hourValues,
    );

    await this.writeItems(
      client,
      websiteId,
      'gallery',
      payload.gallery.map((image) => ({
        key: image.id,
        title: image.caption,
        image: image.image,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'faq',
      payload.faq.map((entry) => ({
        key: entry.id,
        title: entry.question,
        subtitle: entry.answer,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'services',
      payload.services.map((service) => ({
        key: service.id,
        title: service.title,
        subtitle: service.description,
        image: service.image,
        price: service.price,
        url: service.url,
        actionLabel: service.actionLabel,
        actionType: service.actionType,
        actionValue: service.actionValue,
        actionCountryCode: service.actionCountryCode,
        pixelEvent: service.pixelEvent,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'booking',
      payload.bookings.map((booking) => ({
        key: booking.id,
        title: booking.title,
        subtitle: booking.description,
        price: booking.price,
        url: booking.url,
        actionLabel: booking.actionLabel,
        actionType: booking.provider === 'whatsapp' ? 'whatsapp' : 'link',
        actionValue: booking.actionValue,
        actionCountryCode: booking.actionCountryCode,
        provider: booking.provider,
        durationMinutes: booking.durationMinutes,
        pixelEvent: 'Lead',
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'team',
      payload.team.map((member) => ({
        key: member.id,
        title: member.name,
        subtitle: member.bio,
        role: member.role,
        experience: member.experience,
        image: member.image,
        url: member.url,
        actionLabel: member.actionLabel,
        actionType: member.actionType,
        actionValue: member.actionValue,
        actionCountryCode: member.actionCountryCode,
        pixelEvent: member.actionType === 'none' ? 'None' : 'Contact',
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'credentials',
      payload.certificates.map((certificate) => ({
        key: certificate.id,
        title: certificate.title,
        subtitle: certificate.description,
        issuer: certificate.issuer,
        yearLabel: certificate.year,
        image: certificate.image,
        url: certificate.verificationUrl,
        actionType: certificate.verificationUrl ? 'link' : 'none',
        actionValue: certificate.verificationUrl,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'shortVideos',
      payload.videos.map((video) => ({
        key: video.id,
        title: video.title,
        mediaPlatform: video.platform,
        url: video.url,
        actionType: 'link',
        actionValue: video.url,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'youtubeVideos',
      payload.youtubeVideos.map((video) => ({
        key: video.id,
        title: video.title,
        mediaPlatform: 'youtube',
        url: video.url,
        actionType: 'link',
        actionValue: video.url,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'stories',
      payload.stories.map((story) => ({
        key: story.id,
        title: story.title,
        statusLabel: story.mediaType,
        mediaPlatform: story.platform,
        image: story.image,
        url: story.url,
        actionType: story.url ? 'link' : 'none',
        actionValue: story.url,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'partners',
      payload.partners.map((partner) => ({
        key: partner.id,
        title: partner.name,
        image: partner.image,
        url: partner.url,
        actionType: partner.url ? 'link' : 'none',
        actionValue: partner.url,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'reviews',
      payload.reviews.map((review) => ({
        key: review.id,
        title: review.author,
        subtitle: review.text,
        image: review.image,
        rating: review.rating,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'beforeAfter',
      payload.beforeAfter.map((comparison) => ({
        key: comparison.id,
        title: comparison.title,
        subtitle: comparison.description,
        role: comparison.beforeLabel,
        experience: comparison.afterLabel,
        image: comparison.beforeImage,
        secondaryImage: comparison.afterImage,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'serviceAreas',
      payload.coverage.map((item) => ({
        key: item.id,
        title: item.name,
        subtitle: item.detail,
        role: item.kind,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'payments',
      payload.paymentMethods.map((method) => ({
        key: method.id,
        title: method.name,
        subtitle: method.instructions,
        role: method.provider,
        issuer: method.accountName,
        experience: method.accountNumber,
        image: method.image,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'offers',
      payload.specialOffers.map((offer) => ({
        key: offer.id,
        title: offer.title,
        subtitle: offer.description,
        experience: offer.originalPrice,
        price: offer.offerPrice,
        issuer: offer.couponCode,
        yearLabel: offer.expiresAt,
        image: offer.image,
        url: offer.url,
        actionType: offer.url ? 'link' : 'none',
        actionValue: offer.url,
        pixelEvent: offer.url ? 'InitiateCheckout' : 'None',
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'events',
      payload.events.map((event) => ({
        key: event.id,
        title: event.title,
        subtitle: event.description,
        yearLabel: event.startsAt,
        role: event.location,
        image: event.image,
        url: event.registrationUrl,
        actionType: event.registrationUrl ? 'link' : 'none',
        actionValue: event.registrationUrl,
        pixelEvent: event.registrationUrl ? 'Lead' : 'None',
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'audio',
      payload.audio.map((audio) => ({
        key: audio.id,
        title: audio.title,
        subtitle: audio.description,
        role: audio.platform,
        image: audio.image,
        url: audio.url,
        actionType: 'link',
        actionValue: audio.url,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'whyChooseUs',
      payload.advantages.map((advantage) => ({
        key: advantage.id,
        title: advantage.title,
        subtitle: advantage.description,
        role: advantage.icon,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'impactStats',
      payload.impactStats.map((item) => ({
        key: item.id,
        title: item.label,
        price: item.value,
        actionLabel: item.suffix,
        role: item.icon,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'process',
      payload.processSteps.map((step) => ({
        key: step.id,
        title: step.title,
        subtitle: step.description,
        role: step.icon,
        actionLabel: step.actionLabel,
        url: step.actionUrl,
        actionType: step.actionUrl ? 'link' : 'none',
        actionValue: step.actionUrl,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'documents',
      payload.documents.map((document) => ({
        key: document.id,
        title: document.title,
        subtitle: document.description,
        role: document.fileType,
        experience: document.fileSize,
        url: document.fileUrl,
        actionType: 'link',
        actionValue: document.fileUrl,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'ownedProperties',
      payload.ownedProperties.map((property) => ({
        key: property.id,
        title: property.name,
        subtitle: property.description,
        role: property.relationship,
        issuer: property.propertyType,
        experience: property.featuredUrl,
        yearLabel: property.foundedYear,
        image: property.image,
        url: property.url,
        actionType: 'link',
        actionValue: property.url,
        pixelEvent: 'Contact',
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'education',
      payload.education.map((entry) => ({
        key: entry.id,
        title: entry.institution,
        subtitle: entry.description,
        role: entry.degree,
        experience: entry.fieldOfStudy,
        issuer: entry.location,
        price: entry.startYear,
        yearLabel: entry.endYear,
        statusLabel: entry.status,
        actionLabel: entry.grade,
        image: entry.image,
        url: entry.verificationUrl,
        actionType: entry.verificationUrl ? 'link' : 'none',
        actionValue: entry.verificationUrl,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'experience',
      payload.experience.map((entry) => ({
        key: entry.id,
        title: entry.title,
        subtitle: entry.description,
        role: entry.organization,
        experience: entry.employmentType,
        issuer: entry.location,
        price: entry.startDate,
        yearLabel: entry.endDate,
        statusLabel: entry.status,
        image: entry.image,
        url: entry.verificationUrl,
        actionType: entry.verificationUrl ? 'link' : 'none',
        actionValue: entry.verificationUrl,
      })),
    );
    await this.writeItems(
      client,
      websiteId,
      'leadForm',
      payload.leadForm.fields.map((field) => ({
        key: field.id,
        title: field.label,
        subtitle: field.helpText,
        role: field.type,
        issuer: field.mapping,
        actionLabel: field.placeholder,
        required: field.required,
        options: field.options,
      })),
    );
    // Upserted rather than rewritten: the settings are one row that belongs to
    // the page for as long as the page exists, and a delete-then-insert would
    // churn its primary key on every save for no gain.
    await client.query(
      `INSERT INTO mini_website_lead_forms
         (mini_website_id,title,description,submit_label,success_message,consent_text,consent_required)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (mini_website_id) DO UPDATE SET
         title=EXCLUDED.title,
         description=EXCLUDED.description,
         submit_label=EXCLUDED.submit_label,
         success_message=EXCLUDED.success_message,
         consent_text=EXCLUDED.consent_text,
         consent_required=EXCLUDED.consent_required`,
      [
        websiteId,
        payload.leadForm.title,
        payload.leadForm.description,
        payload.leadForm.submitLabel,
        payload.leadForm.successMessage,
        payload.leadForm.consentText,
        payload.leadForm.consentRequired,
      ],
    );
    await this.writeItems(
      client,
      websiteId,
      'pricing',
      payload.plans.map((plan) => ({
        key: plan.id,
        title: plan.name,
        subtitle: plan.description,
        price: plan.price,
        experience: plan.period,
        featured: plan.featured,
        options: plan.features,
        url: plan.url,
        actionLabel: plan.actionLabel,
        actionType: plan.actionType,
        actionValue: plan.actionValue,
        actionCountryCode: plan.actionCountryCode,
        pixelEvent: plan.pixelEvent,
      })),
    );
    await this.writeActions(client, websiteId, payload);
  }

  /**
   * Registers every clickable thing on the page as an analytics action.
   *
   * A linktree gets this from a database trigger, one row per link. A mini
   * website has no such shape, so the set is rebuilt here from what was just
   * saved — in the same transaction, so a page can never be published with a
   * button that reports to an action row that does not exist.
   *
   * Rows are archived rather than deleted, then revived by the upsert. The ids
   * are what `analytics_events` and `analytics_action_daily` point at, so
   * deleting a row a business briefly removed would take its history with it.
   */
  private async writeActions(
    client: PoolClient,
    websiteId: string,
    payload: StoredContent,
  ) {
    const page = await client.query<{ id: string }>(
      'SELECT id FROM public_pages WHERE source_mini_website_id=$1',
      [websiteId],
    );
    const pageId = page.rows[0]?.id;
    // A trigger on `mini_websites` creates the page row, and it has already run
    // inside this transaction by the time content is written — so this is only
    // reached if that sync was removed, in which case there is nothing to hang
    // actions on and skipping beats failing the save.
    if (!pageId) return;

    await client.query(
      `UPDATE public_page_actions SET status='archived',updated_at=now()
       WHERE public_page_id=$1 AND action_key LIKE 'mini:%'`,
      [pageId],
    );

    const actions = buildMiniWebsiteActions(payload);
    if (!actions.length) return;
    const values: unknown[] = [pageId];
    const rows = actions.map((action) => {
      values.push(
        action.actionKey,
        action.actionType,
        action.label,
        action.destination,
        action.tiktokEvent,
        action.displayOrder,
        JSON.stringify(action.metadata),
      );
      const first = values.length - 6;
      return (
        `($1,$${first},$${first + 1},$${first + 2},$${first + 3},` +
        `$${first + 4},$${first + 5},$${first + 6}::jsonb,'active')`
      );
    });
    await client.query(
      `INSERT INTO public_page_actions
         (public_page_id,action_key,action_type,label,destination,tiktok_event,
          display_order,metadata,status)
       VALUES ${rows.join(',')}
       ON CONFLICT (public_page_id,action_key) DO UPDATE SET
         action_type=EXCLUDED.action_type,
         label=EXCLUDED.label,
         destination=EXCLUDED.destination,
         tiktok_event=EXCLUDED.tiktok_event,
         display_order=EXCLUDED.display_order,
         metadata=EXCLUDED.metadata,
         status='active',
         updated_at=now()`,
      values,
    );
  }

  /**
   * Rewrites one section's rows in the shared item table.
   *
   * The delete is scoped to the section being written rather than clearing the
   * page's items wholesale, so sections cannot wipe each other out as more of
   * them move onto this table. Position comes from the order it was given in,
   * which is the order the page shows.
   */
  private async writeItems(
    client: PoolClient,
    websiteId: string,
    sectionKey: string,
    items: Array<{
      key: string;
      title?: string;
      subtitle?: string;
      role?: string;
      experience?: string;
      issuer?: string;
      yearLabel?: string;
      statusLabel?: string;
      mediaPlatform?: string;
      image?: string;
      secondaryImage?: string;
      price?: string;
      url?: string;
      actionLabel?: string;
      actionType?: string;
      actionValue?: string;
      actionCountryCode?: string;
      provider?: string;
      durationMinutes?: number;
      pixelEvent?: string;
      rating?: number;
      required?: boolean;
      featured?: boolean;
      options?: string[];
    }>,
  ) {
    await client.query(
      'DELETE FROM mini_website_items WHERE mini_website_id=$1 AND section_key=$2',
      [websiteId, sectionKey],
    );
    if (!items.length) return;
    const values: unknown[] = [websiteId, sectionKey];
    const rows = items.map((item, index) => {
      values.push(
        item.key,
        item.title ?? '',
        item.subtitle ?? '',
        item.role ?? '',
        item.experience ?? '',
        item.issuer ?? '',
        item.yearLabel ?? '',
        item.statusLabel ?? '',
        item.mediaPlatform ?? 'other',
        item.image ?? '',
        item.secondaryImage ?? '',
        item.price ?? '',
        item.url ?? '',
        item.actionLabel ?? '',
        item.actionType ?? 'none',
        item.actionValue ?? '',
        item.actionCountryCode ?? '964',
        item.provider ?? 'custom',
        item.durationMinutes ?? 30,
        item.pixelEvent ?? 'None',
        item.rating ?? 0,
        item.required ?? false,
        item.featured ?? false,
        item.options ?? [],
        index,
      );
      const first = values.length - 24;
      const placeholders = Array.from(
        { length: 25 },
        (_, offset) => `$${first + offset}`,
      ).join(',');
      return `($1,$2,${placeholders})`;
    });
    await client.query(
      `INSERT INTO mini_website_items
         (mini_website_id,section_key,item_key,title,subtitle,role,experience,issuer,year_label,
          status_label,media_platform,image,secondary_image,price,url,action_label,
          action_type,action_value,action_country_code,provider,duration_minutes,
          pixel_event,rating,required,featured,options,position)
       VALUES ${rows.join(',')}`,
      values,
    );
  }

  private hydrate(rows: WebsiteRow[]) {
    if (!rows.length) return [];
    return rows.map((row) => {
      const content = {
        heroBackgroundType:
          row.hero_background_type || (row.cover ? 'image' : 'color'),
        heroBackgroundColor: row.hero_background_color || '#000000',
        heroYoutubeUrl: row.hero_video_url || '',
        showShareTools: true,
        showViewCount: true,
      };
      return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        slug: row.slug,
        headline: row.headline,
        bio: row.bio,
        avatar:
          !row.avatar || row.avatar === '/images/DefaultAvatar.png'
            ? row.business_default_avatar || '/images/DefaultAvatar.png'
            : row.avatar,
        cover: row.cover,
        templateKey: row.template_key || MINI_WEBSITE_VISUAL_TEMPLATE_DEFAULT,
        variation: row.variation,
        backgroundStyle: normalizeBackgroundStyle(row.background_style),
        professionTemplate: row.profession_template || 'custom',
        accentColor: row.accent_color,
        businessWebsiteColor: row.business_website_color || null,
        status: row.status,
        primaryAction: row.primary_action,
        whatsappNumber: row.whatsapp_number,
        pixelEvent: row.pixel_event,
        eventValue: Number(row.event_value),
        socialLinks: Array.isArray(row.social_links) ? row.social_links : [],
        sections: this.normalizeSections(row.sections),
        locations: this.normalizeLocations(row.locations, row.location),
        hours: this.normalizeWeekHours(row.hours),
        gallery: this.normalizeGallery(row.gallery),
        faq: this.normalizeFaq(row.faq),
        services: this.normalizeServices(row.services),
        bookings: this.normalizeBookings(row.bookings),
        team: this.normalizeTeam(row.team),
        certificates: this.normalizeCertificates(row.certificates),
        videos: this.normalizeVideos(row.videos),
        youtubeVideos: this.normalizeYoutubeVideos(row.youtube_videos),
        stories: this.normalizeStories(row.stories),
        partners: this.normalizePartners(row.partners),
        reviews: this.normalizeReviews(row.reviews),
        beforeAfter: this.normalizeBeforeAfter(row.before_after),
        coverage: this.normalizeCoverage(row.coverage),
        paymentMethods: this.normalizePaymentMethods(row.payment_methods),
        specialOffers: this.normalizeSpecialOffers(row.special_offers),
        events: this.normalizeEvents(row.events),
        audio: this.normalizeAudio(row.audio),
        advantages: this.normalizeAdvantages(row.advantages),
        impactStats: this.normalizeImpactStats(row.impact_stats),
        processSteps: this.normalizeProcessSteps(row.process_steps),
        documents: this.normalizeDocuments(row.documents),
        ownedProperties: this.normalizeOwnedProperties(row.owned_properties),
        education: this.normalizeEducation(row.education),
        experience: this.normalizeExperience(row.experience),
        // Settings and questions are stored apart — one row per page, one row
        // per question — and are put back together here so a client still
        // receives the single form object it edits.
        leadForm: this.readLeadForm(row.lead_form, row.lead_fields),
        plans: this.normalizePlans(row.plans),
        content,
        views: Number(row.views || 0),
        actions: Number(row.actions || 0),
        conversions: Number(row.conversions || 0),
        currentVersion: row.current_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        publishedAt: row.published_at,
      };
    });
  }

  /**
   * Keeps only sections we know about, de-duplicated. Anything unrecognised is
   * dropped rather than stored, so the renderer never receives a key it has no
   * component for.
   */
  private normalizeSections(value: unknown): MiniWebsiteSection[] {
    const enabled = new Map<MiniWebsiteSectionKey, boolean>();
    for (const entry of toRecordArray(value)) {
      const key = toText(entry.key);
      if (!OFFERED_SECTION_KEYS.includes(key as MiniWebsiteSectionKey))
        continue;
      if (!enabled.has(key as MiniWebsiteSectionKey))
        enabled.set(key as MiniWebsiteSectionKey, entry.enabled !== false);
    }
    return OFFERED_SECTION_KEYS.flatMap((key) =>
      enabled.has(key) ? [{ key, enabled: enabled.get(key) !== false }] : [],
    );
  }

  /**
   * Clamps location into a storable shape. Coordinates outside the real world
   * are discarded rather than clamped — a bad pair means the client sent
   * something wrong, and silently moving the pin would be worse than dropping it.
   */
  private normalizeLocation(value: unknown): MiniWebsiteLocation {
    const source = (value && typeof value === 'object' ? value : {}) as Record<
      string,
      unknown
    >;
    const lat = Number(source.lat);
    const lng = Number(source.lng);
    const hasCoordinates =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180;
    const radius = Number(source.radiusMeters);
    const zoom = Number(source.zoom);
    return {
      address: toText(source.address).trim().slice(0, 300),
      area: toText(source.area).trim().slice(0, 120),
      city: toText(source.city).trim().slice(0, 120),
      lat: hasCoordinates ? lat : null,
      lng: hasCoordinates ? lng : null,
      precision: source.precision === 'approximate' ? 'approximate' : 'exact',
      radiusMeters: Number.isFinite(radius)
        ? Math.min(
            LOCATION_RADIUS_MAX,
            Math.max(LOCATION_RADIUS_MIN, Math.round(radius)),
          )
        : 500,
      zoom: Number.isFinite(zoom) ? Math.min(20, Math.max(1, zoom)) : 14,
      mapUrl: toText(source.mapUrl).trim().slice(0, 2048),
      image: toText(source.image).trim().slice(0, 2048),
      name: toText(source.name).trim().slice(0, 120),
      // Digits only, matching how social links store a number and its code.
      phone: toText(source.phone).replace(/\D/g, '').slice(0, 20),
      phoneCountryCode:
        toText(source.phoneCountryCode, '964').replace(/\D/g, '').slice(0, 4) ||
        '964',
    };
  }

  /**
   * Clamps the gallery into a storable list.
   *
   * An entry without a picture is dropped rather than stored: a caption with no
   * photo has nothing to render. Keys are de-duplicated so two rows cannot claim
   * the same one, which the unique index would reject anyway.
   */
  private normalizeGallery(value: unknown): MiniWebsiteGalleryImage[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const images: MiniWebsiteGalleryImage[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const image = toText(source.image).trim().slice(0, 2048);
      if (!image) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `gallery-${images.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      images.push({
        id,
        image,
        caption: toText(source.caption).trim().slice(0, 240),
      });
      if (images.length === MAX_GALLERY_IMAGES) break;
    }
    return images;
  }

  /**
   * Turns a button's description into the address it opens.
   *
   * The client never sends a URL for an offer — it says "whatsapp" and a number
   * — so a destination the product does not support cannot be stored at all,
   * and `javascript:` or `data:` never has to be filtered out after the fact.
   * An address that does not parse yields an empty string, which hides the
   * button rather than publishing a dead one.
   */
  private buildActionUrl(
    type: MiniWebsiteActionType,
    value: string,
    countryCode: string,
  ): string {
    if (type === 'none' || !value) return '';
    if (type === 'link') return this.isHttpUrl(value) ? value : '';
    const digits = value.replace(/^0+/, '');
    if (!digits) return '';
    const full = `${countryCode}${digits}`;
    return type === 'whatsapp' ? `https://wa.me/${full}` : `tel:+${full}`;
  }

  /**
   * Clamps the reviews list into a storable shape.
   *
   * A review needs a name and something said; a star count on its own is not a
   * review. The rating is clamped rather than rejected, so a client that sends
   * a seven cannot publish a scale nobody else uses.
   */
  private normalizeReviews(value: unknown): MiniWebsiteReview[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const reviews: MiniWebsiteReview[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const author = toText(source.author).trim().slice(0, 240);
      const text = toText(source.text).trim().slice(0, 2000);
      if (!author || !text) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `review-${reviews.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rating = Number(source.rating);
      reviews.push({
        id,
        author,
        text,
        image: toText(source.image).trim().slice(0, 2048),
        rating: Number.isFinite(rating)
          ? Math.min(MAX_RATING, Math.max(1, Math.round(rating)))
          : MAX_RATING,
      });
      if (reviews.length === MAX_REVIEWS) break;
    }
    return reviews;
  }

  private normalizeBeforeAfter(value: unknown): MiniWebsiteBeforeAfter[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const comparisons: MiniWebsiteBeforeAfter[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      const beforeImage = toText(source.beforeImage).trim().slice(0, 2048);
      const afterImage = toText(source.afterImage).trim().slice(0, 2048);
      if (!title || !beforeImage || !afterImage) continue;
      const id =
        toText(source.id).trim().slice(0, 120) ||
        `comparison-${comparisons.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      comparisons.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 2000),
        beforeImage,
        afterImage,
        beforeLabel:
          toText(source.beforeLabel, 'Before').trim().slice(0, 80) || 'Before',
        afterLabel:
          toText(source.afterLabel, 'After').trim().slice(0, 80) || 'After',
      });
      if (comparisons.length === MAX_BEFORE_AFTER) break;
    }
    return comparisons;
  }

  private normalizeCoverage(value: unknown): MiniWebsiteCoverageItem[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const coverage: MiniWebsiteCoverageItem[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const name = toText(source.name).trim().slice(0, 240);
      if (!name) continue;
      const rawKind = toText(source.kind);
      if (rawKind !== 'language') continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `coverage-${coverage.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      coverage.push({
        id,
        kind: rawKind,
        name,
        detail: toText(source.detail).trim().slice(0, 500),
      });
      if (coverage.length === MAX_COVERAGE_ITEMS) break;
    }
    return coverage;
  }

  private normalizePaymentMethods(value: unknown): MiniWebsitePaymentMethod[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const methods: MiniWebsitePaymentMethod[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const rawProvider = toText(source.provider, 'custom');
      const provider = MINI_WEBSITE_PAYMENT_PROVIDERS.includes(
        rawProvider as MiniWebsitePaymentProvider,
      )
        ? (rawProvider as MiniWebsitePaymentProvider)
        : 'custom';
      const name = toText(source.name).trim().slice(0, 240);
      if (!name) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `payment-${methods.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      methods.push({
        id,
        provider,
        name,
        accountName: toText(source.accountName).trim().slice(0, 160),
        accountNumber: toText(source.accountNumber).trim().slice(0, 160),
        instructions: toText(source.instructions).trim().slice(0, 2000),
        image: toText(source.image).trim().slice(0, 2048),
      });
      if (methods.length === MINI_WEBSITE_MAX_PAYMENT_METHODS) break;
    }
    return methods;
  }

  private normalizeSpecialOffers(value: unknown): MiniWebsiteSpecialOffer[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const offers: MiniWebsiteSpecialOffer[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      if (!title) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `offer-${offers.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const url = toText(source.url).trim().slice(0, 2048);
      const expiresAt = toText(source.expiresAt).trim();
      offers.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 2000),
        originalPrice: toText(source.originalPrice).trim().slice(0, 80),
        offerPrice: toText(source.offerPrice).trim().slice(0, 80),
        couponCode: toText(source.couponCode).trim().slice(0, 80),
        expiresAt: /^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ? expiresAt : '',
        image: toText(source.image).trim().slice(0, 2048),
        url: this.isHttpUrl(url) ? url : '',
      });
      if (offers.length === MAX_SPECIAL_OFFERS) break;
    }
    return offers;
  }

  private normalizeEvents(value: unknown): MiniWebsiteEvent[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const events: MiniWebsiteEvent[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      const startsAt = toText(source.startsAt).trim();
      if (!title || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt)) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `event-${events.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const registrationUrl = toText(source.registrationUrl)
        .trim()
        .slice(0, 2048);
      events.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 2000),
        startsAt,
        location: toText(source.location).trim().slice(0, 240),
        image: toText(source.image).trim().slice(0, 2048),
        registrationUrl: this.isHttpUrl(registrationUrl) ? registrationUrl : '',
      });
      if (events.length === MAX_EVENTS) break;
    }
    return events;
  }

  private normalizeAudio(value: unknown): MiniWebsiteAudio[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const audio: MiniWebsiteAudio[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      const url = toText(source.url).trim().slice(0, 2048);
      if (!title || !this.isHttpUrl(url)) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `audio-${audio.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawPlatform = toText(source.platform, 'direct');
      audio.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 2000),
        platform: AUDIO_PLATFORMS.includes(
          rawPlatform as MiniWebsiteAudioPlatform,
        )
          ? (rawPlatform as MiniWebsiteAudioPlatform)
          : 'other',
        url,
        image: toText(source.image).trim().slice(0, 2048),
      });
      if (audio.length === MAX_AUDIO_ITEMS) break;
    }
    return audio;
  }

  private normalizeAdvantages(value: unknown): MiniWebsiteAdvantage[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const advantages: MiniWebsiteAdvantage[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      if (!title) continue;
      const id =
        toText(source.id).trim().slice(0, 120) ||
        `advantage-${advantages.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawIcon = toText(source.icon, 'check');
      advantages.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 1000),
        icon: ADVANTAGE_ICONS.includes(rawIcon as MiniWebsiteAdvantageIcon)
          ? (rawIcon as MiniWebsiteAdvantageIcon)
          : 'check',
      });
      if (advantages.length === MAX_ADVANTAGES) break;
    }
    return advantages;
  }

  private normalizeImpactStats(value: unknown): MiniWebsiteImpactStat[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const stats: MiniWebsiteImpactStat[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const valueText = toText(source.value).trim().slice(0, 40);
      const label = toText(source.label).trim().slice(0, 160);
      if (!valueText || !label) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `impact-stat-${stats.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawIcon = toText(source.icon, 'award');
      stats.push({
        id,
        value: valueText,
        label,
        suffix: toText(source.suffix).trim().slice(0, 40),
        icon: ADVANTAGE_ICONS.includes(rawIcon as MiniWebsiteAdvantageIcon)
          ? (rawIcon as MiniWebsiteAdvantageIcon)
          : 'award',
      });
      if (stats.length === MAX_IMPACT_STATS) break;
    }
    return stats;
  }

  private normalizeProcessSteps(value: unknown): MiniWebsiteProcessStep[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const steps: MiniWebsiteProcessStep[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 160);
      if (!title) continue;
      const id =
        toText(source.id).trim().slice(0, 120) ||
        `process-step-${steps.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawIcon = toText(source.icon, 'check');
      const actionUrl = toText(source.actionUrl).trim().slice(0, 2048);
      steps.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 1000),
        icon: ADVANTAGE_ICONS.includes(rawIcon as MiniWebsiteAdvantageIcon)
          ? (rawIcon as MiniWebsiteAdvantageIcon)
          : 'check',
        actionLabel: toText(source.actionLabel).trim().slice(0, 120),
        actionUrl: this.isHttpUrl(actionUrl) ? actionUrl : '',
      });
      if (steps.length === MAX_PROCESS_STEPS) break;
    }
    return steps;
  }

  private normalizeDocuments(value: unknown): MiniWebsiteDocument[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const documents: MiniWebsiteDocument[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      const fileUrl = toText(source.fileUrl).trim().slice(0, 2048);
      if (!title || !this.isHttpUrl(fileUrl)) continue;
      const id =
        toText(source.id).trim().slice(0, 120) ||
        `document-${documents.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      documents.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 2000),
        fileUrl,
        fileType: toText(source.fileType).trim().slice(0, 80),
        fileSize: toText(source.fileSize).trim().slice(0, 80),
      });
      if (documents.length === MAX_DOCUMENTS) break;
    }
    return documents;
  }

  private detectOwnedPropertyType(
    value: string,
  ): MiniWebsiteOwnedPropertyType | null {
    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com'))
        return 'facebook';
      if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com'))
        return 'instagram';
      if (
        hostname === 'youtube.com' ||
        hostname.endsWith('.youtube.com') ||
        hostname === 'youtu.be'
      )
        return 'youtube';
      return null;
    } catch {
      return null;
    }
  }

  private normalizeOwnedProperties(value: unknown): MiniWebsiteOwnedProperty[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const properties: MiniWebsiteOwnedProperty[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const name = toText(source.name).trim().slice(0, 240);
      const relationship = toText(source.relationship).trim().slice(0, 160);
      const url = toText(source.url).trim().slice(0, 2048);
      if (!name || !relationship || !this.isHttpUrl(url)) continue;
      const id =
        toText(source.id).trim().slice(0, 120) ||
        `owned-property-${properties.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const requestedType = toText(source.propertyType, 'other');
      const detectedType = this.detectOwnedPropertyType(url);
      const propertyType =
        detectedType ||
        (OWNED_PROPERTY_TYPES.includes(
          requestedType as MiniWebsiteOwnedPropertyType,
        )
          ? (requestedType as MiniWebsiteOwnedPropertyType)
          : 'other');
      const featuredUrl = toText(source.featuredUrl).trim().slice(0, 2048);
      properties.push({
        id,
        name,
        relationship,
        propertyType,
        description: toText(source.description).trim().slice(0, 2000),
        image: toText(source.image).trim().slice(0, 2048),
        url,
        featuredUrl: this.isHttpUrl(featuredUrl) ? featuredUrl : '',
        foundedYear: toText(source.foundedYear).trim().slice(0, 40),
      });
      if (properties.length === MAX_OWNED_PROPERTIES) break;
    }
    return properties;
  }

  private normalizeEducation(value: unknown): MiniWebsiteEducation[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const education: MiniWebsiteEducation[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const institution = toText(source.institution).trim().slice(0, 240);
      const degree = toText(source.degree).trim().slice(0, 160);
      const startYear = toText(source.startYear).trim().slice(0, 40);
      if (!institution || !degree || !startYear) continue;
      const id =
        toText(source.id).trim().slice(0, 120) ||
        `education-${education.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawStatus = toText(source.status, 'other');
      const status = EDUCATION_STATUSES.includes(
        rawStatus as MiniWebsiteEducationStatus,
      )
        ? (rawStatus as MiniWebsiteEducationStatus)
        : 'other';
      const verificationUrl = toText(source.verificationUrl)
        .trim()
        .slice(0, 2048);
      education.push({
        id,
        institution,
        degree,
        fieldOfStudy: toText(source.fieldOfStudy).trim().slice(0, 160),
        location: toText(source.location).trim().slice(0, 160),
        startYear,
        endYear:
          status === 'studying'
            ? ''
            : toText(source.endYear).trim().slice(0, 40),
        status,
        grade: toText(source.grade).trim().slice(0, 120),
        description: toText(source.description).trim().slice(0, 2000),
        image: toText(source.image).trim().slice(0, 2048),
        verificationUrl: this.isHttpUrl(verificationUrl) ? verificationUrl : '',
      });
      if (education.length === MAX_EDUCATION_ENTRIES) break;
    }
    return education;
  }

  private normalizeExperience(value: unknown): MiniWebsiteExperience[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const experience: MiniWebsiteExperience[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 160);
      const organization = toText(source.organization).trim().slice(0, 240);
      const startDate = toText(source.startDate).trim().slice(0, 10);
      if (!title || !organization || !startDate) continue;
      const id =
        toText(source.id).trim().slice(0, 120) ||
        `experience-${experience.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawStatus = toText(source.status, 'current');
      const status = EXPERIENCE_STATUSES.includes(
        rawStatus as MiniWebsiteExperienceStatus,
      )
        ? (rawStatus as MiniWebsiteExperienceStatus)
        : 'current';
      const verificationUrl = toText(source.verificationUrl)
        .trim()
        .slice(0, 2048);
      experience.push({
        id,
        title,
        organization,
        employmentType: toText(source.employmentType).trim().slice(0, 120),
        location: toText(source.location).trim().slice(0, 160),
        startDate,
        endDate:
          status === 'current'
            ? ''
            : toText(source.endDate).trim().slice(0, 10),
        status,
        description: toText(source.description).trim().slice(0, 2000),
        image: toText(source.image).trim().slice(0, 2048),
        verificationUrl: this.isHttpUrl(verificationUrl) ? verificationUrl : '',
      });
      if (experience.length === MAX_EXPERIENCE_ENTRIES) break;
    }
    return experience;
  }

  /**
   * Clamps the offers list into a storable shape.
   *
   * An offer with no name is dropped — a price on its own is not something a
   * customer can read — but everything else is optional: plenty of businesses
   * list what they do without a price or a button.
   */
  private normalizeServices(value: unknown): MiniWebsiteService[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const services: MiniWebsiteService[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      if (!title) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `service-${services.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const pixelEvent = toText(source.pixelEvent, 'None');
      const rawType = toText(source.actionType, 'none');
      const actionType = ACTION_TYPES.includes(rawType as MiniWebsiteActionType)
        ? (rawType as MiniWebsiteActionType)
        : 'none';
      const actionCountryCode =
        toText(source.actionCountryCode, '964')
          .replace(/\D/g, '')
          .slice(0, 4) || '964';
      const actionValue =
        actionType === 'whatsapp' || actionType === 'phone'
          ? toText(source.actionValue).replace(/\D/g, '').slice(0, 20)
          : toText(source.actionValue).trim().slice(0, 500);
      services.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 2000),
        price: toText(source.price).trim().slice(0, 80),
        image: toText(source.image).trim().slice(0, 2048),
        actionLabel: toText(source.actionLabel).trim().slice(0, 120),
        actionType,
        actionValue,
        actionCountryCode,
        url: this.buildActionUrl(actionType, actionValue, actionCountryCode),
        pixelEvent: ITEM_PIXEL_EVENTS.includes(
          pixelEvent as MiniWebsiteItemPixelEvent,
        )
          ? (pixelEvent as MiniWebsiteItemPixelEvent)
          : 'None',
      });
      if (services.length === MAX_SERVICES) break;
    }
    return services;
  }

  /** Normalizes the people shown in the Team / Specialists section. */
  private normalizeTeam(value: unknown): MiniWebsiteTeamMember[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const team: MiniWebsiteTeamMember[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const name = toText(source.name).trim().slice(0, 240);
      if (!name) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `team-${team.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawType = toText(source.actionType, 'none');
      const actionType = ACTION_TYPES.includes(rawType as MiniWebsiteActionType)
        ? (rawType as MiniWebsiteActionType)
        : 'none';
      const actionCountryCode =
        toText(source.actionCountryCode, '964')
          .replace(/\D/g, '')
          .slice(0, 4) || '964';
      const actionValue =
        actionType === 'whatsapp' || actionType === 'phone'
          ? toText(source.actionValue).replace(/\D/g, '').slice(0, 20)
          : toText(source.actionValue).trim().slice(0, 500);
      team.push({
        id,
        name,
        role: toText(source.role).trim().slice(0, 160),
        experience: toText(source.experience).trim().slice(0, 160),
        bio: toText(source.bio).trim().slice(0, 2000),
        image: toText(source.image).trim().slice(0, 2048),
        actionLabel: toText(source.actionLabel).trim().slice(0, 120),
        actionType,
        actionValue,
        actionCountryCode,
        url: this.buildActionUrl(actionType, actionValue, actionCountryCode),
      });
      if (team.length === MAX_TEAM_MEMBERS) break;
    }
    return team;
  }

  private normalizeCertificates(value: unknown): MiniWebsiteCertificate[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const certificates: MiniWebsiteCertificate[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      if (!title) continue;
      const id =
        toText(source.id).trim().slice(0, 120) ||
        `certificate-${certificates.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const verificationValue = toText(source.verificationUrl)
        .trim()
        .slice(0, 500);
      certificates.push({
        id,
        title,
        issuer: toText(source.issuer).trim().slice(0, 160),
        year: toText(source.year).trim().slice(0, 40),
        description: toText(source.description).trim().slice(0, 2000),
        image: toText(source.image).trim().slice(0, 2048),
        verificationUrl: this.isHttpsUrl(verificationValue)
          ? verificationValue
          : '',
      });
      if (certificates.length === MAX_CERTIFICATES) break;
    }
    return certificates;
  }

  private detectVideoPlatform(value: string): MiniWebsiteVideoPlatform {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      if (
        hostname === 'youtu.be' ||
        hostname === 'youtube.com' ||
        hostname.endsWith('.youtube.com')
      )
        return 'youtube';
      if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com'))
        return 'tiktok';
      if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com'))
        return 'instagram';
      if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com'))
        return 'facebook';
    } catch {
      return 'other';
    }
    return 'other';
  }

  private isYoutubeStandardVideoUrl(value: string): boolean {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return false;
      const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      if (hostname === 'youtu.be') {
        return /^[A-Za-z0-9_-]{6,}$/.test(
          url.pathname.split('/').filter(Boolean)[0] || '',
        );
      }
      if (hostname !== 'youtube.com' && !hostname.endsWith('.youtube.com'))
        return false;
      if (url.pathname.startsWith('/shorts/')) return false;
      const id =
        url.searchParams.get('v') ||
        url.pathname.match(/\/(?:embed|live)\/([A-Za-z0-9_-]+)/)?.[1];
      return Boolean(id && /^[A-Za-z0-9_-]{6,}$/.test(id));
    } catch {
      return false;
    }
  }

  private isShortFormVideoUrl(value: string): boolean {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return false;
      const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
        return /^\/shorts\/[A-Za-z0-9_-]{6,}/.test(url.pathname);
      }
      if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
        return (
          /^\/@[^/]+\/video\/\d+/.test(url.pathname) ||
          /^(?:vm|vt)\.tiktok\.com$/.test(hostname)
        );
      }
      if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) {
        return /^\/reels?\/[A-Za-z0-9_-]+/.test(url.pathname);
      }
      if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com')) {
        return /^\/reels?\/[A-Za-z0-9._-]+/.test(url.pathname);
      }
      return false;
    } catch {
      return false;
    }
  }

  private normalizeVideoCollection(
    value: unknown,
    max: number,
    acceptsUrl: (url: string) => boolean,
  ): MiniWebsiteVideo[] {
    if (!Array.isArray(value)) return [];
    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();
    const videos: MiniWebsiteVideo[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      if (!title) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `video-${videos.length}`;
      const urlValue = toText(source.url).trim().slice(0, 500);
      if (seenIds.has(id) || seenUrls.has(urlValue) || !acceptsUrl(urlValue))
        continue;
      seenIds.add(id);
      seenUrls.add(urlValue);
      videos.push({
        id,
        title,
        platform: this.detectVideoPlatform(urlValue),
        url: urlValue,
      });
      if (videos.length === max) break;
    }
    return videos;
  }

  private normalizeVideos(value: unknown): MiniWebsiteVideo[] {
    return this.normalizeVideoCollection(value, MAX_VIDEOS, (url) =>
      this.isShortFormVideoUrl(url),
    );
  }

  private normalizeYoutubeVideos(value: unknown): MiniWebsiteYoutubeVideo[] {
    return this.normalizeVideoCollection(value, MAX_YOUTUBE_VIDEOS, (url) =>
      this.isYoutubeStandardVideoUrl(url),
    ).map((video) => ({ ...video, platform: 'youtube' as const }));
  }

  private normalizeStories(value: unknown): MiniWebsiteStory[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const stories: MiniWebsiteStory[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const id =
        toText(source.id).trim().slice(0, 120) || `story-${stories.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawPlatform = toText(source.platform, 'other');
      const platform = STORY_PLATFORMS.includes(
        rawPlatform as MiniWebsiteStoryPlatform,
      )
        ? (rawPlatform as MiniWebsiteStoryPlatform)
        : 'other';
      const mediaType = source.mediaType === 'video' ? 'video' : 'image';
      const image = toText(source.image).trim().slice(0, 2048);
      const urlValue = toText(source.url).trim().slice(0, 2048);
      const url = this.isHttpsUrl(urlValue) ? urlValue : '';
      if ((mediaType === 'image' && !image) || (mediaType === 'video' && !url))
        continue;
      stories.push({
        id,
        title: toText(source.title).trim().slice(0, 120),
        platform,
        mediaType,
        image,
        url,
      });
      if (stories.length === MAX_STORIES) break;
    }
    return stories;
  }

  private normalizePartners(value: unknown): MiniWebsitePartner[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const partners: MiniWebsitePartner[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const image = toText(source.image).trim().slice(0, 2048);
      if (!image) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `partner-${partners.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const urlValue = toText(source.url).trim().slice(0, 500);
      partners.push({
        id,
        name: toText(source.name).trim().slice(0, 160),
        image,
        url: this.isHttpsUrl(urlValue) ? urlValue : '',
      });
      if (partners.length === MAX_PARTNERS) break;
    }
    return partners;
  }

  private buildBookingUrl(
    provider: MiniWebsiteBookingProvider,
    value: string,
    countryCode: string,
  ): string {
    if (provider === 'whatsapp') {
      return this.buildActionUrl('whatsapp', value, countryCode);
    }
    return this.isHttpsUrl(value) ? value : '';
  }

  /**
   * Normalizes external appointment cards.
   *
   * MultiTree owns the card and click analytics; the selected provider owns
   * availability and confirmation. A provider URL must use HTTPS. WhatsApp is
   * represented by a national number and converted to its public destination
   * by the server.
   */
  private normalizeBookings(value: unknown): MiniWebsiteBooking[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const bookings: MiniWebsiteBooking[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const title = toText(source.title).trim().slice(0, 240);
      if (!title) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `booking-${bookings.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawProvider = toText(source.provider, 'custom');
      const provider = BOOKING_PROVIDERS.includes(
        rawProvider as MiniWebsiteBookingProvider,
      )
        ? (rawProvider as MiniWebsiteBookingProvider)
        : 'custom';
      const actionCountryCode =
        toText(source.actionCountryCode, '964')
          .replace(/\D/g, '')
          .slice(0, 4) || '964';
      const actionValue =
        provider === 'whatsapp'
          ? toText(source.actionValue).replace(/\D/g, '').slice(0, 20)
          : toText(source.actionValue).trim().slice(0, 500);
      const duration = Number(source.durationMinutes);
      bookings.push({
        id,
        title,
        description: toText(source.description).trim().slice(0, 2000),
        durationMinutes: Number.isFinite(duration)
          ? Math.min(
              BOOKING_DURATION_MAX,
              Math.max(BOOKING_DURATION_MIN, Math.round(duration)),
            )
          : 30,
        price: toText(source.price).trim().slice(0, 80),
        provider,
        actionLabel: toText(source.actionLabel).trim().slice(0, 120),
        actionValue,
        actionCountryCode,
        url: this.buildBookingUrl(provider, actionValue, actionCountryCode),
      });
      if (bookings.length === MAX_BOOKINGS) break;
    }
    return bookings;
  }

  /**
   * Clamps the question list into a storable shape.
   *
   * An entry missing either half is dropped: a question with no answer publishes
   * a row that tells the reader nothing, and an answer with no question has
   * nowhere to hang.
   */
  private normalizeFaq(value: unknown): MiniWebsiteFaqEntry[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const entries: MiniWebsiteFaqEntry[] = [];
    for (const entry of value) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      const question = toText(source.question).trim().slice(0, 240);
      const answer = toText(source.answer).trim().slice(0, 2000);
      if (!question || !answer) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `faq-${entries.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      entries.push({ id, question, answer });
      if (entries.length === MAX_FAQ_ENTRIES) break;
    }
    return entries;
  }

  /**
   * Clamps the lead form's questions into a storable shape.
   *
   * A field's mapping is checked against its type rather than trusted, because
   * the mapping is what decides which encrypted CRM contact column an answer is
   * written to. A `select` that claimed to be an email address would put an
   * arbitrary chosen option into the column a TikTok custom audience is later
   * hashed from, so a mismatched pair is demoted to an ordinary answer instead
   * of being rejected — the question itself is still a reasonable one to ask.
   *
   * Each of the three mappings is also allowed at most once: two fields both
   * claiming to be the phone number leave no answer as to which one the contact
   * record should keep.
   */
  private normalizeLeadFields(value: unknown): MiniWebsiteLeadField[] {
    const seen = new Set<string>();
    const claimed = new Set<MiniWebsiteLeadFieldMapping>();
    const fields: MiniWebsiteLeadField[] = [];
    for (const source of toRecordArray(value)) {
      const label = toText(source.label).trim().slice(0, 120);
      if (!label) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `lead-field-${fields.length}`;
      if (seen.has(id)) continue;
      const type =
        MINI_WEBSITE_LEAD_FIELD_TYPES.find(
          (candidate) => candidate === source.type,
        ) ?? 'text';
      const requested =
        MINI_WEBSITE_LEAD_FIELD_MAPPINGS.find(
          (candidate) => candidate === source.mapping,
        ) ?? 'none';
      const mapping: MiniWebsiteLeadFieldMapping =
        requested !== 'none' &&
        !claimed.has(requested) &&
        MINI_WEBSITE_LEAD_MAPPING_TYPES[requested].includes(type)
          ? requested
          : 'none';
      if (mapping !== 'none') claimed.add(mapping);
      const options =
        type === 'select'
          ? Array.from(
              new Set(
                (Array.isArray(source.options) ? source.options : [])
                  .map((option) => toText(option).trim().slice(0, 120))
                  .filter(Boolean),
              ),
            ).slice(0, MAX_LEAD_FIELD_OPTIONS)
          : [];
      seen.add(id);
      fields.push({
        id,
        label,
        placeholder: toText(source.placeholder).trim().slice(0, 120),
        helpText: toText(source.helpText).trim().slice(0, 240),
        type,
        mapping,
        required: source.required === true,
        options,
      });
      if (fields.length === MAX_LEAD_FIELDS) break;
    }
    return fields;
  }

  /**
   * Rebuilds a saved form from its two halves — the settings row and the
   * question rows.
   *
   * Public so the submission path validates against exactly the same shape the
   * editor and the renderer were given, rather than against a second reading of
   * the same rows that could drift from this one.
   */
  readLeadForm(settings: unknown, fields: unknown): MiniWebsiteLeadForm {
    return this.normalizeLeadForm({ ...toRecord(settings), fields });
  }

  private normalizeLeadForm(value: unknown): MiniWebsiteLeadForm {
    const source = toRecord(value);
    const consentText = toText(source.consentText).trim().slice(0, 600);
    return {
      title: toText(source.title).trim().slice(0, 160),
      description: toText(source.description).trim().slice(0, 600),
      submitLabel: toText(source.submitLabel).trim().slice(0, 80),
      successMessage: toText(source.successMessage).trim().slice(0, 400),
      consentText,
      // Consent cannot be required without a sentence to consent to, so the
      // flag follows the text rather than being storable on its own.
      consentRequired: Boolean(consentText) && source.consentRequired === true,
      fields: this.normalizeLeadFields(source.fields),
    };
  }

  /**
   * Clamps the pricing tiers into a storable shape.
   *
   * At most one tier may be the recommended one: two cards both claiming to be
   * the pick leave the visitor exactly where they started, so the first claim
   * wins and later ones are demoted rather than the save being rejected.
   */
  private normalizePlans(value: unknown): MiniWebsitePlan[] {
    const seen = new Set<string>();
    const plans: MiniWebsitePlan[] = [];
    let featuredTaken = false;
    for (const source of toRecordArray(value)) {
      const name = toText(source.name).trim().slice(0, 120);
      if (!name) continue;
      const id =
        toText(source.id).trim().slice(0, 120) || `plan-${plans.length}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const actionType =
        ACTION_TYPES.find((candidate) => candidate === source.actionType) ??
        'none';
      const actionValue = toText(source.actionValue).trim().slice(0, 500);
      const actionCountryCode = toText(source.actionCountryCode, '964')
        .replace(/\D/g, '')
        .slice(0, 4);
      const featured = source.featured === true && !featuredTaken;
      if (featured) featuredTaken = true;
      plans.push({
        id,
        name,
        price: toText(source.price).trim().slice(0, 80),
        period: toText(source.period).trim().slice(0, 80),
        description: toText(source.description).trim().slice(0, 600),
        featured,
        features: Array.from(
          new Set(
            (Array.isArray(source.features) ? source.features : [])
              .map((feature) => toText(feature).trim().slice(0, 120))
              .filter(Boolean),
          ),
        ).slice(0, MAX_PLAN_FEATURES),
        actionLabel: toText(source.actionLabel).trim().slice(0, 120),
        actionType,
        actionValue,
        actionCountryCode,
        // Built here, never taken from the client, exactly as offers are.
        url: this.buildActionUrl(actionType, actionValue, actionCountryCode),
        pixelEvent:
          ITEM_PIXEL_EVENTS.find(
            (candidate) => candidate === source.pixelEvent,
          ) ?? 'InitiateCheckout',
      });
      if (plans.length === MAX_PLANS) break;
    }
    return plans;
  }

  /**
   * Rebuilds a full week from whatever was sent.
   *
   * Always returns seven days in a fixed order, so the renderer never has to
   * guard for a missing one, and a client cannot store a week with a day
   * repeated or invented. Times that are not a real `HH:MM` fall back to the
   * default rather than being stored as something unreadable.
   */
  private normalizeWeekHours(value: unknown): MiniWebsiteWeekHours {
    const entries = Array.isArray(value) ? value : [];
    const byDay = new Map<string, Record<string, unknown>>();
    for (const entry of entries) {
      const source = (
        entry && typeof entry === 'object' ? entry : {}
      ) as Record<string, unknown>;
      // Clients send the day as a key; the database stores it as the weekday
      // number, so both are accepted and stored back under the key.
      const day =
        typeof source.day === 'number'
          ? (DAY_KEY_BY_INDEX[source.day] ?? '')
          : toText(source.day);
      if (DAY_KEYS.includes(day as MiniWebsiteDayKey) && !byDay.has(day))
        byDay.set(day, source);
    }
    const time = (raw: unknown, fallback: string): string => {
      const match = /^(\d{1,2}):(\d{2})$/.exec(toText(raw).trim());
      if (!match) return fallback;
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (hours > 23 || minutes > 59) return fallback;
      return `${String(hours).padStart(2, '0')}:${match[2]}`;
    };
    return DAY_KEYS.map((day): MiniWebsiteDayHours => {
      const source = byDay.get(day);
      return {
        day,
        // A record with no week at all gets the usual one — open every day but
        // Friday — because nothing was claimed either way. Once a week *is*
        // given, a day it leaves out is closed: a schedule that names six days
        // never said it was open on the seventh.
        closed: source
          ? source.closed === true
          : byDay.size > 0 || day === 'fri',
        open: time(source?.open, DEFAULT_OPEN),
        close: time(source?.close, DEFAULT_CLOSE),
      };
    });
  }

  /**
   * Normalizes the branch list, capped so one record cannot grow unbounded.
   *
   * Falls back to the legacy single `location` object when the array is empty,
   * so a record written before multi-branch support still resolves to one
   * location rather than none.
   */
  private normalizeLocations(
    value: unknown,
    legacy?: unknown,
  ): MiniWebsiteLocation[] {
    const entries = Array.isArray(value) ? value : [];
    if (!entries.length) {
      const single = this.normalizeLocation(legacy);
      const hasContent =
        single.address || single.area || single.city || single.lat !== null;
      return hasContent ? [single] : [];
    }
    return entries
      .slice(0, MAX_LOCATIONS)
      .map((entry) => this.normalizeLocation(entry));
  }

  private defaults(data: MiniWebsiteInput): NormalizedMiniWebsite {
    const sourceContent = toRecord(data.content);
    const content = {
      heroBackgroundType: toText(
        sourceContent.heroBackgroundType,
        data.cover ? 'image' : sourceContent.heroYoutubeUrl ? 'video' : 'color',
      ),
      heroBackgroundColor: toText(sourceContent.heroBackgroundColor, '#000000'),
      heroYoutubeUrl: toText(sourceContent.heroYoutubeUrl),
    };
    return {
      name: toText(data.name),
      slug: toText(data.slug),
      headline: data.headline || '',
      bio: data.bio || '',
      avatar: data.avatar || '/images/DefaultAvatar.png',
      cover: data.cover || null,
      templateKey:
        data.templateKey === 'liquid-glass'
          ? data.templateKey
          : MINI_WEBSITE_VISUAL_TEMPLATE_DEFAULT,
      variation: data.variation || 'soft',
      backgroundStyle: normalizeBackgroundStyle(data.backgroundStyle),
      professionTemplate:
        typeof data.professionTemplate === 'string' &&
        /^[a-z][A-Za-z]{0,79}$/.test(data.professionTemplate)
          ? data.professionTemplate
          : 'custom',
      accentColor: data.accentColor || '#b6f20d',
      status: data.status || 'draft',
      primaryAction: data.primaryAction || 'none',
      whatsappNumber: data.whatsappNumber || '',
      pixelEvent: data.pixelEvent || 'Contact',
      eventValue: Number(data.eventValue || 0),
      sections: this.normalizeSections(data.sections),
      locations: this.normalizeLocations(data.locations, data.location),
      hours: this.normalizeWeekHours(data.hours),
      gallery: this.normalizeGallery(data.gallery),
      faq: this.normalizeFaq(data.faq),
      services: this.normalizeServices(data.services),
      bookings: this.normalizeBookings(data.bookings),
      team: this.normalizeTeam(data.team),
      certificates: this.normalizeCertificates(data.certificates),
      videos: this.normalizeVideos(data.videos),
      youtubeVideos: this.normalizeYoutubeVideos(data.youtubeVideos),
      stories: this.normalizeStories(data.stories),
      partners: this.normalizePartners(data.partners),
      reviews: this.normalizeReviews(data.reviews),
      beforeAfter: this.normalizeBeforeAfter(data.beforeAfter),
      coverage: this.normalizeCoverage(data.coverage),
      paymentMethods: this.normalizePaymentMethods(data.paymentMethods),
      specialOffers: this.normalizeSpecialOffers(data.specialOffers),
      events: this.normalizeEvents(data.events),
      audio: this.normalizeAudio(data.audio),
      advantages: this.normalizeAdvantages(data.advantages),
      impactStats: this.normalizeImpactStats(data.impactStats),
      processSteps: this.normalizeProcessSteps(data.processSteps),
      documents: this.normalizeDocuments(data.documents),
      ownedProperties: this.normalizeOwnedProperties(data.ownedProperties),
      education: this.normalizeEducation(data.education),
      experience: this.normalizeExperience(data.experience),
      leadForm: this.normalizeLeadForm(data.leadForm),
      plans: this.normalizePlans(data.plans),
      socialLinks: toRecordArray(data.socialLinks)
        .slice(0, 32)
        .map((link, index) => {
          const customIcon = toText(link.customIcon).trim().slice(0, 2048);
          const imageHasBackground = customIcon.startsWith(
            'uploaded-image:opaque:',
          );
          return {
            id: toText(
              link.id,
              `${toText(link.platform, 'link')}-${index}`,
            ).slice(0, 120),
            platform: toText(link.platform).slice(0, 30),
            url: toText(link.url).trim().slice(0, 2048),
            value: toText(link.value).trim().slice(0, 500),
            countryCode: toText(link.countryCode, '964')
              .replace(/\D/g, '')
              .slice(0, 4),
            displayName: toText(link.displayName).trim().slice(0, 80),
            customColor: imageHasBackground
              ? ''
              : toText(link.customColor).trim().slice(0, 200),
            customIcon,
            enabled: link.enabled !== false,
            order: index,
          };
        }),
      content,
    };
  }

  private validate(
    data: NormalizedMiniWebsite,
    allowedExistingImages: ReadonlySet<string> = new Set(),
  ) {
    if (
      !data.name?.trim() ||
      !/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/.test(data.slug || '')
    )
      throw new BadRequestException('Invalid name or slug');
    const contentValues = toRecord(data.content);
    for (const key of URL_KEYS) {
      const value = contentValues[key];
      if (value && !this.isHttpUrl(value))
        throw new BadRequestException(`Invalid URL in ${key}`);
    }
    const socialIds = new Set<string>();
    for (const link of data.socialLinks || []) {
      if (
        !link.id ||
        socialIds.has(link.id) ||
        !SOCIAL_PLATFORMS.has(link.platform) ||
        !link.value ||
        !link.url
      )
        throw new BadRequestException('Invalid social link');
      socialIds.add(link.id);
      if (
        link.customIcon?.startsWith('uploaded-image:') &&
        !/^uploaded-image:(opaque|transparent):\/images\/upload\/[a-zA-Z0-9._/-]+$/.test(
          link.customIcon,
        )
      )
        throw new BadRequestException('Invalid uploaded social icon');
      if (!(
        this.isHttpUrl(link.url) || /^(tel:|mailto:|viber:\/\/)/i.test(link.url)
      ))
        throw new BadRequestException('Invalid social destination');
    }
    {
      const type = data.content?.heroBackgroundType;
      if (!data.avatar)
        throw new BadRequestException('Profile image is required');
      if (!['image', 'color', 'video'].includes(type))
        throw new BadRequestException('Banner type is required');
      if (type === 'image' && !data.cover)
        throw new BadRequestException('Banner image is required');
      if (
        type === 'color' &&
        !(
          /^#[0-9a-f]{6}$/i.test(data.content?.heroBackgroundColor || '') ||
          /^gradient:(to-r|to-l|to-b|to-t|to-br|to-bl|to-tr|to-tl|radial):#[0-9a-f]{6}:#[0-9a-f]{6}$/i.test(
            data.content?.heroBackgroundColor || '',
          )
        )
      )
        throw new BadRequestException('Valid banner color is required');
      if (type === 'video' && !this.isHttpUrl(data.content?.heroYoutubeUrl))
        throw new BadRequestException('Valid banner video URL is required');
    }
    // Both lists are normalized by `defaults()` before validation runs, so they
    // can be read as the shapes they are rather than as loose json.
    const locations = Array.isArray(data.locations) ? data.locations : [];
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const sectionOn = (key: MiniWebsiteSectionKey) =>
      sections.some((section) => section.key === key && section.enabled);
    if (sectionOn('hours')) {
      // A week with nothing open publishes a section that tells a customer
      // nothing. The times themselves are never wrong: a closing time before
      // the opening one is a night shift.
      const week = Array.isArray(data.hours) ? data.hours : [];
      if (!week.some((entry) => entry.closed !== true))
        throw new BadRequestException('Working hours need one open day');
    }
    const gallery = Array.isArray(data.gallery) ? data.gallery : [];
    if (sectionOn('gallery') && !gallery.length)
      throw new BadRequestException('Add at least one gallery image');
    if (sectionOn('faq') && !(Array.isArray(data.faq) ? data.faq : []).length)
      throw new BadRequestException('Add at least one question and answer');
    if (
      sectionOn('reviews') &&
      !(Array.isArray(data.reviews) ? data.reviews : []).length
    )
      throw new BadRequestException('Add at least one review');
    const services = Array.isArray(data.services) ? data.services : [];
    if (sectionOn('services') && !services.length)
      throw new BadRequestException('Add at least one service');
    for (const service of services) {
      // `normalizeServices` has already built the destination, so an address
      // that survived is one the product supports. What is left to catch is a
      // button that was asked for but points nowhere.
      if (service.actionType !== 'none' && !service.url)
        throw new BadRequestException('Invalid service destination');
    }
    const bookings = Array.isArray(data.bookings) ? data.bookings : [];
    if (sectionOn('booking') && !bookings.length)
      throw new BadRequestException('Add at least one appointment');
    for (const booking of bookings) {
      if (!booking.url)
        throw new BadRequestException('Invalid booking destination');
    }
    const team = Array.isArray(data.team) ? data.team : [];
    if (sectionOn('team') && !team.length)
      throw new BadRequestException('Add at least one team member');
    for (const member of team) {
      if (!member.role)
        throw new BadRequestException('Team members need a role');
      if (member.actionType !== 'none' && !member.url)
        throw new BadRequestException('Invalid team member destination');
    }
    const certificates = Array.isArray(data.certificates)
      ? data.certificates
      : [];
    if (sectionOn('credentials') && !certificates.length)
      throw new BadRequestException('Add at least one certificate');
    for (const certificate of certificates) {
      if (!certificate.issuer)
        throw new BadRequestException('Certificates need an issuer');
    }
    const videos = Array.isArray(data.videos) ? data.videos : [];
    if (sectionOn('shortVideos') && !videos.length)
      throw new BadRequestException('Add at least one reel or short video');
    for (const video of videos) {
      if (!this.isShortFormVideoUrl(video.url))
        throw new BadRequestException('Invalid reel or short video URL');
    }
    const youtubeVideos = Array.isArray(data.youtubeVideos)
      ? data.youtubeVideos
      : [];
    if (sectionOn('youtubeVideos') && !youtubeVideos.length)
      throw new BadRequestException('Add at least one YouTube video');
    for (const video of youtubeVideos) {
      if (!this.isYoutubeStandardVideoUrl(video.url))
        throw new BadRequestException('Invalid standard YouTube video URL');
    }
    const stories = Array.isArray(data.stories) ? data.stories : [];
    if (sectionOn('stories') && !stories.length)
      throw new BadRequestException('Add at least one social media story');
    for (const story of stories) {
      if (story.mediaType === 'image' && !story.image)
        throw new BadRequestException('Story image is required');
      if (story.mediaType === 'video' && !story.url)
        throw new BadRequestException('Story video URL is required');
    }
    const partners = Array.isArray(data.partners) ? data.partners : [];
    if (sectionOn('partners') && !partners.length)
      throw new BadRequestException('Add at least one partner logo');
    const beforeAfter = Array.isArray(data.beforeAfter) ? data.beforeAfter : [];
    if (sectionOn('beforeAfter') && !beforeAfter.length)
      throw new BadRequestException('Add at least one before and after pair');
    const coverage = Array.isArray(data.coverage) ? data.coverage : [];
    if (sectionOn('serviceAreas') && !coverage.length)
      throw new BadRequestException('Add at least one language');
    const paymentMethods = Array.isArray(data.paymentMethods)
      ? data.paymentMethods
      : [];
    if (sectionOn('payments') && !paymentMethods.length)
      throw new BadRequestException('Add at least one payment method');
    const specialOffers = Array.isArray(data.specialOffers)
      ? data.specialOffers
      : [];
    if (sectionOn('offers') && !specialOffers.length)
      throw new BadRequestException('Add at least one special offer');
    const events = Array.isArray(data.events) ? data.events : [];
    if (sectionOn('events') && !events.length)
      throw new BadRequestException('Add at least one event');
    const audio = Array.isArray(data.audio) ? data.audio : [];
    if (sectionOn('audio') && !audio.length)
      throw new BadRequestException('Add at least one audio item');
    const advantages = Array.isArray(data.advantages) ? data.advantages : [];
    if (sectionOn('whyChooseUs') && !advantages.length)
      throw new BadRequestException('Add at least one advantage');
    const impactStats = Array.isArray(data.impactStats) ? data.impactStats : [];
    if (sectionOn('impactStats') && !impactStats.length)
      throw new BadRequestException('Add at least one impact statistic');
    const processSteps = Array.isArray(data.processSteps)
      ? data.processSteps
      : [];
    if (sectionOn('process') && !processSteps.length)
      throw new BadRequestException('Add at least one process step');
    const documents = Array.isArray(data.documents) ? data.documents : [];
    if (sectionOn('documents') && !documents.length)
      throw new BadRequestException('Add at least one document');
    const ownedProperties = Array.isArray(data.ownedProperties)
      ? data.ownedProperties
      : [];
    if (sectionOn('ownedProperties') && !ownedProperties.length)
      throw new BadRequestException('Add at least one owned brand or page');
    const education = Array.isArray(data.education) ? data.education : [];
    if (sectionOn('education') && !education.length)
      throw new BadRequestException('Add at least one education entry');
    for (const entry of education) {
      if (entry.status === 'graduated' && !entry.endYear)
        throw new BadRequestException(
          'Graduated education entries need an end year',
        );
    }
    const experience = Array.isArray(data.experience) ? data.experience : [];
    if (sectionOn('experience') && !experience.length)
      throw new BadRequestException('Add at least one experience entry');
    for (const entry of experience) {
      if (entry.status === 'completed' && !entry.endDate)
        throw new BadRequestException(
          'Completed experience entries need an end date',
        );
      if (entry.endDate && entry.endDate < entry.startDate)
        throw new BadRequestException(
          'Experience end date cannot precede start date',
        );
    }
    if (sectionOn('leadForm')) {
      const fields = data.leadForm.fields;
      if (!fields.length)
        throw new BadRequestException('Add at least one form question');
      // A submission the business cannot reply to is not a lead. One of the two
      // reachable identities has to be asked for, and asked for every time.
      if (
        !fields.some(
          (field) =>
            field.required &&
            (field.mapping === 'email' || field.mapping === 'phone'),
        )
      )
        throw new BadRequestException(
          'The form needs a required email or phone question',
        );
      for (const field of fields) {
        if (field.type === 'select' && !field.options.length)
          throw new BadRequestException('Dropdown questions need choices');
      }
      // A tick-box with nothing written beside it asks the visitor to agree to
      // nothing, which is worse than not asking at all.
      if (data.leadForm.consentRequired && !data.leadForm.consentText)
        throw new BadRequestException('Required consent needs its wording');
    }
    const plans = Array.isArray(data.plans) ? data.plans : [];
    if (sectionOn('pricing')) {
      if (!plans.length) throw new BadRequestException('Add at least one plan');
      // One tier alone is a price, not a choice; the section exists to compare.
      if (plans.length < 2)
        throw new BadRequestException('A pricing table needs two plans');
    }
    for (const plan of plans) {
      if (!plan.features.length)
        throw new BadRequestException('Every plan needs at least one feature');
      // `normalizePlans` has already built the destination, so what is left to
      // catch is a button that was asked for but points nowhere.
      if (plan.actionType !== 'none' && !plan.url)
        throw new BadRequestException('Invalid plan destination');
    }
    if (sectionOn('location')) {
      if (!locations.length)
        throw new BadRequestException('Add at least one location');
      // Every branch is checked, not just the primary — a half-filled second
      // branch would otherwise publish as a card with no address or pin.
      for (const location of locations) {
        if (
          !location.address?.trim() &&
          !location.area?.trim() &&
          !location.city?.trim()
        )
          throw new BadRequestException(
            'Location needs an address, area or city',
          );
        if (location.lat === null || location.lng === null)
          throw new BadRequestException('Place the location pin before saving');
        if (location.mapUrl && !this.isHttpUrl(location.mapUrl))
          throw new BadRequestException('Invalid map URL');
      }
    }
    for (const value of this.collectImageReferences(data))
      if (
        value &&
        value !== '/images/DefaultAvatar.png' &&
        !/^\/images\/upload\/[a-zA-Z0-9._/-]+$/.test(value) &&
        !allowedExistingImages.has(value)
      )
        throw new BadRequestException('Images must be uploaded before saving');
  }

  private collectImageReferences(data: ImageBearingWebsite): string[] {
    const list = toRecordArray;
    return [
      data.avatar,
      data.cover,
      // Held to the same rule as the other images: only a path this business
      // already uploaded, never an arbitrary remote URL.
      ...list(data.locations).map((location) => location.image),
      ...list(data.gallery).map((image) => image.image),
      ...list(data.services).map((service) => service.image),
      ...list(data.team).map((member) => member.image),
      ...list(data.certificates).map((certificate) => certificate.image),
      ...list(data.partners).map((partner) => partner.image),
      ...list(data.beforeAfter).flatMap((comparison) => [
        comparison.beforeImage,
        comparison.afterImage,
      ]),
      ...list(data.paymentMethods).map((method) => method.image),
      ...list(data.specialOffers).map((offer) => offer.image),
      ...list(data.events).map((event) => event.image),
      ...list(data.audio).map((item) => item.image),
      ...list(data.ownedProperties).map((property) => property.image),
      ...list(data.education).map((entry) => entry.image),
      ...list(data.experience).map((entry) => entry.image),
    ].filter(
      (value): value is string =>
        typeof value === 'string' && Boolean(value.trim()),
    );
  }

  private isHttpUrl(value: unknown) {
    try {
      const url = new URL(String(value));
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  private isHttpsUrl(value: unknown) {
    try {
      return new URL(String(value)).protocol === 'https:';
    } catch {
      return false;
    }
  }
  async isSlugAvailable(businessId: string, slug: string, excludeId?: string) {
    const result = await this.database.query(
      'SELECT 1 FROM mini_websites WHERE business_id=$1 AND slug=$2 AND ($3::uuid IS NULL OR id<>$3)',
      [businessId, slug, excludeId || null],
    );
    return result.rows.length === 0;
  }

  private async assertSlugAvailable(
    businessId: string,
    slug: string,
    excludeId?: string,
  ) {
    if (!(await this.isSlugAvailable(businessId, slug, excludeId)))
      throw new ConflictException('Mini website slug already in use');
  }
}
