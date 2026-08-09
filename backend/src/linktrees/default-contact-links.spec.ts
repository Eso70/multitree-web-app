import { defaultContactLinks, slugifyLinktreeName } from './linktrees.service';

/**
 * The address a default page lives at.
 *
 * `chk_lt_seo_name` accepts `^[a-z0-9-]+$` and at least two characters, so a
 * name written in Kurdish or Arabic reduces to nothing — the caller has to be
 * able to see that and fall back rather than writing a row the database
 * rejects.
 */
describe('slugifyLinktreeName', () => {
  it('uses a subdomain as-is', () => {
    expect(slugifyLinktreeName('store')).toBe('store');
  });

  it('reduces a business name to a usable slug', () => {
    expect(slugifyLinktreeName('Kurd Store')).toBe('kurd-store');
    expect(slugifyLinktreeName('  Café  &  Co  ')).toBe('caf-co');
  });

  it('returns nothing when no Latin characters survive', () => {
    expect(slugifyLinktreeName('ئیسماعیل')).toBe('');
    expect(slugifyLinktreeName('---')).toBe('');
    expect(slugifyLinktreeName('a')).toBe('');
    expect(slugifyLinktreeName(null)).toBe('');
    expect(slugifyLinktreeName(undefined)).toBe('');
  });

  it('only ever produces what the schema accepts', () => {
    for (const input of ['Kurd', 'MY Shop!!', 'a-b_c', '2026 Store']) {
      const slug = slugifyLinktreeName(input);
      if (slug) expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

/**
 * The buttons a default page is created with.
 *
 * A default page exists so a business that has never opened the builder still
 * has something reachable, so the one thing it must carry is a way to be
 * contacted — built from the number the business registered with, never from
 * anything a client sent.
 */
describe('defaultContactLinks', () => {
  it('builds a WhatsApp and a phone button from the registered number', () => {
    expect(defaultContactLinks('9647501234567')).toEqual([
      { platform: 'whatsapp', url: 'https://wa.me/9647501234567' },
      { platform: 'phone', url: 'tel:+9647501234567' },
    ]);
  });

  it('accepts a number written for humans', () => {
    // Businesses type spaces, dashes and a leading plus. The stored URL has to
    // be digits either way: `wa.me/+964 750...` is not a link.
    expect(defaultContactLinks('+964 750 123 4567')).toEqual([
      { platform: 'whatsapp', url: 'https://wa.me/9647501234567' },
      { platform: 'phone', url: 'tel:+9647501234567' },
    ]);
  });

  it('adds the dialling code to a local number', () => {
    // `businesses.phone` has no country code column beside it and businesses
    // register a local number — the demo business is `7502485829`. Seeding it
    // raw would produce `wa.me/7502485829`, which resolves to nobody.
    expect(defaultContactLinks('7502485829')).toEqual([
      { platform: 'whatsapp', url: 'https://wa.me/9647502485829' },
      { platform: 'phone', url: 'tel:+9647502485829' },
    ]);
  });

  it('drops a leading zero before adding the dialling code', () => {
    expect(defaultContactLinks('07502485829')[0].url).toBe(
      'https://wa.me/9647502485829',
    );
  });

  it('does not stack a second code onto an international number', () => {
    // A business outside Iraq registers with its own code; prefixing 964 would
    // corrupt a number that was already correct.
    expect(defaultContactLinks('447911123456')[0].url).toBe(
      'https://wa.me/447911123456',
    );
  });

  it('produces urls the links table will accept', () => {
    // `links_url_check` allows only http(s), tel:, mailto: and viber: URLs, so
    // a malformed one is rejected by the database rather than stored.
    const pattern = /^https?:\/\/|^tel:|^mailto:|^viber:\/\//;
    for (const link of defaultContactLinks('9647501234567')) {
      expect(link.url).toMatch(pattern);
    }
  });

  it('seeds nothing when there is no usable number', () => {
    // Better an empty page than a button that dials nowhere.
    expect(defaultContactLinks('')).toEqual([]);
    expect(defaultContactLinks(null)).toEqual([]);
    expect(defaultContactLinks('123')).toEqual([]);
    expect(defaultContactLinks('---')).toEqual([]);
  });
});
