import type { AdvertisingServiceConfig } from '@linktree/types';
import {
  projectAdvertisingConfig,
  type AdvertisingContentRows,
  type AdvertisingPageRow,
} from './advertising.projection';
import { mergeConfig, stableStringify } from './advertising.service';

const page: AdvertisingPageRow = {
  id: 'page-1',
  business_id: 'business-1',
  status: 'published',
  current_version: 3,
  title: 'Title',
  description: 'Description',
  closing_cta_title: 'CTA',
  closing_cta_description: 'CTA description',
  closing_cta_button_label: 'Start',
  whatsapp_number: '9647500000000',
  video_url: '',
  video_tutorial_title: 'How to',
  tutorial_steps: ['one', 'two'],
  receipt_example_image_url: '',
  published_at: null,
};

function rows(
  overrides: Partial<AdvertisingContentRows> = {},
): AdvertisingContentRows {
  return {
    page,
    sections: [
      { section_key: 'hero', enabled: true },
      { section_key: 'results', enabled: false },
    ],
    categories: [
      {
        id: 'uuid-personal',
        category_key: 'personal',
        label: 'Personal',
        color: 'lime',
      },
      {
        id: 'uuid-business',
        category_key: 'business',
        label: 'Business',
        color: '#3b82f6',
      },
    ],
    tiers: [
      {
        category_id: 'uuid-personal',
        tier_key: 'p1',
        price: '15000.00',
        views_label: '25K',
      },
      {
        category_id: 'uuid-business',
        tier_key: 'b1',
        price: '25000.00',
        views_label: '40K',
      },
    ],
    results: [],
    testimonials: [],
    faqs: [],
    providers: [],
    ...overrides,
  };
}

describe('projectAdvertisingConfig', () => {
  it('keys package tiers by the editor key, not the row id', () => {
    const config = projectAdvertisingConfig(rows());
    expect(Object.keys(config.packageTiers).sort()).toEqual([
      'business',
      'personal',
    ]);
    expect(config.packageTiers.personal[0]).toEqual({
      id: 'p1',
      price: 15000,
      views: '25K',
    });
  });

  it('gives every category an entry even with no tiers', () => {
    const config = projectAdvertisingConfig(rows({ tiers: [] }));
    expect(config.packageTiers).toEqual({ personal: [], business: [] });
  });

  it('treats a section with no row as visible and honours a disabled one', () => {
    const config = projectAdvertisingConfig(rows());
    // 'results' has an explicit disabled row; 'faq' has no row at all.
    expect(config.sections.results).toBe(false);
    expect(config.sections.faq).toBe(true);
    expect(config.sections.hero).toBe(true);
  });

  it('converts numeric strings from pg into numbers', () => {
    const config = projectAdvertisingConfig(
      rows({
        results: [
          {
            item_key: 'r1',
            category: 'Retail',
            before_label: '2K',
            after_label: '158K',
            price: '60000.00',
            color: 'indigo',
            before_image_url: '',
            after_image_url: '/images/after.png',
          },
        ],
      }),
    );
    expect(config.results[0].price).toBe(60000);
    // An empty media column means unset, not an empty src.
    expect(config.results[0].beforeImageUrl).toBeUndefined();
    expect(config.results[0].afterImageUrl).toBe('/images/after.png');
  });

  it('falls back rather than emitting a colour the renderer cannot theme', () => {
    const config = projectAdvertisingConfig(
      rows({
        testimonials: [
          {
            item_key: 't1',
            name: 'A',
            role: 'B',
            quote: 'C',
            color: 'chartreuse',
            avatar_url: '',
          },
        ],
      }),
    );
    expect(config.testimonials[0].color).toBe('orange');
  });
});

describe('stableStringify', () => {
  /**
   * The published snapshot is jsonb, and PostgreSQL returns its keys sorted by
   * length then bytewise, not in the order the config was built. A plain
   * JSON.stringify comparison is therefore always unequal, which would pin
   * `hasUnpublishedChanges` to true forever.
   */
  it('ignores object key order', () => {
    const projected = projectAdvertisingConfig(rows());
    // The order PostgreSQL actually hands back, observed from a round trip.
    const fromJsonb = Object.fromEntries(
      Object.entries(projected).sort(
        ([a], [b]) => a.length - b.length || (a < b ? -1 : 1),
      ),
    );
    expect(Object.keys(fromJsonb)).not.toEqual(Object.keys(projected));
    expect(JSON.stringify(fromJsonb)).not.toEqual(JSON.stringify(projected));
    expect(stableStringify(fromJsonb)).toEqual(stableStringify(projected));
  });

  it('still treats a changed value as a change', () => {
    const projected = projectAdvertisingConfig(rows());
    expect(stableStringify({ ...projected, title: 'Other' })).not.toEqual(
      stableStringify(projected),
    );
  });

  it('keeps array order significant, since it is the display order', () => {
    expect(stableStringify([1, 2])).not.toEqual(stableStringify([2, 1]));
  });

  it('treats an unset optional field as equal to an omitted one', () => {
    expect(stableStringify({ a: 1, b: undefined })).toEqual(
      stableStringify({ a: 1 }),
    );
  });
});

describe('mergeConfig', () => {
  const current = projectAdvertisingConfig(rows());

  it('leaves absent fields alone', () => {
    const merged = mergeConfig(current, { title: 'New' });
    expect(merged.title).toBe('New');
    expect(merged.description).toBe(current.description);
    expect(merged.packageCategories).toEqual(current.packageCategories);
  });

  it('strips everything that is not a digit from the WhatsApp number', () => {
    const merged = mergeConfig(current, {
      whatsappNumber: '+964 750 111 2222',
    });
    expect(merged.whatsappNumber).toBe('9647501112222');
  });

  it('replaces categories and their tiers together', () => {
    const merged = mergeConfig(current, {
      packageCategories: [
        {
          id: 'personal',
          label: 'Renamed',
          color: 'lime',
          tiers: [{ id: 'p1', price: 99, views: '1K' }],
        },
      ],
    });
    // The dropped category takes its tiers with it: no orphan key can survive.
    expect(Object.keys(merged.packageTiers)).toEqual(['personal']);
    expect(merged.packageCategories).toHaveLength(1);
    expect(merged.packageTiers.personal[0].price).toBe(99);
  });

  it('clears the receipt image when sent null', () => {
    const withImage: AdvertisingServiceConfig = {
      ...current,
      receiptExampleImageUrl: '/images/receipt.png',
    };
    expect(
      mergeConfig(withImage, { receiptExampleImageUrl: null })
        .receiptExampleImageUrl,
    ).toBeUndefined();
  });
});
