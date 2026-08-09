import {
  MINI_WEBSITE_PAGE_ACTIONS,
  brandForDestination,
  buildMiniWebsiteActions,
} from './mini-website-actions';

type Content = Parameters<typeof buildMiniWebsiteActions>[0];

function content(overrides: Partial<Content> = {}): Content {
  return {
    socialLinks: [],
    services: [],
    bookings: [],
    plans: [],
    specialOffers: [],
    events: [],
    documents: [],
    audio: [],
    team: [],
    ownedProperties: [],
    partners: [],
    videos: [],
    youtubeVideos: [],
    stories: [],
    certificates: [],
    processSteps: [],
    locations: [],
    leadForm: { title: '', fields: [] },
    sections: [],
    ...overrides,
  };
}

const service = {
  id: 'svc-1',
  title: 'Consultation',
  url: 'https://wa.me/9647500000000',
  actionType: 'whatsapp' as const,
  pixelEvent: 'Contact' as const,
};

describe('mini website analytics actions', () => {
  it('always registers the page-level keys the renderer falls back to', () => {
    const keys = buildMiniWebsiteActions(content()).map(
      (action) => action.actionKey,
    );

    for (const page of MINI_WEBSITE_PAGE_ACTIONS)
      expect(keys).toContain(page.key);
  });

  it('registers a row per clickable item, keyed the way the anchor is tagged', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [{ key: 'services', enabled: true }],
        services: [service],
      }),
    );

    const registered = actions.find(
      (action) => action.actionKey === 'mini:service:svc-1',
    );
    expect(registered).toMatchObject({
      // `whatsapp` beats the section's own type: what matters for reporting is
      // the channel the button actually opens.
      actionType: 'whatsapp',
      label: 'Consultation',
      destination: 'https://wa.me/9647500000000',
      tiktokEvent: 'Contact',
    });
  });

  it('skips a section that is switched off', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [{ key: 'services', enabled: false }],
        services: [service],
      }),
    );

    expect(
      actions.some((action) => action.actionKey.startsWith('mini:service:')),
    ).toBe(false);
  });

  it('skips an item with nowhere to go', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [{ key: 'services', enabled: true }],
        // A card with no button cannot be clicked, so a row for it would report
        // a permanent zero and pad the breakdown with noise.
        services: [{ ...service, url: '' }],
      }),
    );

    expect(
      actions.some((action) => action.actionKey.startsWith('mini:service:')),
    ).toBe(false);
  });

  it('registers a story even though an image-only one has no destination', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [{ key: 'stories', enabled: true }],
        stories: [{ id: 'story-1', title: 'Behind the scenes', url: '' }],
      }),
    );

    expect(
      actions.find((action) => action.actionKey === 'mini:story:story-1'),
    ).toMatchObject({
      actionType: 'link',
      destination: null,
      label: 'Behind the scenes',
    });
  });

  it('registers the form even though it has no destination', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [{ key: 'leadForm', enabled: true }],
        leadForm: { title: 'Enquiry', fields: [{}] },
      }),
    );

    expect(
      actions.find((action) => action.actionKey === 'mini:leadForm'),
    ).toMatchObject({
      actionType: 'form',
      destination: null,
      tiktokEvent: 'Lead',
    });
  });

  it('carries a plan straight to checkout rather than a plain click', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [{ key: 'pricing', enabled: true }],
        plans: [
          {
            id: 'plan-1',
            name: 'Pro',
            url: 'https://wa.me/9647500000000',
            actionType: 'whatsapp' as const,
            pixelEvent: 'InitiateCheckout' as const,
          },
        ],
      }),
    );

    expect(
      actions.find((action) => action.actionKey === 'mini:plan:plan-1'),
    ).toMatchObject({ tiktokEvent: 'InitiateCheckout' });
  });

  it('gives every action a unique key', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [
          { key: 'services', enabled: true },
          { key: 'socials', enabled: true },
          { key: 'leadForm', enabled: true },
        ],
        services: [service],
        socialLinks: [
          {
            id: 'social-1',
            platform: 'whatsapp',
            url: 'https://wa.me/9647500000000',
            displayName: 'WhatsApp',
          },
        ],
        leadForm: { title: 'Enquiry', fields: [{}] },
      }),
    );

    const keys = actions.map((action) => action.actionKey);
    // The table has a unique index on (page, action_key); a duplicate would
    // make the upsert overwrite a different button's history.
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('records the brand a social link belongs to rather than leaving it guessed', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [{ key: 'socials', enabled: true }],
        socialLinks: [
          {
            id: 'social-1',
            platform: 'youtube',
            url: 'https://www.youtube.com/@studio',
            // A display name the business was free to type. Read as a label it
            // says nothing about the brand — and «لینک» is simply the Kurdish
            // word for "link", which is what used to make it read as LinkedIn.
            displayName: 'لینکی کەناڵەکەم',
          },
        ],
      }),
    );

    expect(
      actions.find((action) => action.actionKey === 'mini:social:social-1')
        ?.metadata,
    ).toMatchObject({ platform: 'youtube' });
  });

  it('reads the brand off a destination when the content does not name one', () => {
    expect(brandForDestination('https://youtu.be/abc123')).toBe('youtube');
    expect(brandForDestination('https://wa.me/9647500000000')).toBe('whatsapp');
    expect(brandForDestination('https://www.linkedin.com/in/someone')).toBe(
      'linkedin',
    );
    expect(brandForDestination('tel:+9647500000000')).toBe('phone');
    // Nothing recognisable is left unlabelled rather than guessed at.
    expect(brandForDestination('https://example.com/brochure.pdf')).toBeNull();
  });

  it('tags every action with the kind it came from', () => {
    const actions = buildMiniWebsiteActions(
      content({
        sections: [{ key: 'services', enabled: true }],
        services: [service],
      }),
    );

    expect(
      actions.find((action) => action.actionKey === 'mini:service:svc-1')
        ?.metadata,
    ).toMatchObject({ kind: 'service', section: 'service' });
  });
});
