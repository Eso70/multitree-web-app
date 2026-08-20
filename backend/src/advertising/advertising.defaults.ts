import type { AdvertisingServiceConfig } from '@linktree/types';

/**
 * Builds a clean draft without demo copy, pricing, or media. The business's
 * own phone is the only prefilled value because it is tenant data, not mock
 * content.
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
    title: '',
    description: '',
    whatsappNumber: businessPhone.replace(/\D/g, ''),
    // These are editor structure, not demo packages. They start with no tiers.
    packageCategories: [
      { id: 'personal', label: 'کەسی', color: 'lime' },
      { id: 'business', label: 'بازرگانی', color: 'violet' },
    ],
    packageTiers: { personal: [], business: [] },
    results: [],
    testimonials: [],
    faqs: [],
    closingCta: {
      title: '',
      description: '',
      buttonLabel: '',
    },
    videoUrl: '',
    videoTutorialTitle: '',
    tutorialSteps: [],
    paymentProviders: [],
  };
}
