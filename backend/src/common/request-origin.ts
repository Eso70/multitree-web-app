const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/**
 * Every cookie that authenticates a mutation.
 *
 * A surface missing from this list gets no cross-origin rejection at all: the
 * request is not recognised as authenticated, so the same-origin check is
 * skipped rather than failed. `creator_session` was absent while the Creator
 * workspace shipped its own writes — settings, page edits, session revocation —
 * leaving `SameSite=Lax` as the only thing between them and a cross-site
 * submission. Add the cookie here when a new session type is introduced.
 */
const SESSION_COOKIE_NAMES = [
  'business_session',
  'platform_admin_session',
  'creator_session',
] as const;
type HeaderValue = string | string[] | undefined;

function firstHeaderValue(value: HeaderValue): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue?.split(',', 1)[0]?.trim() || undefined;
}

export function isAuthenticatedMutation(
  method: string,
  cookies: Record<string, string | undefined>,
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  return SESSION_COOKIE_NAMES.some((cookieName) => cookieName in cookies);
}

export function isSameOriginBrowserRequest(
  originHeader: HeaderValue,
  refererHeader: HeaderValue,
  hostHeader: HeaderValue,
  forwardedProtoHeader: HeaderValue,
  requestProtocol: string,
): boolean {
  const source =
    firstHeaderValue(originHeader) ?? firstHeaderValue(refererHeader);
  if (!source) return true;
  if (source === 'null') return false;

  const host = firstHeaderValue(hostHeader);
  const protocol = firstHeaderValue(forwardedProtoHeader) ?? requestProtocol;
  if (!host || (protocol !== 'http' && protocol !== 'https')) return false;

  try {
    return new URL(source).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}
