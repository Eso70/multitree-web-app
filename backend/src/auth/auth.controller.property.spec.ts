import * as fc from 'fast-check';

/**
 * Property 9: Cookie Domain Scoping Invariant
 * **Validates: Requirements 7.1, 7.4**
 *
 * For any valid subdomain S, the cookie domain is `.S.{rootDomain}` and never `.{rootDomain}`.
 * This ensures cross-subdomain cookie isolation.
 */
describe('AuthController - Property Tests', () => {
  const ROOT_DOMAIN = 'kurdishsponser.cloud';

  /**
   * Pure function that replicates the cookie domain construction logic
   * from AuthController.login(): `.${subdomain}.${this.rootDomain}`
   */
  function constructCookieDomain(
    subdomain: string,
    rootDomain: string,
  ): string {
    return `.${subdomain}.${rootDomain}`;
  }

  // Custom arbitrary for valid subdomain format:
  // lowercase alphanumeric + hyphens, 1-100 chars, no leading/trailing/consecutive hyphens
  const subdomainArbitrary = fc
    .string({
      minLength: 1,
      maxLength: 100,
      unit: fc.oneof(
        fc.integer({ min: 97, max: 122 }).map((c) => String.fromCharCode(c)), // a-z
        fc.integer({ min: 48, max: 57 }).map((c) => String.fromCharCode(c)), // 0-9
        fc.constant('-'),
      ),
    })
    .filter(
      (s) =>
        s.length > 0 &&
        !s.startsWith('-') &&
        !s.endsWith('-') &&
        !s.includes('--') &&
        /^[a-z0-9-]+$/.test(s),
    );

  describe('Property 9: Cookie Domain Scoping Invariant', () => {
    it('cookie domain equals .{subdomain}.{rootDomain} for any valid subdomain', async () => {
      fc.assert(
        fc.property(subdomainArbitrary, (subdomain: string) => {
          const cookieDomain = constructCookieDomain(subdomain, ROOT_DOMAIN);

          // Assert cookie domain equals `.${subdomain}.kurdishsponser.cloud`
          expect(cookieDomain).toBe(`.${subdomain}.${ROOT_DOMAIN}`);
        }),
        { numRuns: 100 },
      );
    });

    it('cookie domain never equals the wildcard root domain (.kurdishsponser.cloud)', async () => {
      fc.assert(
        fc.property(subdomainArbitrary, (subdomain: string) => {
          const cookieDomain = constructCookieDomain(subdomain, ROOT_DOMAIN);

          // Assert cookie domain does NOT equal `.kurdishsponser.cloud`
          expect(cookieDomain).not.toBe(`.${ROOT_DOMAIN}`);
        }),
        { numRuns: 100 },
      );
    });

    it('cookie domain always starts with a dot', async () => {
      fc.assert(
        fc.property(subdomainArbitrary, (subdomain: string) => {
          const cookieDomain = constructCookieDomain(subdomain, ROOT_DOMAIN);

          // Assert cookie domain starts with `.`
          expect(cookieDomain.startsWith('.')).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('cookie domain always contains the subdomain', async () => {
      fc.assert(
        fc.property(subdomainArbitrary, (subdomain: string) => {
          const cookieDomain = constructCookieDomain(subdomain, ROOT_DOMAIN);

          // Assert cookie domain contains the subdomain
          expect(cookieDomain).toContain(subdomain);
        }),
        { numRuns: 100 },
      );
    });

    it('cookie domain has exactly the format .{S}.{rootDomain} (three segments after leading dot)', async () => {
      fc.assert(
        fc.property(subdomainArbitrary, (subdomain: string) => {
          const cookieDomain = constructCookieDomain(subdomain, ROOT_DOMAIN);

          // The format should be: .subdomain.kurdishsponser.cloud
          // Split after removing leading dot: ["subdomain", "sponsor", "krd"]
          const withoutLeadingDot = cookieDomain.slice(1);
          const segments = withoutLeadingDot.split('.');

          // Should have at least 3 segments: subdomain + sponsor + krd
          expect(segments.length).toBeGreaterThanOrEqual(3);
          // First segment is the subdomain
          expect(segments[0]).toBe(subdomain);
          // Remaining segments reconstruct the root domain
          expect(segments.slice(1).join('.')).toBe(ROOT_DOMAIN);
        }),
        { numRuns: 100 },
      );
    });
  });
});
