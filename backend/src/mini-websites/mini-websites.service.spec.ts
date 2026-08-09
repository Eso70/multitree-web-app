import { mockArg } from '../common/test-utils';
import { BadRequestException, GoneException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { MiniWebsitesService } from './mini-websites.service';
import { PublicPageAnalyticsService } from '../analytics/public-page-analytics.service';

describe('MiniWebsitesService', () => {
  let database: { query: jest.Mock; transaction: jest.Mock };
  let storage: {
    claimBusinessFiles: jest.Mock;
    deleteIfUnreferenced: jest.Mock;
  };
  let service: MiniWebsitesService;

  beforeEach(() => {
    database = {
      query: jest.fn(),
      transaction: jest.fn(),
    };
    storage = {
      claimBusinessFiles: jest.fn(),
      deleteIfUnreferenced: jest.fn(),
    };
    service = new MiniWebsitesService(
      database as unknown as DatabaseService,
      storage as unknown as StorageService,
      {
        forSource: jest.fn().mockResolvedValue({ pixelIds: [], actions: {} }),
      } as unknown as PublicPageAnalyticsService,
    );
  });

  it('returns 410 for a permanently deleted public mini website', async () => {
    database.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });

    await expect(service.getPublic('tenant', 'deleted-page')).rejects.toThrow(
      GoneException,
    );
  });

  it('rejects external image URLs before writing to the database', async () => {
    await expect(
      service.create(
        {
          name: 'Test website',
          slug: 'test-website',
          sections: [],
          avatar: 'https://example.com/avatar.png',
        },
        'business-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(database.transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid banner video URLs before writing to the database', async () => {
    await expect(
      service.create(
        {
          name: 'Test website',
          slug: 'test-website',
          sections: [],
          content: { heroYoutubeUrl: 'not-a-url' },
        },
        'business-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(database.transaction).not.toHaveBeenCalled();
  });

  it('rejects uploaded social icons that do not belong to managed storage', async () => {
    await expect(
      service.create(
        {
          name: 'Test website',
          slug: 'test-website',
          avatar: '/images/DefaultAvatar.png',
          content: {
            heroBackgroundType: 'color',
            heroBackgroundColor: '#000000',
          },
          socialLinks: [
            {
              id: 'website-1',
              platform: 'website',
              value: 'https://example.com',
              url: 'https://example.com',
              customIcon:
                'uploaded-image:opaque:https://example.com/external.png',
            },
          ],
          sections: [],
        },
        'business-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(database.transaction).not.toHaveBeenCalled();
  });

  it('loads only the basic Mini Website fields for the requested business', async () => {
    database.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'mini-1',
          business_id: 'business-1',
          name: 'My website',
          slug: 'my-website',
          status: 'draft',
          headline: '',
          bio: '',
          variation: 'soft',
          background_style: 'dots',
          accent_color: '#b6f20d',
          avatar: null,
          cover: null,
          hero_background_type: 'color',
          hero_background_color: '#000000',
          hero_video_url: '',
          primary_action: 'none',
          whatsapp_number: '',
          pixel_event: 'Contact',
          event_value: 0,
          social_links: [],
          current_version: 1,
          published_at: null,
          created_at: new Date('2026-07-23T00:00:00Z'),
          updated_at: new Date('2026-07-23T00:00:00Z'),
        },
      ],
    });

    const result = await service.get('mini-1', 'business-1');

    expect(mockArg(database.query, 0, 1)).toEqual(['mini-1', 'business-1']);
    expect(result.sections).toEqual([]);
    expect(result.socialLinks).toEqual([]);
    expect(result.backgroundStyle).toBe('dots');
    expect((result as { professionTemplate: string }).professionTemplate).toBe(
      'custom',
    );
    expect(result.content).toEqual({
      heroBackgroundType: 'color',
      heroBackgroundColor: '#000000',
      heroYoutubeUrl: '',
      showShareTools: true,
      showViewCount: true,
    });
  });

  it('reports the real view count on the public page instead of always zero', async () => {
    database.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'mini-1',
            business_id: 'business-1',
            name: 'My website',
            slug: 'my-website',
            status: 'published',
            headline: '',
            bio: '',
            variation: 'soft',
            background_style: 'dots',
            accent_color: '#b6f20d',
            avatar: null,
            cover: null,
            hero_background_type: 'color',
            hero_background_color: '#000000',
            hero_video_url: '',
            primary_action: 'none',
            whatsapp_number: '',
            pixel_event: 'Contact',
            event_value: 0,
            social_links: [],
            current_version: 1,
            published_at: null,
            created_at: new Date('2026-07-23T00:00:00Z'),
            updated_at: new Date('2026-07-23T00:00:00Z'),
            // What the added subquery is for: without it this column is
            // never selected, and the public page shows zero views no
            // matter how much traffic the page actually gets.
            views: '42',
            actions: '7',
            conversions: '1',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.getPublic('acme', 'my-website');

    expect(mockArg(database.query, 0, 1)).toEqual(['acme', 'my-website']);
    expect(result.views).toBe(42);

    const publicQuery = mockArg<string>(database.query, 0, 0);
    // Not the daily rollup's unique_visitors sum: that column only marks a
    // visitor's first-ever event and would undercount a returning visitor
    // across a lifetime total.
    expect(publicQuery).not.toContain('sum(daily.unique_visitors)');
    expect(publicQuery).toContain('COUNT(DISTINCT event.visitor_id)');
    expect(result.actions).toBe(7);
    expect(result.conversions).toBe(1);
  });

  it('keeps valid background styles and falls back to the grid', () => {
    const normalize = (backgroundStyle: unknown) =>
      service['defaults']({
        name: 'Test website',
        slug: 'test-website',
        backgroundStyle,
      }).backgroundStyle;

    expect(normalize('waves')).toBe('waves');
    expect(normalize('grid45')).toBe('grid45');
    expect(normalize('cross')).toBe('cross');
    expect(normalize('circles')).toBe('circles');
    expect(normalize('zigzag')).toBe('zigzag');
    expect(normalize('unsupported')).toBe('grid');
    expect(normalize(undefined)).toBe('grid');
  });

  it('preserves a supported mini website accent gradient', () => {
    const gradient = 'gradient:to-tr:#112233:#aabbcc';

    expect(
      service['defaults']({
        name: 'Gradient website',
        slug: 'gradient-website',
        accentColor: gradient,
      }).accentColor,
    ).toBe(gradient);
  });

  it('allows an unchanged legacy image while still rejecting new external images', () => {
    const externalImage = 'https://images.example.com/legacy-profile.jpg';
    const website = service['defaults']({
      name: 'Legacy website',
      slug: 'legacy-website',
      avatar: externalImage,
      sections: [],
      content: {
        heroBackgroundType: 'color',
        heroBackgroundColor: '#000000',
      },
    });

    expect(() =>
      service['validate'](website, new Set([externalImage])),
    ).not.toThrow();
    expect(() => service['validate'](website)).toThrow(
      'Images must be uploaded before saving',
    );
  });

  it('normalizes sections into the fixed portfolio order', () => {
    const normalized = (
      service as unknown as {
        normalizeSections: (
          value: unknown,
        ) => Array<{ key: string; enabled: boolean }>;
      }
    ).normalizeSections([
      { key: 'location', enabled: true },
      { key: 'gallery', enabled: true },
      { key: 'services', enabled: true },
      { key: 'socials', enabled: true },
    ]);

    expect(normalized.map((section) => section.key)).toEqual([
      'socials',
      'services',
      'gallery',
      'location',
    ]);
  });

  describe('working hours', () => {
    const website = (hours?: Array<Record<string, unknown>>) => ({
      name: 'Test website',
      slug: 'test-website',
      avatar: '/images/DefaultAvatar.png',
      content: {
        heroBackgroundType: 'color',
        heroBackgroundColor: '#000000',
      },
      sections: [{ key: 'hours', enabled: true }],
      ...(hours ? { hours } : {}),
    });

    it('rejects a week with every day closed', async () => {
      await expect(
        service.create(
          website([
            { day: 'sat', closed: true, open: '09:00', close: '18:00' },
          ]),
          'business-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('publishes hours without a location section', async () => {
      database.query.mockResolvedValue({ rows: [] });
      database.transaction.mockResolvedValue({ id: 'mini-1' });

      // Opening times stand on their own: no address is required to say when a
      // business is open.
      await service
        .create(
          website([
            { day: 'sat', closed: false, open: '09:00', close: '18:00' },
          ]),
          'business-1',
        )
        .catch(() => undefined);

      expect(database.transaction).toHaveBeenCalled();
    });

    it('stores a full week, filling in days the client left out', () => {
      const week = service['normalizeWeekHours']([
        { day: 'mon', closed: false, open: '8:30', close: '20:00' },
        { day: 'tue', closed: false, open: '99:99', close: '20:00' },
        { day: 'nope', closed: false, open: '01:00', close: '02:00' },
      ]);

      expect(week).toHaveLength(7);
      expect(week.map((entry) => entry.day)).toEqual([
        'sat',
        'sun',
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
      ]);
      // Padded to two digits, so the stored value is always comparable.
      expect(week[2]).toEqual({
        day: 'mon',
        closed: false,
        open: '08:30',
        close: '20:00',
      });
      // An unusable time falls back rather than being stored as nonsense.
      expect(week[3].open).toBe('09:00');
      // A day the client never sent is stored closed, not open by default.
      expect(week[0].closed).toBe(true);
    });

    it('reads the weekday numbers the database stores', () => {
      const week = service['normalizeWeekHours']([
        { day: 0, closed: false, open: '10:00', close: '22:00' },
      ]);

      // Sunday is 0 in both the column and `Date.prototype.getDay()`.
      expect(week.find((entry) => entry.day === 'sun')).toEqual({
        day: 'sun',
        closed: false,
        open: '10:00',
        close: '22:00',
      });
    });
  });

  describe('gallery', () => {
    const website = (gallery?: Array<Record<string, unknown>>) => ({
      name: 'Test website',
      slug: 'test-website',
      avatar: '/images/DefaultAvatar.png',
      content: {
        heroBackgroundType: 'color',
        heroBackgroundColor: '#000000',
      },
      sections: [{ key: 'gallery', enabled: true }],
      ...(gallery ? { gallery } : {}),
    });

    it('rejects a gallery section with no pictures', async () => {
      await expect(
        service.create(website([]), 'business-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('rejects a picture that was never uploaded here', async () => {
      await expect(
        service.create(
          website([{ id: 'g-1', image: 'https://example.com/photo.png' }]),
          'business-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('drops entries with no picture and caps the list', () => {
      const stored = service['normalizeGallery']([
        { id: 'g-1', image: '/images/upload/a.png', caption: '  ژمارە یەک  ' },
        { id: 'g-2', caption: 'no picture' },
        // A repeated key would collide with the unique index.
        { id: 'g-1', image: '/images/upload/c.png' },
        ...Array.from({ length: 20 }, (_, index) => ({
          id: `bulk-${index}`,
          image: `/images/upload/${index}.png`,
        })),
      ]);

      expect(stored).toHaveLength(12);
      expect(stored[0]).toEqual({
        id: 'g-1',
        image: '/images/upload/a.png',
        caption: 'ژمارە یەک',
      });
      expect(stored.some((image) => !image.image)).toBe(false);
      expect(new Set(stored.map((image) => image.id)).size).toBe(stored.length);
    });
  });

  describe('faq', () => {
    const website = (faq?: Array<Record<string, unknown>>) => ({
      name: 'Test website',
      slug: 'test-website',
      avatar: '/images/DefaultAvatar.png',
      content: {
        heroBackgroundType: 'color',
        heroBackgroundColor: '#000000',
      },
      sections: [{ key: 'faq', enabled: true }],
      ...(faq ? { faq } : {}),
    });

    it('rejects an empty question list', async () => {
      await expect(
        service.create(website([]), 'business-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('drops half-filled entries and caps the list', () => {
      const stored = service['normalizeFaq']([
        { id: 'f-1', question: '  Q1  ', answer: '  A1  ' },
        { id: 'f-2', question: 'no answer' },
        { id: 'f-3', answer: 'no question' },
        // A repeated key would collide with the unique index.
        { id: 'f-1', question: 'again', answer: 'again' },
        ...Array.from({ length: 30 }, (_, index) => ({
          id: `bulk-${index}`,
          question: `Q${index}`,
          answer: `A${index}`,
        })),
      ]);

      expect(stored).toHaveLength(20);
      expect(stored[0]).toEqual({ id: 'f-1', question: 'Q1', answer: 'A1' });
      expect(stored.every((entry) => entry.question && entry.answer)).toBe(
        true,
      );
      expect(new Set(stored.map((entry) => entry.id)).size).toBe(stored.length);
    });
  });

  describe('services', () => {
    const website = (services?: Array<Record<string, unknown>>) => ({
      name: 'Test website',
      slug: 'test-website',
      avatar: '/images/DefaultAvatar.png',
      content: {
        heroBackgroundType: 'color',
        heroBackgroundColor: '#000000',
      },
      sections: [{ key: 'services', enabled: true }],
      ...(services ? { services } : {}),
    });

    it('rejects an empty offers list', async () => {
      await expect(
        service.create(website([]), 'business-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('rejects a link button that does not resolve to a web address', async () => {
      await expect(
        service.create(
          website([
            {
              id: 's-1',
              title: 'Repair',
              actionType: 'link',
              actionValue: 'javascript:alert(1)',
            },
          ]),
          'business-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('builds the destination itself and ignores one sent by the client', () => {
      const [whatsapp, phone, link, off] = service['normalizeServices']([
        {
          id: 's-1',
          title: 'WhatsApp',
          actionType: 'whatsapp',
          actionValue: '07501234567',
          actionCountryCode: '964',
          // A client-supplied URL is never trusted.
          url: 'javascript:alert(1)',
        },
        {
          id: 's-2',
          title: 'Call',
          actionType: 'phone',
          actionValue: '750 123 4567',
          actionCountryCode: '964',
        },
        {
          id: 's-3',
          title: 'Site',
          actionType: 'link',
          actionValue: 'https://example.com',
        },
        { id: 's-4', title: 'No button', actionType: 'none' },
      ]);

      // The leading zero of a national number is dropped before the code.
      expect(whatsapp.url).toBe('https://wa.me/9647501234567');
      expect(phone.url).toBe('tel:+9647501234567');
      expect(link.url).toBe('https://example.com');
      expect(off.url).toBe('');
    });

    it('rejects a picture that was never uploaded here', async () => {
      await expect(
        service.create(
          website([
            { id: 's-1', title: 'Repair', image: 'https://example.com/x.png' },
          ]),
          'business-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('drops nameless offers and falls back to a known event', () => {
      const stored = service['normalizeServices']([
        {
          id: 's-1',
          title: '  Repair  ',
          description: '  fast  ',
          price: ' 25,000 ',
          pixelEvent: 'Lead',
        },
        // A price with no name is not something a customer can read.
        { id: 's-2', price: '10' },
        // An event the client invented cannot reach the pixel.
        { id: 's-3', title: 'Setup', pixelEvent: 'MadeUp' },
        // A repeated key would collide with the unique index.
        { id: 's-1', title: 'Again' },
      ]);

      expect(stored).toHaveLength(2);
      expect(stored[0]).toMatchObject({
        id: 's-1',
        title: 'Repair',
        description: 'fast',
        price: '25,000',
        pixelEvent: 'Lead',
      });
      expect(stored[1].pixelEvent).toBe('None');
    });

    it('caps the list', () => {
      const stored = service['normalizeServices'](
        Array.from({ length: 40 }, (_, index) => ({
          id: `s-${index}`,
          title: `Offer ${index}`,
        })),
      );
      expect(stored).toHaveLength(24);
    });
  });

  describe('bookings', () => {
    const website = (bookings?: Array<Record<string, unknown>>) => ({
      name: 'Test website',
      slug: 'test-website',
      avatar: '/images/DefaultAvatar.png',
      content: {
        heroBackgroundType: 'color',
        heroBackgroundColor: '#000000',
      },
      sections: [{ key: 'booking', enabled: true }],
      ...(bookings ? { bookings } : {}),
    });

    it('rejects a booking section with no appointments', async () => {
      await expect(
        service.create(website([]), 'business-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('rejects an insecure scheduler destination', async () => {
      await expect(
        service.create(
          website([
            {
              id: 'b-1',
              title: 'Consultation',
              provider: 'custom',
              actionValue: 'http://example.com/book',
            },
          ]),
          'business-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('builds trusted destinations and normalizes appointment details', () => {
      const [scheduler, whatsapp] = service['normalizeBookings']([
        {
          id: 'b-1',
          title: '  Consultation  ',
          description: '  First visit  ',
          durationMinutes: 2,
          price: '  Free  ',
          provider: 'calendly',
          actionValue: 'https://calendly.com/acme/consultation',
          url: 'javascript:alert(1)',
        },
        {
          id: 'b-2',
          title: 'WhatsApp booking',
          durationMinutes: 2000,
          provider: 'whatsapp',
          actionValue: '0750 123 4567',
          actionCountryCode: '+964',
        },
      ]);

      expect(scheduler).toMatchObject({
        id: 'b-1',
        title: 'Consultation',
        description: 'First visit',
        durationMinutes: 5,
        price: 'Free',
        provider: 'calendly',
        url: 'https://calendly.com/acme/consultation',
      });
      expect(whatsapp).toMatchObject({
        durationMinutes: 1440,
        provider: 'whatsapp',
        actionValue: '07501234567',
        actionCountryCode: '964',
        url: 'https://wa.me/9647501234567',
      });
    });

    it('drops nameless and duplicate appointments and caps the list', () => {
      const stored = service['normalizeBookings']([
        { id: 'b-1', title: 'First', actionValue: 'https://example.com/1' },
        { id: 'b-2', actionValue: 'https://example.com/2' },
        { id: 'b-1', title: 'Duplicate', actionValue: 'https://example.com/3' },
        ...Array.from({ length: 20 }, (_, index) => ({
          id: `bulk-${index}`,
          title: `Appointment ${index}`,
          actionValue: `https://example.com/${index}`,
        })),
      ]);

      expect(stored).toHaveLength(12);
      expect(stored[0].title).toBe('First');
      expect(new Set(stored.map((booking) => booking.id)).size).toBe(
        stored.length,
      );
    });
  });

  describe('team', () => {
    const website = (team?: Array<Record<string, unknown>>) => ({
      name: 'Test website',
      slug: 'test-website',
      avatar: '/images/DefaultAvatar.png',
      content: {
        heroBackgroundType: 'color',
        heroBackgroundColor: '#000000',
      },
      sections: [{ key: 'team', enabled: true }],
      ...(team ? { team } : {}),
    });

    it('rejects an empty team section', async () => {
      await expect(
        service.create(website([]), 'business-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('requires a role and a usable optional action', async () => {
      await expect(
        service.create(
          website([{ id: 't-1', name: 'Aram', role: '' }]),
          'business-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create(
          website([
            {
              id: 't-1',
              name: 'Aram',
              role: 'Specialist',
              actionType: 'link',
              actionValue: 'javascript:alert(1)',
            },
          ]),
          'business-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('normalizes team details and builds the action itself', () => {
      const [member] = service['normalizeTeam']([
        {
          id: 't-1',
          name: '  Aram  ',
          role: '  Dentist  ',
          experience: '  8 years  ',
          bio: '  Specialist bio  ',
          actionType: 'whatsapp',
          actionValue: '0750 123 4567',
          actionCountryCode: '+964',
          url: 'javascript:alert(1)',
        },
      ]);

      expect(member).toMatchObject({
        id: 't-1',
        name: 'Aram',
        role: 'Dentist',
        experience: '8 years',
        bio: 'Specialist bio',
        actionValue: '07501234567',
        actionCountryCode: '964',
        url: 'https://wa.me/9647501234567',
      });
    });

    it('drops nameless and duplicate members and caps the list', () => {
      const stored = service['normalizeTeam']([
        { id: 't-1', name: 'First', role: 'Lead' },
        { id: 't-2', role: 'No name' },
        { id: 't-1', name: 'Duplicate', role: 'Lead' },
        ...Array.from({ length: 20 }, (_, index) => ({
          id: `bulk-${index}`,
          name: `Member ${index}`,
          role: 'Specialist',
        })),
      ]);

      expect(stored).toHaveLength(12);
      expect(stored[0].name).toBe('First');
      expect(new Set(stored.map((member) => member.id)).size).toBe(
        stored.length,
      );
    });
  });

  describe('certificates, videos and partners', () => {
    it('normalizes certificate verification links', () => {
      const [certificate] = service['normalizeCertificates']([
        {
          id: 'c-1',
          title: '  Excellence  ',
          issuer: '  Institute  ',
          year: '  2026  ',
          verificationUrl: 'https://example.com/verify',
        },
      ]);
      expect(certificate).toMatchObject({
        title: 'Excellence',
        issuer: 'Institute',
        year: '2026',
        verificationUrl: 'https://example.com/verify',
      });
    });

    it('keeps only unique social reels and shorts', () => {
      const videos = service['normalizeVideos']([
        {
          id: 'v-1',
          title: 'YouTube Short',
          platform: 'other',
          url: 'https://youtube.com/shorts/abcdefghijk',
        },
        {
          id: 'v-2',
          title: 'Long YouTube video',
          platform: 'youtube',
          url: 'https://youtube.com/watch?v=abcdefghijk',
        },
        {
          id: 'v-3',
          title: 'Duplicate short',
          platform: 'youtube',
          url: 'https://youtube.com/shorts/abcdefghijk',
        },
      ]);
      expect(videos).toEqual([
        {
          id: 'v-1',
          title: 'YouTube Short',
          platform: 'youtube',
          url: 'https://youtube.com/shorts/abcdefghijk',
        },
      ]);
    });

    it('keeps up to three unique standard YouTube videos and rejects shorts', () => {
      const videos = service['normalizeYoutubeVideos']([
        {
          id: 'yt-1',
          title: 'Standard video',
          url: 'https://youtube.com/watch?v=abcdefghijk',
        },
        {
          id: 'yt-2',
          title: 'Short',
          url: 'https://youtube.com/shorts/zyxwvutsrqp',
        },
        {
          id: 'yt-3',
          title: 'Duplicate',
          url: 'https://youtube.com/watch?v=abcdefghijk',
        },
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `yt-extra-${index}`,
          title: `Video ${index}`,
          url: `https://youtube.com/watch?v=abcdefghi${index}k`,
        })),
      ]);

      expect(videos).toHaveLength(3);
      expect(videos.every((video) => video.platform === 'youtube')).toBe(true);
      expect(videos.map((video) => video.id)).toEqual([
        'yt-1',
        'yt-extra-0',
        'yt-extra-1',
      ]);
    });

    it('keeps only partner rows that have uploaded logo values', () => {
      const partners = service['normalizePartners']([
        {
          id: 'p-1',
          name: 'Brand',
          image: '/images/upload/brand.png',
          url: 'https://brand.example',
        },
        { id: 'p-2', name: 'No logo' },
      ]);
      expect(partners).toEqual([
        {
          id: 'p-1',
          name: 'Brand',
          image: '/images/upload/brand.png',
          url: 'https://brand.example',
        },
      ]);
    });
  });

  describe('reviews', () => {
    const website = (reviews?: Array<Record<string, unknown>>) => ({
      name: 'Test website',
      slug: 'test-website',
      avatar: '/images/DefaultAvatar.png',
      content: {
        heroBackgroundType: 'color',
        heroBackgroundColor: '#000000',
      },
      sections: [{ key: 'reviews', enabled: true }],
      ...(reviews ? { reviews } : {}),
    });

    it('rejects an empty reviews list', async () => {
      await expect(
        service.create(website([]), 'business-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(database.transaction).not.toHaveBeenCalled();
    });

    it('drops half-filled reviews and clamps the rating', () => {
      const stored = service['normalizeReviews']([
        { id: 'r-1', author: '  Aram  ', text: '  Great  ', rating: 4 },
        // Stars on their own are not a review.
        { id: 'r-2', rating: 5 },
        { id: 'r-3', author: 'No words' },
        // A scale nobody else uses is brought back into range.
        { id: 'r-4', author: 'Sara', text: 'Good', rating: 9 },
        { id: 'r-5', author: 'Dana', text: 'Fine', rating: 0 },
        { id: 'r-6', author: 'Hemin', text: 'Nice' },
      ]);

      expect(stored.map((review) => review.id)).toEqual([
        'r-1',
        'r-4',
        'r-5',
        'r-6',
      ]);
      expect(stored[0]).toEqual({
        id: 'r-1',
        author: 'Aram',
        text: 'Great',
        // Optional, so a review saved without a photo stores an empty string.
        image: '',
        rating: 4,
      });
      expect(stored[1].rating).toBe(5);
      expect(stored[2].rating).toBe(1);
      // An unrated review reads as a full recommendation, not as zero stars.
      expect(stored[3].rating).toBe(5);
    });

    it('caps the list', () => {
      const stored = service['normalizeReviews'](
        Array.from({ length: 40 }, (_, index) => ({
          id: `r-${index}`,
          author: `A${index}`,
          text: 'Good',
        })),
      );
      expect(stored).toHaveLength(24);
    });
  });

  describe('before/after and service coverage', () => {
    it('keeps complete comparison pairs and their labels', () => {
      const comparisons = service['normalizeBeforeAfter']([
        {
          id: 'comparison-1',
          title: '  Renovation  ',
          beforeImage: '/images/upload/before.png',
          afterImage: '/images/upload/after.png',
          beforeLabel: ' Old ',
          afterLabel: ' New ',
        },
        {
          id: 'comparison-2',
          title: 'Missing after',
          beforeImage: '/images/upload/before-2.png',
        },
      ]);

      expect(comparisons).toEqual([
        {
          id: 'comparison-1',
          title: 'Renovation',
          description: '',
          beforeImage: '/images/upload/before.png',
          afterImage: '/images/upload/after.png',
          beforeLabel: 'Old',
          afterLabel: 'New',
        },
      ]);
    });

    it('keeps named languages and rejects non-language kinds', () => {
      const coverage = service['normalizeCoverage']([
        {
          id: 'language-1',
          kind: 'language',
          name: ' Kurdish ',
          detail: 'Native',
        },
        { id: 'area-1', kind: 'area', name: ' Erbil ' },
        { id: 'unknown-1', kind: 'planet', name: 'Mars' },
      ]);

      expect(coverage).toEqual([
        {
          id: 'language-1',
          kind: 'language',
          name: 'Kurdish',
          detail: 'Native',
        },
      ]);
    });
  });

  describe('payments, offers, events, audio, advantages and documents', () => {
    it('normalizes common Iraqi payment methods and custom details', () => {
      const methods = service['normalizePaymentMethods']([
        {
          id: 'payment-1',
          provider: 'fib',
          name: ' FIB ',
          accountName: ' Business ',
          accountNumber: ' 12345 ',
        },
        { id: 'payment-2', provider: 'unknown', name: 'Local wallet' },
      ]);

      expect(methods).toEqual([
        expect.objectContaining({
          id: 'payment-1',
          provider: 'fib',
          name: 'FIB',
          accountName: 'Business',
          accountNumber: '12345',
        }),
        expect.objectContaining({
          id: 'payment-2',
          provider: 'custom',
          name: 'Local wallet',
        }),
      ]);
    });

    it('keeps secure destinations and rejects incomplete entries', () => {
      const offers = service['normalizeSpecialOffers']([
        {
          id: 'offer-1',
          title: ' Offer ',
          expiresAt: '2026-12-31',
          url: 'https://example.com/offer',
        },
        { id: 'offer-2', title: '' },
      ]);
      const events = service['normalizeEvents']([
        {
          id: 'event-1',
          title: 'Workshop',
          startsAt: '2026-08-20T18:00',
          registrationUrl: 'https://example.com/register',
        },
        { id: 'event-2', title: 'Missing date' },
      ]);
      const audio = service['normalizeAudio']([
        {
          id: 'audio-1',
          title: 'Episode',
          platform: 'spotify',
          url: 'https://open.spotify.com/episode/example',
        },
        { id: 'audio-2', title: 'Unsafe', url: 'javascript:alert(1)' },
      ]);
      const advantages = service['normalizeAdvantages']([
        { id: 'advantage-1', title: 'Trusted', icon: 'shield' },
      ]);
      const documents = service['normalizeDocuments']([
        {
          id: 'document-1',
          title: 'Report',
          fileUrl: 'https://example.com/report.pdf',
          fileType: 'PDF',
        },
        { id: 'document-2', title: 'Unsafe', fileUrl: 'data:text/plain,test' },
      ]);

      expect(offers).toHaveLength(1);
      expect(events).toHaveLength(1);
      expect(audio).toHaveLength(1);
      expect(advantages[0].icon).toBe('shield');
      expect(documents).toEqual([
        expect.objectContaining({
          id: 'document-1',
          fileUrl: 'https://example.com/report.pdf',
          fileType: 'PDF',
        }),
      ]);
    });
  });

  describe('owned brands and pages', () => {
    it('detects supported social platforms from official URLs', () => {
      const properties = service['normalizeOwnedProperties']([
        {
          id: 'property-1',
          name: ' Example Media ',
          relationship: ' Founder ',
          propertyType: 'brand',
          url: 'https://www.youtube.com/@example',
          featuredUrl: 'https://www.youtube.com/watch?v=example',
          foundedYear: ' 2024 ',
        },
        {
          id: 'property-2',
          name: 'Instagram page',
          relationship: 'Owner',
          propertyType: 'company',
          url: 'https://instagram.com/example',
        },
        {
          id: 'property-3',
          name: 'Missing relationship',
          url: 'https://example.com',
        },
      ]);

      expect(properties).toEqual([
        expect.objectContaining({
          id: 'property-1',
          name: 'Example Media',
          relationship: 'Founder',
          propertyType: 'youtube',
          foundedYear: '2024',
        }),
        expect.objectContaining({
          id: 'property-2',
          propertyType: 'instagram',
        }),
      ]);
    });
  });

  describe('education history', () => {
    it('normalizes current and completed study entries', () => {
      const entries = service['normalizeEducation']([
        {
          id: 'education-1',
          institution: ' University of Example ',
          degree: ' Bachelor of Science ',
          fieldOfStudy: ' Engineering ',
          startYear: ' 2022 ',
          endYear: '2026',
          status: 'studying',
          verificationUrl: 'https://example.edu/student',
        },
        {
          id: 'education-2',
          institution: 'Example School',
          degree: 'High School Diploma',
          startYear: '2018',
          endYear: '2021',
          status: 'graduated',
        },
        {
          id: 'education-3',
          institution: 'Missing degree',
          startYear: '2020',
        },
      ]);

      expect(entries).toEqual([
        expect.objectContaining({
          id: 'education-1',
          institution: 'University of Example',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Engineering',
          startYear: '2022',
          endYear: '',
          status: 'studying',
        }),
        expect.objectContaining({
          id: 'education-2',
          endYear: '2021',
          status: 'graduated',
        }),
      ]);
    });
  });

  describe('content rows', () => {
    it('writes sections, links, branches and the page-level week', async () => {
      const client = {
        query: jest
          .fn<Promise<{ rows: Array<{ id: string }> }>, [string, unknown[]?]>()
          .mockResolvedValue({ rows: [{ id: 'location-1' }] }),
      };
      database.transaction.mockImplementation(
        async (run: (client: unknown) => Promise<unknown>) => run(client),
      );
      // Slug availability, then the read-back after the write.
      database.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service
        .create(
          {
            name: 'Test website',
            slug: 'test-website',
            avatar: '/images/DefaultAvatar.png',
            content: {
              heroBackgroundType: 'color',
              heroBackgroundColor: '#000000',
            },
            sections: [
              { key: 'socials', enabled: true },
              { key: 'location', enabled: true },
            ],
            socialLinks: [
              {
                id: 'website-1',
                platform: 'website',
                value: 'https://example.com',
                url: 'https://example.com',
              },
            ],
            locations: [
              { address: 'Erbil', lat: 36.19, lng: 44.0, precision: 'exact' },
            ],
          },
          'business-1',
        )
        .catch(() => undefined);

      const calls = client.query.mock.calls;
      const statements = calls.map((call) =>
        call[0].replace(/\s+/g, ' ').trim(),
      );
      const find = (fragment: string) =>
        statements.findIndex((statement) => statement.includes(fragment));

      // Each list is cleared before it is rewritten, so a removed row cannot
      // survive a save.
      expect(find('DELETE FROM mini_website_sections')).toBeGreaterThanOrEqual(
        0,
      );
      expect(
        find('DELETE FROM mini_website_social_links'),
      ).toBeGreaterThanOrEqual(0);
      expect(find('DELETE FROM mini_website_locations')).toBeGreaterThanOrEqual(
        0,
      );
      expect(find('INSERT INTO mini_website_sections')).toBeGreaterThan(
        find('DELETE FROM mini_website_sections'),
      );

      const links = calls.find((call) =>
        call[0].includes('INSERT INTO mini_website_social_links'),
      );
      // The editor's own id is stored as `link_key`, so it survives the rewrite.
      expect(links?.[1]).toContain('website-1');

      const items = calls.filter((call) =>
        call[0].includes('DELETE FROM mini_website_items'),
      );
      // Each list-shaped section clears only its own rows.
      expect(items.map((call) => call[1]?.[1])).toEqual([
        'gallery',
        'faq',
        'services',
        'booking',
        'team',
        'credentials',
        'shortVideos',
        'youtubeVideos',
        'stories',
        'partners',
        'reviews',
        'beforeAfter',
        'serviceAreas',
        'payments',
        'offers',
        'events',
        'audio',
        'whyChooseUs',
        'impactStats',
        'process',
        'documents',
        'ownedProperties',
        'education',
        'experience',
        'leadForm',
        'pricing',
      ]);

      const hours = calls.find((call) =>
        call[0].includes('INSERT INTO mini_website_hours'),
      );
      // One row per weekday, four values each, after the website id — written
      // once for the page rather than once per branch.
      expect(hours?.[1]).toHaveLength(1 + 7 * 4);
    });
  });
});
