function getLocalBaseUrl(): string {
  const port = process.env.PORT || 3011;
  return `http://localhost:${port}`;
}

/**
 * The scheme absolute URLs should be built with on the server.
 *
 * Taken from the configured application URL rather than assumed to be https,
 * because local development is served over plain http and a hardcoded https
 * link is simply unreachable there.
 */
function getAppProtocol(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl?.startsWith("http://")) return "http:";
  if (appUrl?.startsWith("https://")) return "https:";
  return process.env.NODE_ENV === "production" ? "https:" : "http:";
}

export function getAppBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return appUrl;
  }
  return getLocalBaseUrl();
}

export function getRootDomain(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
  }
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : "";

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return `localhost${port}`;
  }

  const parts = hostname.split(".");
  if (parts.length >= 2) {
    return `${parts.slice(-2).join(".")}${port}`;
  }
  return `${hostname}${port}`;
}

export function getSubdomainLoginUrl(subdomain?: string): string {
  if (!subdomain) return "/login";

  if (typeof window === "undefined") {
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
    return `${getAppProtocol()}//${subdomain}.${root}/business/login`;
  }

  const protocol = window.location.protocol;
  const root = getRootDomain();

  return `${protocol}//${subdomain}.${root}/business/login`;
}

export function getAbsolutePublicUrl(pathPrefix: string, slug: string): string {
  const normalizedPrefix = `/${pathPrefix.replace(/^\/+|\/+$/g, "")}`;
  const path = `${normalizedPrefix}/${encodeURIComponent(slug)}`;
  if (typeof window === "undefined") {
    return `${getAppBaseUrl()}${path}`;
  }
  return `${window.location.origin}${path}`;
}
