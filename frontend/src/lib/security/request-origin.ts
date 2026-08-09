const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isAuthenticatedMutation(method: string, cookieHeader: string | null): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  return /(?:^|;\s*)(?:business_session|platform_admin_session)=/.test(cookieHeader || "");
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
