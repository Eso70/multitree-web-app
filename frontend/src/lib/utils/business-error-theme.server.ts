import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_BUSINESS_ACCENT,
  extractSubdomainFromHost,
  fetchBusinessFooterData,
  fetchBusinessSubdomainTheme,
  type BusinessSubdomainTheme,
} from "./business-error-theme";
import { parseWebsiteColor } from "./parse-website-color";
import { businessTabTitle } from "./tab-title";
import {
  INTERNAL_PROXY_KEY_HEADER,
  internalProxyKey,
} from "@/lib/security/internal-proxy-key";

export async function fetchBusinessSubdomainThemeFromHeaders(): Promise<BusinessSubdomainTheme> {
  const subdomain = await getBusinessSubdomainFromHeaders();
  return fetchBusinessSubdomainTheme(subdomain);
}

export async function getBusinessSubdomainFromHeaders(): Promise<string> {
  const headerStore = await headers();
  return (
    headerStore.get("x-subdomain") ||
    extractSubdomainFromHost(headerStore.get("host") || "")
  );
}

export async function fetchAuthenticatedBusinessTheme(): Promise<BusinessSubdomainTheme> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("business_session")?.value;
  if (!sessionToken) {
    return fetchBusinessSubdomainThemeFromHeaders();
  }

  const headerStore = await headers();
  const subdomain =
    headerStore.get("x-subdomain") ||
    extractSubdomainFromHost(headerStore.get("host") || "");
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  try {
    const response = await fetch(`${backendUrl}/api/auth/session`, {
      headers: {
        cookie: `business_session=${sessionToken}`,
        "x-subdomain": subdomain,
        [INTERNAL_PROXY_KEY_HEADER]: internalProxyKey() || "",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        user?: {
          website_color?: string | null;
          favicon?: string | null;
          logo?: string | null;
          name?: string | null;
          subdomain?: string | null;
        };
      };
      if (payload.user) {
        const footer = await fetchBusinessFooterData(subdomain);
        return {
          websiteColor: parseWebsiteColor(
            payload.user.website_color || DEFAULT_BUSINESS_ACCENT,
          ),
          favicon: payload.user.favicon || null,
          logo: payload.user.logo || null,
          name: payload.user.name || null,
          subdomain: payload.user.subdomain || subdomain,
          ...footer,
        };
      }
    }
  } catch {
    // Fall through to public host branding when the session service is unavailable.
  }

  return fetchBusinessSubdomainThemeFromHeaders();
}

export async function buildBusinessErrorMetadata(
  fallbackTitle: string,
): Promise<Metadata> {
  const theme = await fetchBusinessSubdomainThemeFromHeaders();

  return {
    title: businessTabTitle(
      theme.name,
      fallbackTitle === "Not Found" ? "Not Found" : "Error",
    ),
    icons: theme.favicon ? { icon: theme.favicon } : undefined,
  };
}

export async function buildAuthenticatedBusinessErrorMetadata(
  fallbackTitle: string,
): Promise<Metadata> {
  const theme = await fetchAuthenticatedBusinessTheme();

  return {
    title: businessTabTitle(
      theme.name,
      fallbackTitle === "Not Found" ? "Not Found" : "Error",
    ),
    icons: theme.favicon ? { icon: theme.favicon } : undefined,
  };
}
