import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const configuredMaxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 10);
const MAX_REQUEST_BYTES =
  (Number.isFinite(configuredMaxFileSizeMb) && configuredMaxFileSizeMb > 0
    ? configuredMaxFileSizeMb
    : 10) *
  1024 *
  1024;
import {
  isAuthenticatedMutation,
  isSameOriginBrowserRequest,
} from "@/lib/security/request-origin";
import { extractSubdomain } from "@/lib/subdomain-utils";
import { classifyUpstreamFailure } from "@/lib/api/upstream-failure";
import {
  INTERNAL_PROXY_KEY_HEADER,
  internalProxyKey,
} from "@/lib/security/internal-proxy-key";

/**
 * Catch-all API proxy route handler.
 * Forwards all /api/* requests to the NestJS backend with proper headers:
 * - Forwards cookies (business_session, platform_admin_session)
 * - Adds x-subdomain header extracted from host
 * - Passes through Set-Cookie headers from backend responses
 */

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const pathname = `/api/${path.join("/")}`;
  const url = new URL(pathname + request.nextUrl.search, BACKEND_URL);

  const host = request.headers.get("host") || "";
  const subdomain = extractSubdomain(
    host,
    undefined,
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost",
  );
  const cookieHeader = request.headers.get("cookie");

  if (
    isAuthenticatedMutation(request.method, cookieHeader) &&
    !isSameOriginBrowserRequest(
      request.url,
      request.headers.get("origin"),
      request.headers.get("referer"),
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      request.headers.get("x-forwarded-proto"),
    )
  ) {
    return NextResponse.json(
      { message: "Invalid request origin" },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    return payloadTooLargeResponse();
  }

  // Build headers to forward
  const headers = new Headers();
  headers.set("x-subdomain", subdomain);
  const proxyKey = internalProxyKey();
  if (proxyKey) {
    headers.set(INTERNAL_PROXY_KEY_HEADER, proxyKey);
  }
  headers.set(
    "x-forwarded-for",
    request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1",
  );
  headers.set("user-agent", request.headers.get("user-agent") || "");

  // Forward content-type if present
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  // Forward cookies
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  // Forward body for non-GET/HEAD requests
  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_REQUEST_BYTES) {
      return payloadTooLargeResponse();
    }
    fetchOptions.body = body;
  }

  const controller = new AbortController();
  const isAuthenticationRequest =
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/signup/") ||
    pathname.startsWith("/api/platform/auth/");
  const timeout = setTimeout(
    () => controller.abort(),
    isAuthenticationRequest ? 8_000 : 30_000,
  );

  try {
    console.log(
      `[API PROXY] ${request.method} ${pathname} -> subdomain: "${subdomain}", has cookie: ${!!cookieHeader}`,
    );

    const backendRes = await fetch(url.toString(), {
      ...fetchOptions,
      signal: controller.signal,
      redirect: "manual",
    });

    if (backendRes.status === 401) {
      console.log(`[API PROXY] 401 Unauthorized for ${pathname}`);
    }

    // Build response
    const responseBody = await backendRes.arrayBuffer();
    const response = new NextResponse(responseBody, {
      status: backendRes.status,
      statusText: backendRes.statusText,
    });

    // Copy response headers
    backendRes.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") {
        response.headers.set(key, value);
      }
    });

    // Forward Set-Cookie headers
    const setCookieHeaders = backendRes.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      // Clear any existing set-cookie header first
      response.headers.delete("set-cookie");
      for (const cookie of setCookieHeaders) {
        response.headers.append("set-cookie", cookie);
      }
    }

    return response;
  } catch (error) {
    console.error("[API PROXY] Error:", error);
    const failure = classifyUpstreamFailure(error);
    return NextResponse.json(
      { message: failure.message },
      { status: failure.status },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function payloadTooLargeResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body exceeds the allowed size",
      },
      statusCode: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Request body exceeds the allowed size",
    },
    { status: 413 },
  );
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
