import { BadRequestException } from '@nestjs/common';
import {
  RESERVED_BUSINESS_SUBDOMAINS,
  normalizeBusinessSubdomain,
} from './business-subdomain';

/**
 * `businesses.subdomain` has two writers — signup provisioning and the platform
 * administration console. Only the first applied this rule, so the console
 * accepted reserved labels that leave a tenant unreachable and passed malformed
 * ones through to the column constraint as an unmapped SQLSTATE.
 */
describe('normalizeBusinessSubdomain', () => {
  it('accepts an ordinary label and returns it normalized', () => {
    expect(normalizeBusinessSubdomain('  Acme-Coffee  ')).toBe('acme-coffee');
  });

  it.each(['www', 'api', 'admin', 'bio', 'linktree'])(
    'refuses %s, which the platform answers on itself',
    (reserved) => {
      expect(() => normalizeBusinessSubdomain(reserved)).toThrow(
        BadRequestException,
      );
    },
  );

  it.each([
    ['-shop', 'a leading hyphen'],
    ['shop-', 'a trailing hyphen'],
    ['my shop', 'a space'],
    ['my_shop', 'an underscore'],
    ['', 'nothing at all'],
  ])('refuses %s (%s)', (value) => {
    // Each of these passes `trim().toLowerCase()` untouched and would reach
    // `businesses_subdomain_check` as SQLSTATE 23514, which nothing maps.
    expect(() => normalizeBusinessSubdomain(value)).toThrow(
      BadRequestException,
    );
  });

  it('refuses a label longer than DNS allows', () => {
    // The column is varchar(100); a 64-character label would store and then
    // never resolve.
    expect(() => normalizeBusinessSubdomain('a'.repeat(64))).toThrow(
      BadRequestException,
    );
    expect(normalizeBusinessSubdomain('a'.repeat(63))).toHaveLength(63);
  });

  it('keeps every reserved label a valid DNS label', () => {
    // A reserved entry that the pattern already rejects would be dead weight,
    // and would hide the fact that the pattern is what is refusing it.
    for (const reserved of RESERVED_BUSINESS_SUBDOMAINS) {
      expect(reserved).toMatch(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/);
    }
  });
});
