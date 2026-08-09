import type { AdvertisingServiceConfig } from '@linktree/types';

/**
 * The content a newly created advertising page starts with.
 *
 * This used to be `DEFAULT_ADVERTISING_CONFIG` in the frontend bundle, where it
 * did two jobs: shipped starting copy, and repair fallback for a damaged
 * `localStorage` payload. The second job disappeared with `localStorage`, and
 * the first belongs next to the seed that inserts it — a business that has
 * never opened the editor should still have a real page in the database, not
 * one assembled in the browser.
 */

const PERSONAL_TIERS = [
  { price: 15000, views: '25K – 35K' },
  { price: 20000, views: '35K – 50K' },
  { price: 25000, views: '50K – 70K' },
  { price: 30000, views: '65K – 90K' },
  { price: 35000, views: '80K – 110K' },
  { price: 40000, views: '100K – 130K' },
  { price: 45000, views: '120K – 155K' },
  { price: 50000, views: '140K – 175K' },
  { price: 60000, views: '160K – 195K' },
  { price: 70000, views: '180K – 215K' },
  { price: 80000, views: '200K – 235K' },
  { price: 90000, views: '220K – 255K' },
  { price: 100000, views: '250K – 300K' },
] as const;

const BUSINESS_TIERS = [
  { price: 25000, views: '40K – 50K' },
  { price: 30000, views: '50K – 65K' },
  { price: 36000, views: '60K – 80K' },
  { price: 40000, views: '65K – 80K' },
  { price: 45000, views: '110K – 140K' },
  { price: 50000, views: '125K – 155K' },
  { price: 60000, views: '140K – 175K' },
  { price: 70000, views: '160K – 195K' },
  { price: 80000, views: '180K – 215K' },
  { price: 90000, views: '200K – 235K' },
  { price: 100000, views: '230K – 270K' },
] as const;

/**
 * Builds the starting config. Takes the business's own contact number so the
 * closing CTA points somewhere real instead of at an empty field — nothing has
 * ever set a CTA number on a page this new.
 */
export function createDefaultAdvertisingConfig(
  businessPhone = '',
): AdvertisingServiceConfig {
  return {
    status: 'draft',
    sections: {
      hero: true,
      journey: true,
      results: true,
      packages: true,
      testimonials: true,
      faq: true,
      closingCta: true,
    },
    title: 'ڕێکار، نرخ و شێوازەکانی سپۆنسەری تیکتۆک بزانە',
    description:
      'ڤیدیۆکانت بگەیەنە بە بینەری زیاتر و کڕیاری ڕاستەقینە لە ڕێگای سپۆنسەری فەرمی تیکتۆکەوە بە ئەد ئەکاونتی فەرمی تیکتۆک',
    whatsappNumber: businessPhone.replace(/\D/g, ''),
    packageCategories: [
      { id: 'personal', label: 'کەسی', color: 'lime' },
      { id: 'business', label: 'بازرگانی', color: 'violet' },
    ],
    packageTiers: {
      personal: PERSONAL_TIERS.map((tier, index) => ({
        id: `personal-${index + 1}`,
        price: tier.price,
        views: tier.views,
      })),
      business: BUSINESS_TIERS.map((tier, index) => ({
        id: `business-${index + 1}`,
        price: tier.price,
        views: tier.views,
      })),
    },
    results: [],
    testimonials: [],
    faqs: [],
    closingCta: {
      title: 'ئامادەیت دەست پێبکەیت؟',
      description: 'پەیوەندیمان پێوە بکەو بە زووترین کات وەڵام وەربگرە',
      buttonLabel: 'دەستپێکردنی داواکاری',
    },
    videoUrl: '',
    videoTutorialTitle: 'کۆدی ڤیدیۆکەت چۆن دەردێنی؟',
    tutorialSteps: [
      'ڤیدیۆیەکە بکەرەوە',
      'کرتە لە سێ خاڵەکان (...) یان نیشانەی هاوبەشکردن بکە',
      '"Ad settings" هەڵبژێرە',
      '"Ad authorization" چالاک بکە و مەرجەکان قبوڵ بکە',
      'ماوەی ڕێگەپێدان هەڵبژێرە (365 ڕۆژ)',
      'کرتە لە "Generate code" بکە، پاشان کۆدەکە کۆپی و لێرە دایبنێ',
    ],
    paymentProviders: [],
  };
}
