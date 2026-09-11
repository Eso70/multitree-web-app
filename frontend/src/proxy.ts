import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createContentSecurityPolicy } from "@/lib/security/content-security-policy";
import {
  INTERNAL_PROXY_KEY_HEADER,
  internalProxyKey,
} from "@/lib/security/internal-proxy-key";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
const PLATFORM_ADMIN_PATH = normalizePrivatePath(
  process.env.PLATFORM_ADMIN_PATH,
);
function normalizePrivatePath(value: string | undefined): string {
  const normalized = (value || "").trim().replace(/^\/+|\/+$/g, "");
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(normalized)) {
    return process.env.NODE_ENV === "development" ? "/platform-console" : "";
  }
  return `/${normalized}`;
}

function isPlatformAdminPath(pathname: string): boolean {
  return (
    !!PLATFORM_ADMIN_PATH &&
    (pathname === PLATFORM_ADMIN_PATH ||
      pathname.startsWith(`${PLATFORM_ADMIN_PATH}/`))
  );
}

function extractSubdomain(hostHeader: string): string {
  const hostname = hostHeader.split(":")[0].toLowerCase();
  const root = ROOT_DOMAIN.split(":")[0].toLowerCase();
  const isIp =
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
  if (
    !hostname ||
    isIp ||
    hostname === "localhost" ||
    hostname === root ||
    hostname === `www.${root}`
  )
    return "";
  if (hostname.endsWith(`.${root}`))
    return hostname.slice(0, -(root.length + 1)).split(".")[0] || "";
  return "";
}

function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function createRedirect(
  request: NextRequest,
  loginPath: string,
  cookieName: string,
  csp: string,
): NextResponse {
  const loginUrl = new URL(loginPath, request.url);
  const response = NextResponse.redirect(loginUrl);

  response.cookies.set(cookieName, "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  return withCsp(response, csp);
}

function rewriteNotFound(
  request: NextRequest,
  targetPath: string,
  requestHeaders: Headers,
  csp: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  url.search = "";
  return withCsp(
    NextResponse.rewrite(url, {
      status: 404,
      request: { headers: requestHeaders },
    }),
    csp,
  );
}

/**
 * Checks page-request subdomains; backend guards validate API tenants directly.
 * Result is NOT cached — each request to an business-prefixed route validates it.
 * This is a lightweight single-row DB lookup on an indexed column.
 */
async function isRegisteredSubdomain(
  backendUrl: string,
  subdomain: string,
): Promise<boolean | null> {
  if (!subdomain) return false;
  try {
    const res = await fetch(`${backendUrl}/api/auth/subdomain-check`, {
      headers: {
        "x-subdomain": subdomain,
        [INTERNAL_PROXY_KEY_HEADER]: internalProxyKey() || "",
        "x-middleware-check": "1",
      },
      // No cache - we need live data so deleted businesses are locked out immediately
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
    if (res.ok) return true;
    if (res.status === 404) return false;
    return null;
  } catch {
    // A transient backend failure is not proof that the business disappeared.
    // Let the authenticated layout perform the definitive session check.
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const nonce = crypto.randomUUID();
  const csp = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  if (
    pathname.startsWith("/__public-not-found") ||
    pathname.startsWith("/__root-not-found")
  ) {
    return withCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  // Extract subdomain
  const subdomain = extractSubdomain(host);

  // Block unregistered subdomains entirely
  if (
    subdomain &&
    subdomain !== "www" &&
    pathname !== "/api" &&
    !pathname.startsWith("/api/")
  ) {
    const registered = await isRegisteredSubdomain(backendUrl, subdomain);
    if (registered === false) {
      return rewriteNotFound(
        request,
        "/__public-not-found",
        requestHeaders,
        csp,
      );
    }
  }

  // Set subdomain header for downstream handlers
  if (subdomain) {
    requestHeaders.set("x-subdomain", subdomain);
    const proxyKey = internalProxyKey();
    if (proxyKey) {
      requestHeaders.set(INTERNAL_PROXY_KEY_HEADER, proxyKey);
    }
  }

  if (subdomain && isPlatformAdminPath(pathname)) {
    return rewriteNotFound(request, "/__public-not-found", requestHeaders, csp);
  }

  // ── Route blocking: root domain (no subdomain) + /business/* → 404 ──────────
  if (!subdomain && pathname.startsWith("/business")) {
    return rewriteNotFound(request, "/__root-not-found", requestHeaders, csp);
  }

  // ── Business routes on a subdomain ──────────────────────────────────────────
  if (subdomain && pathname.startsWith("/business")) {
    // Only the explicit workspace entry and the single-use OAuth handoff are
    // public. Protected routes disclose nothing when no session is present.
    if (
      pathname !== "/business/workspace-entry" &&
      !pathname.startsWith("/business/auth/consume")
    ) {
      const sessionToken = request.cookies.get("business_session")?.value;
      if (!sessionToken) {
        return rewriteNotFound(
          request,
          "/__public-not-found",
          requestHeaders,
          csp,
        );
      }
      // Session validity is enforced by BusinessGuard on the backend for every API call.
      // The session polling in BusinessDashboard handles the kicked-out-while-active case.
    }
  }

  if (!subdomain && pathname.startsWith("/join")) {
    if (
      pathname.startsWith("/join/application") &&
      !request.cookies.get("signup_session")?.value
    ) {
      return rewriteNotFound(request, "/__root-not-found", requestHeaders, csp);
    }
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return withCsp(response, csp);
  }

  // Protect and internally rewrite the configured platform console route.
  if (!subdomain && isPlatformAdminPath(pathname)) {
    const isLoginPath = pathname === `${PLATFORM_ADMIN_PATH}/login`;
    const sessionToken = request.cookies.get("platform_admin_session")?.value;

    if (!isLoginPath) {
      if (!sessionToken) {
        return createRedirect(
          request,
          `${PLATFORM_ADMIN_PATH}/login`,
          "platform_admin_session",
          csp,
        );
      }

      try {
        const res = await fetch(`${backendUrl}/api/platform/auth/profile`, {
          headers: {
            Cookie: `platform_admin_session=${sessionToken}`,
            "x-subdomain": "",
          },
        });
        if (!res.ok)
          return createRedirect(
            request,
            `${PLATFORM_ADMIN_PATH}/login`,
            "platform_admin_session",
            csp,
          );
      } catch {
        return createRedirect(
          request,
          `${PLATFORM_ADMIN_PATH}/login`,
          "platform_admin_session",
          csp,
        );
      }
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return withCsp(response, csp);
  }

  return withCsp(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp,
  );
}

export const config = {
  matcher: [
    "/business/:path*",
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|images|fonts|cursors).*)",
  ],
};
