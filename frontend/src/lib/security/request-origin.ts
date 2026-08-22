const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Every cookie that authenticates a mutation.
 *
 * A surface missing here is not treated as authenticated, so the proxy skips
 * the same-origin check instead of failing it. `creator_session` was absent
 * while the Creator workspace shipped its own writes. Add the cookie when a new
 * session type is introduced; the backend keeps the matching list in
 * `common/request-origin.ts`.
 */
const SESSION_COOKIE_NAMES = [
  "business_session",
  "platform_admin_session",
  "creator_session",
] as const;

export function isAuthenticatedMutation(method: string, cookieHeader: string | null): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  // Split rather than match: a name built into a `RegExp` has to be escaped,
  // and a template literal silently eats the `\s` that made the old pattern
  // read as whitespace.
  const present = new Set(
    (cookieHeader || "")
      .split(";")
      .map((pair) => pair.split("=", 1)[0]?.trim())
      .filter(Boolean),
  );
  return SESSION_COOKIE_NAMES.some((cookieName) => present.has(cookieName));
}

export function isSameOriginBrowserRequest(
  requestUrl: string,
  originHeader: string | null,
  refererHeader: string | null,
  hostHeader?: string | null,
  forwardedHostHeader?: string | null,
  forwardedProtoHeader?: string | null,
): boolean {
  const source = originHeader || refererHeader;
  if (!source) return true;
  if (source === "null") return false;

  try {
    const internalUrl = new URL(requestUrl);
    const publicHost = firstForwardedValue(hostHeader) || firstForwardedValue(forwardedHostHeader);
    const publicProtocol = firstForwardedValue(forwardedProtoHeader) || internalUrl.protocol.slice(0, -1);

    if (publicHost && (publicProtocol === "http" || publicProtocol === "https")) {
      return new URL(source).origin === new URL(`${publicProtocol}://${publicHost}`).origin;
    }

    return new URL(source).origin === internalUrl.origin;
  } catch {
    return false;
  }
}

function firstForwardedValue(value: string | null | undefined): string {
  return value?.split(",", 1)[0]?.trim().toLowerCase() || "";
}
