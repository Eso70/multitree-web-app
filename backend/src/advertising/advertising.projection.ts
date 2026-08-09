import type {
  AdvertisingPackageCategory,
  AdvertisingPriceRow,
  AdvertisingResultColor,
  AdvertisingServiceConfig,
  AdvertisingTestimonialColor,
} from '@linktree/types';

/**
 * The one place relational rows become an `AdvertisingServiceConfig`.
 *
 * The editor and the public page consume the same shape, so both read this;
 * a second assembler on either side is how the two would drift apart.
 */

export interface AdvertisingPageRow {
  id: string;
  business_id: string;
  status: AdvertisingServiceConfig['status'];
  current_version: number;
  title: string;
  description: string;
  closing_cta_title: string;
  closing_cta_description: string;
  closing_cta_button_label: string;
  whatsapp_number: string;
  video_url: string;
  video_tutorial_title: string;
  tutorial_steps: string[];
  receipt_example_image_url: string;
  published_at: Date | null;
}

export interface AdvertisingSectionRow {
  section_key: string;
  enabled: boolean;
}

export interface AdvertisingCategoryRow {
  id: string;
  category_key: string;
  label: string;
  color: string;
}

export interface AdvertisingTierRow {
  category_id: string;
  tier_key: string;
  price: string;
  views_label: string;
}

export interface AdvertisingResultRow {
  item_key: string;
  category: string;
  before_label: string;
  after_label: string;
  price: string;
  color: string;
  before_image_url: string;
  after_image_url: string;
}

export interface AdvertisingTestimonialRow {
  item_key: string;
  name: string;
  role: string;
  quote: string;
  color: string;
  avatar_url: string;
}

export interface AdvertisingFaqRow {
  item_key: string;
  question: string;
  answer: string;
}

export interface AdvertisingProviderRow {
  provider_key: string;
  name: string;
  phone: string;
  logo_url: string;
}

export interface AdvertisingContentRows {
  page: AdvertisingPageRow;
  sections: AdvertisingSectionRow[];
  categories: AdvertisingCategoryRow[];
  tiers: AdvertisingTierRow[];
  results: AdvertisingResultRow[];
  testimonials: AdvertisingTestimonialRow[];
  faqs: AdvertisingFaqRow[];
  providers: AdvertisingProviderRow[];
}

export const ADVERTISING_SECTION_KEYS = [
  'hero',
  'journey',
  'results',
  'packages',
  'testimonials',
  'faq',
  'closing_cta',
] as const;

type AdvertisingSectionKey = (typeof ADVERTISING_SECTION_KEYS)[number];

const RESULT_COLORS: readonly AdvertisingResultColor[] = [
  'rose',
  'indigo',
  'amber',
  'emerald',
  'sky',
  'violet',
  'orange',
  'cyan',
];

const TESTIMONIAL_COLORS: readonly AdvertisingTestimonialColor[] = [
  'orange',
  'rose',
  'emerald',
  'violet',
  'sky',
  'amber',
  'cyan',
  'fuchsia',
];

/**
 * A colour that is not in the closed set cannot reach the database, but a row
 * read back from an older or hand-edited database still might, and the public
 * renderer indexes a theme map by this value. Falling back beats rendering
 * `undefined` styles.
 */
function resultColor(value: string): AdvertisingResultColor {
  return RESULT_COLORS.includes(value as AdvertisingResultColor)
    ? (value as AdvertisingResultColor)
    : 'rose';
}

function testimonialColor(value: string): AdvertisingTestimonialColor {
  return TESTIMONIAL_COLORS.includes(value as AdvertisingTestimonialColor)
    ? (value as AdvertisingTestimonialColor)
    : 'orange';
}

/** `numeric` arrives from pg as a string to avoid float rounding; the page wants a number. */
function money(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** An empty column means "unset" for optional media, which the renderers show a placeholder for. */
function optionalUrl(value: string): string | undefined {
  return value ? value : undefined;
}

export function projectAdvertisingConfig(
  rows: AdvertisingContentRows,
): AdvertisingServiceConfig {
  const { page } = rows;

  const sectionState = new Map(
    rows.sections.map((section) => [section.section_key, section.enabled]),
  );
  // A section with no row has never been touched by the editor, which is a
  // freshly seeded page rather than a hidden one.
  const isVisible = (key: AdvertisingSectionKey) =>
    sectionState.get(key) ?? true;

  const tiersByCategory = new Map<string, AdvertisingPriceRow[]>();
  for (const tier of rows.tiers) {
    const list = tiersByCategory.get(tier.category_id) ?? [];
    list.push({
      id: tier.tier_key,
      price: money(tier.price),
      views: tier.views_label,
    });
    tiersByCategory.set(tier.category_id, list);
  }

  const packageCategories: AdvertisingPackageCategory[] = rows.categories.map(
    (category) => ({
      id: category.category_key,
      label: category.label,
      color: category.color,
    }),
  );

  const packageTiers: Record<string, AdvertisingPriceRow[]> = {};
  for (const category of rows.categories) {
    packageTiers[category.category_key] =
      tiersByCategory.get(category.id) ?? [];
  }

  return {
    status: page.status,
    sections: {
      hero: isVisible('hero'),
      journey: isVisible('journey'),
      results: isVisible('results'),
      packages: isVisible('packages'),
      testimonials: isVisible('testimonials'),
      faq: isVisible('faq'),
      closingCta: isVisible('closing_cta'),
    },
    title: page.title,
    description: page.description,
    whatsappNumber: page.whatsapp_number,
    packageCategories,
    packageTiers,
    results: rows.results.map((result) => ({
      id: result.item_key,
      category: result.category,
      before: result.before_label,
      after: result.after_label,
      price: money(result.price),
      color: resultColor(result.color),
      beforeImageUrl: optionalUrl(result.before_image_url),
      afterImageUrl: optionalUrl(result.after_image_url),
    })),
    testimonials: rows.testimonials.map((testimonial) => ({
      id: testimonial.item_key,
      name: testimonial.name,
      role: testimonial.role,
      quote: testimonial.quote,
      color: testimonialColor(testimonial.color),
      avatarUrl: optionalUrl(testimonial.avatar_url),
    })),
    faqs: rows.faqs.map((faq) => ({
      id: faq.item_key,
      question: faq.question,
      answer: faq.answer,
    })),
    closingCta: {
      title: page.closing_cta_title,
      description: page.closing_cta_description,
      buttonLabel: page.closing_cta_button_label,
    },
    videoUrl: page.video_url,
    videoTutorialTitle: page.video_tutorial_title,
    tutorialSteps: page.tutorial_steps,
    paymentProviders: rows.providers.map((provider) => ({
      id: provider.provider_key,
      name: provider.name,
      phone: provider.phone,
      logoUrl: optionalUrl(provider.logo_url),
    })),
    receiptExampleImageUrl: optionalUrl(page.receipt_example_image_url),
  };
}
