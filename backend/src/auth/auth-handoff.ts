import { createHash, randomBytes } from 'crypto';

/**
 * The cross-origin sign-in handoff shared by every tenant authentication path.
 *
 * A handoff is minted on the root domain (Google callback, platform-admin
 * impersonation) and consumed once on the tenant subdomain, which is the only
 * place a host-only `business_session` cookie can be written. The code itself
 * is never stored: Redis holds the SHA-256 digest as its key, so a dump of the
 * temporary store cannot be replayed as a sign-in.
 *
 * `kind` is what the consumer branches on. A `login` handoff produces an
 * ordinary business session; an `impersonation` handoff produces a short,
 * marked, non-rememberable one. Both are consumed by the same endpoint so
 * there is exactly one place that turns a handoff into a session.
 */
export const AUTH_HANDOFF_TTL_SECONDS = 60;

/**
 * Impersonated sessions are deliberately far shorter than the 12-hour owner
 * session and can never be remembered. An administrator who closes the tab
 * without exiting leaves a session that expires on its own within the support
 * window it was opened for.
 */
export const IMPERSONATION_SESSION_TTL_SECONDS = 30 * 60;

export type AuthHandoffKind = 'login' | 'impersonation';

export interface AuthHandoffPayload {
  kind?: AuthHandoffKind;
  user_id: string | null;
  business_id: string;
  subdomain: string;
  username?: string;
  business_name?: string;
  rememberDevice?: boolean;
  impersonation?: {
    platformAdminId: string;
    platformAdminName: string;
    reason?: string;
  };
}

export function createAuthHandoffCode(): string {
  return randomBytes(32).toString('base64url');
}

export function authHandoffKey(code: string): string {
  return `auth:handoff:${createHash('sha256').update(code).digest('hex')}`;
}
