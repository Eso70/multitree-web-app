import { timingSafeEqual } from 'crypto';

/**
 * Verifies that a subdomain claimed by an inbound `x-subdomain` header
 * actually came from a trusted internal caller (the Next.js proxy) rather
 * than an external client.
 *
 * `x-subdomain` alone is not a security boundary: Caddy strips it from
 * inbound traffic before forwarding, but that protection lives entirely in
 * infrastructure configuration, not in this process. A client that reaches
 * the backend directly — a misconfigured port, an internal network path, or
 * local development without Caddy in front — could otherwise set
 * `x-subdomain: victim-tenant` and have `BusinessGuard` treat it as
 * authoritative, letting a session issued for one tenant pass the subdomain
 * check for another.
 *
 * The proxy sends this key alongside `x-subdomain` on every forwarded
 * request (see `frontend/src/proxy.ts` and
 * `frontend/src/app/api/[...path]/route.ts`). The header is trusted only
 * when this comparison succeeds; otherwise callers fall back to parsing the
 * `Host` header directly, which cannot be forged into a different tenant
 * without also forging DNS/TLS for that tenant's subdomain.
 *
 * Reuses `REQUEST_TRACKING_SECRET` (falling back to `SESSION_SECRET`) rather
 * than adding another secret to configure and rotate; both protect the same
 * "is this call actually from our proxy" trust boundary.
 */
export function isTrustedInternalProxy(receivedKey: unknown): boolean {
  const expected =
    process.env.REQUEST_TRACKING_SECRET || process.env.SESSION_SECRET || '';
  const received = typeof receivedKey === 'string' ? receivedKey : '';
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

/** Header name the internal proxy trust check reads. */
export const INTERNAL_PROXY_KEY_HEADER = 'x-tenant-proxy-key';
