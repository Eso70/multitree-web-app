/**
 * Shared secret proving a request's `x-subdomain` header actually came from
 * this proxy, not an external client. See
 * `backend/src/common/internal-proxy-trust.ts` for why the header alone is
 * not trusted by the backend.
 */
export const INTERNAL_PROXY_KEY_HEADER = "x-tenant-proxy-key";

/**
 * The value to send with `INTERNAL_PROXY_KEY_HEADER`, or `undefined` when
 * unconfigured. Reuses `REQUEST_TRACKING_SECRET` (falling back to
 * `SESSION_SECRET`) rather than adding another secret, mirroring the backend
 * comparison in `internal-proxy-trust.ts`.
 */
export function internalProxyKey(): string | undefined {
  return process.env.REQUEST_TRACKING_SECRET || process.env.SESSION_SECRET;
}
