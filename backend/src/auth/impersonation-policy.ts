/**
 * The single policy that decides what a platform administrator may NOT do
 * while signed in as a business.
 *
 * Impersonation deliberately grants the business's own effective access and
 * nothing more: the session carries `role: 'business'`, so plan entitlements,
 * quotas, and per-permission approval rules apply exactly as they do for the
 * real owner. This denylist is the narrow exception on top of that — the two
 * primitives an administrator must not reach through a borrowed session:
 *
 * 1. Reading a decrypted tenant secret back in plaintext. The administrator
 *    can already rotate TikTok credentials through the audited platform route;
 *    there is no support reason to exfiltrate the existing value.
 * 2. Revoking the real owner's sessions from inside the tenant. The platform
 *    console owns that action under its own capability and audit event, where
 *    it is attributed to the administrator rather than to the business.
 *
 * Keeping both rules here means widening or relaxing the policy is a change to
 * this file only. Route guards must not grow their own private exceptions.
 */
export interface ImpersonationRestrictedRoute {
  readonly methods: readonly string[];
  readonly pattern: RegExp;
  readonly reason: string;
}

export const IMPERSONATION_RESTRICTED_ROUTES: readonly ImpersonationRestrictedRoute[] =
  [
    {
      methods: ['GET'],
      pattern: /^\/api\/auth\/tiktok\/[^/]+\/secret\/?$/,
      reason:
        'Stored tenant secrets cannot be read back during impersonation. Rotate the credential from the platform console instead.',
    },
    {
      methods: ['DELETE'],
      pattern: /^\/api\/auth\/sessions(?:\/[^/]+)?\/?$/,
      reason:
        'Business sessions cannot be revoked during impersonation. Use the platform console session controls instead.',
    },
  ];

/**
 * Returns the reason the request is blocked, or `null` when it is allowed.
 *
 * `url` may carry a query string; only the path participates in matching so a
 * restricted route cannot be reached by appending parameters.
 */
export function impersonationDenialReason(
  method: string,
  url: string,
): string | null {
  const path = url.split('?')[0].split('#')[0];
  const normalizedMethod = method.toUpperCase();
  const restricted = IMPERSONATION_RESTRICTED_ROUTES.find(
    (route) =>
      route.methods.includes(normalizedMethod) && route.pattern.test(path),
  );
  return restricted ? restricted.reason : null;
}
