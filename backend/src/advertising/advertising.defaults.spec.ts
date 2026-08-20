import { createDefaultAdvertisingConfig } from './advertising.defaults';

describe('advertising defaults', () => {
  it('starts without demo content or media', () => {
    const config = createDefaultAdvertisingConfig('+964 750 123 4567');

    expect(config).toMatchObject({
      status: 'draft',
      title: '',
      description: '',
      whatsappNumber: '9647501234567',
      packageCategories: [
        { id: 'personal', label: 'کەسی', color: 'lime' },
        { id: 'business', label: 'بازرگانی', color: 'violet' },
      ],
      packageTiers: { personal: [], business: [] },
      results: [],
      testimonials: [],
      faqs: [],
      closingCta: { title: '', description: '', buttonLabel: '' },
      videoUrl: '',
      videoTutorialTitle: '',
      tutorialSteps: [],
      paymentProviders: [],
    });
    expect(config.receiptExampleImageUrl).toBeUndefined();
  });
});
