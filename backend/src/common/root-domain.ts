/**
 * Helpers for interpreting the configured `ROOT_DOMAIN`.
 *
 * `ROOT_DOMAIN` is a domain, but local development needs a port to build
 * usable URLs (`lvh.me:3011`), so the configured value may legitimately carry
 * one. The two uses must not be confused:
 *
 * - Comparing against a request's hostname requires the port removed, because
 *   `URL.hostname` never includes a port.
 * - Building an origin requires the port, but only once, and the port from an
 *   explicitly configured public base URL must win.
 */

/**
 * The configured root domain with any port and trailing dot removed, suitable
 * for comparison against `URL.hostname` or a parsed `Host` header.
 */
export function rootDomainHostname(rootDomain: string): string {
  return rootDomain.trim().split(':')[0].toLowerCase().replace(/\.$/, '');
}

/**
 * The port embedded in the configured root domain, or an empty string. Returned
 * with its leading colon so it can be concatenated directly.
 */
export function rootDomainPort(rootDomain: string): string {
  const port = rootDomain.trim().split(':')[1];
  return port && /^\d+$/.test(port) ? `:${port}` : '';
}

/**
 * True when `hostname` is the root domain itself or one of its subdomains.
 * Tolerates a configured root domain that includes a port.
 */
export function isRootDomainHost(
  hostname: string,
  rootDomain: string,
): boolean {
  const host = rootDomainHostname(hostname);
  const root = rootDomainHostname(rootDomain);
  if (!host || !root) return false;
  return host === root || host.endsWith(`.${root}`);
}
