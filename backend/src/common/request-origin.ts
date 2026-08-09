const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SESSION_COOKIE_NAMES = [
  'business_session',
  'platform_admin_session',
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
