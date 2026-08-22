import { BadRequestException } from '@nestjs/common';

/**
 * A business subdomain, as a DNS label.
 *
 * Deliberately narrower than the `businesses_subdomain_check` column
 * constraint, which allows any label a resolver would accept. The 63-character
 * bound is the DNS limit; the column is `varchar(100)` and would take a longer
 * one that then never resolves.
 */
export const BUSINESS_SUBDOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Labels the platform answers on itself.
 *
 * `www` and `api` are served by their own Caddy blocks, and the frontend reads
 * `www.<root>` as the root domain, so a tenant given one of these is not merely
 * confusing — it is unreachable at its own address. The rest name the platform's
 * own routes and asset prefixes.
 */
export const RESERVED_BUSINESS_SUBDOMAINS: ReadonlySet<string> = new Set([
  'www',
  'api',
  'admin',
  'platform',
  'system',
  'join',
  'login',
  'business',
  'auth',
  'legal',
  'images',
  'fonts',
  'cursors',
  'advertising',
  'bio',
  'linktree',
]);

/**
 * The one rule for what a business subdomain may be.
 *
 * `businesses.subdomain` has two writers — signup provisioning and the platform
 * administration console — and only the first of them used to apply this. The
 * console trimmed and lower-cased and wrote whatever remained, so it accepted
 * reserved labels that leave the tenant unreachable, and passed malformed ones
 * through to the column constraint as an unmapped SQLSTATE. Both writers call
 * this now, so there is a single answer to what is allowed.
 *
 * Returns the normalized value; throws `BadRequestException` rather than
 * returning a flag so a bad value cannot be written by a caller that forgot to
 * check the result.
 */
export function normalizeBusinessSubdomain(value: string): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!BUSINESS_SUBDOMAIN_PATTERN.test(normalized)) {
    throw new BadRequestException('Invalid subdomain');
  }
  if (RESERVED_BUSINESS_SUBDOMAINS.has(normalized)) {
    throw new BadRequestException('Subdomain is reserved');
  }
  return normalized;
}
