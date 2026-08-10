import {
  isRootDomainHost,
  rootDomainHostname,
  rootDomainPort,
} from './root-domain';

describe('rootDomainHostname', () => {
  it('returns a bare domain unchanged', () => {
    expect(rootDomainHostname('sponsor.krd')).toBe('sponsor.krd');
  });

  it('strips a development port', () => {
    expect(rootDomainHostname('lvh.me:3011')).toBe('lvh.me');
  });

  it('normalizes case, surrounding space, and a fully-qualified trailing dot', () => {
    expect(rootDomainHostname('  Sponsor.KRD.  ')).toBe('sponsor.krd');
  });
});

describe('rootDomainPort', () => {
  it('is empty for a bare domain', () => {
    expect(rootDomainPort('sponsor.krd')).toBe('');
  });

  it('returns the port with its leading colon', () => {
    expect(rootDomainPort('lvh.me:3011')).toBe(':3011');
  });

  it('ignores a non-numeric port', () => {
    expect(rootDomainPort('lvh.me:abc')).toBe('');
  });
});

describe('isRootDomainHost', () => {
  it('matches the root domain itself', () => {
    expect(isRootDomainHost('sponsor.krd', 'sponsor.krd')).toBe(true);
  });

  it('matches a business subdomain', () => {
    expect(isRootDomainHost('acme.sponsor.krd', 'sponsor.krd')).toBe(true);
  });

  it('matches when the configured root domain carries a development port', () => {
    expect(isRootDomainHost('acme.lvh.me', 'lvh.me:3011')).toBe(true);
    expect(isRootDomainHost('lvh.me', 'lvh.me:3011')).toBe(true);
  });

  it('rejects an unrelated domain', () => {
    expect(isRootDomainHost('example.com', 'sponsor.krd')).toBe(false);
  });

  it('rejects a suffix that is not a subdomain boundary', () => {
    expect(isRootDomainHost('notsponsor.krd', 'sponsor.krd')).toBe(false);
    expect(isRootDomainHost('evil-sponsor.krd', 'sponsor.krd')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isRootDomainHost('', 'sponsor.krd')).toBe(false);
    expect(isRootDomainHost('sponsor.krd', '')).toBe(false);
  });
});
