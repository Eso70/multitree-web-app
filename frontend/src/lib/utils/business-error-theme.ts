import {
  parseWebsiteColor,
  type ParsedColor,
} from "@/lib/utils/parse-website-color";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";
import { businessTabTitle } from "./tab-title";

/** Root Platform Administrator fallback when no business theme is available. */
export const DEFAULT_BUSINESS_ACCENT = MULTITREE_ACCENT_COLOR;

export interface BusinessFooterData {
  footerText?: string | null;
  footerPhone?: string | null;
  whatsappEnabled?: boolean | null;
  advertisingEnabled?: boolean;
  brandingRemoved?: boolean;
  linktrees?: Array<{ name: string; href: string }>;
  miniWebsites?: Array<{ name: string; href: string }>;
}

export interface BusinessSubdomainTheme extends BusinessFooterData {
  websiteColor: ParsedColor;
  favicon: string | null;
  logo: string | null;
  name: string | null;
  subdomain: string | null;
}

const EMPTY_THEME: BusinessSubdomainTheme = {
  websiteColor: parseWebsiteColor(DEFAULT_BUSINESS_ACCENT),
  favicon: null,
  logo: null,
  name: null,
  subdomain: null,
};

export function extractSubdomainFromHost(host: string): string {
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  if (parts.length <= 2) return "";
  const subdomain = parts[0];
  return subdomain === "www" ? "" : subdomain;
}

function getSubdomainThemeUrl(subdomain: string): string {
  if (typeof window !== "undefined") {
    return `/api/auth/subdomain-theme/${subdomain}`;
  }
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${backendUrl}/api/auth/subdomain-theme/${subdomain}`;
}

export async function fetchBusinessSubdomainTheme(
  subdomain: string,
): Promise<BusinessSubdomainTheme> {
  if (!subdomain) {
    return EMPTY_THEME;
  }

  try {
    const res = await fetch(getSubdomainThemeUrl(subdomain), {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return EMPTY_THEME;
    }

    const data = await res.json();
    const footer = await fetchBusinessFooterData(subdomain);
    return {
      websiteColor: parseWebsiteColor(
        data.website_color || DEFAULT_BUSINESS_ACCENT,
      ),
      favicon: data.favicon || null,
      logo: data.logo || null,
      name: data.name || null,
      subdomain: data.subdomain || subdomain,
      ...footer,
    };
  } catch {
    return EMPTY_THEME;
  }
}

function publicApiUrl(path: string): string {
  return typeof window === "undefined"
    ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}${path}`
    : path;
}

/**
 * Pulls the same public data the business landing footer renders so error
 * pages can show the identical footer. Fetched from the public endpoints the
 * landing page itself uses; empty on failure so an error page never fails
 * harder than it already has.
 */
export async function fetchBusinessFooterData(
  subdomain: string,
): Promise<BusinessFooterData> {
  if (!subdomain) {
    return {};
  }

  const headers: Record<string, string> = {};
  if (typeof window === "undefined") {
    headers["x-subdomain"] = subdomain;
  }

  try {
    const signal = AbortSignal.timeout(10_000);
    const [businessRes, linktreesRes, miniWebsitesRes] = await Promise.all([
      fetch(publicApiUrl("/api/public/business"), {
        headers,
        cache: "no-store",
        signal,
      }),
      fetch(publicApiUrl("/api/public/linktrees"), {
        headers,
        cache: "no-store",
        signal,
      }),
      fetch(publicApiUrl("/api/public/mini-websites"), {
        headers,
        cache: "no-store",
        signal,
      }),
    ]);

    const footer: BusinessFooterData = {};
    if (businessRes.ok) {
      const payload = (await businessRes.json()) as {
        data?: {
          footer_text?: string | null;
          footer_phone?: string | null;
          whatsapp_enabled?: boolean | null;
          advertising_enabled?: boolean;
          branding_removed?: boolean;
        };
      };
      const data = payload.data;
      if (data) {
        footer.footerText = data.footer_text || null;
        footer.footerPhone = data.footer_phone || null;
        footer.whatsappEnabled = data.whatsapp_enabled;
        footer.advertisingEnabled = data.advertising_enabled;
        footer.brandingRemoved = data.branding_removed;
      }
    }

    if (linktreesRes.ok) {
      const payload = (await linktreesRes.json()) as {
        data?: Array<{ name?: string | null; uid?: string | null; seo_name?: string | null }>;
      };
      footer.linktrees = (payload.data || [])
        .filter((item) => item.name && (item.uid || item.seo_name))
        .map((item) => ({
          name: item.name as string,
          href: `/linktree/${item.seo_name || item.uid}`,
        }));
    }

    if (miniWebsitesRes.ok) {
      const payload = (await miniWebsitesRes.json()) as {
        data?: Array<{ name?: string | null; slug?: string | null }>;
      };
      footer.miniWebsites = (payload.data || [])
        .filter((item) => item.name && item.slug)
        .map((item) => ({
          name: item.name as string,
          href: `/bio/${item.slug}`,
        }));
    }

    return footer;
  } catch {
    return {};
  }
}

export async function loadBusinessSubdomainTheme(): Promise<BusinessSubdomainTheme> {
  if (typeof window === "undefined") {
    return EMPTY_THEME;
  }

  const subdomain = extractSubdomainFromHost(window.location.hostname);
  const theme = await fetchBusinessSubdomainTheme(subdomain);

  document.documentElement.style.setProperty(
    "--business-website-color",
    theme.websiteColor.primary,
  );
  document.documentElement.style.setProperty(
    "--business-website-css",
    theme.websiteColor.css,
  );

  return theme;
}

export async function loadAuthenticatedBusinessTheme(): Promise<BusinessSubdomainTheme> {
  if (typeof window === "undefined") {
    return EMPTY_THEME;
  }

  try {
    const response = await fetch("/api/auth/profile", {
      credentials: "include",
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
      const user = payload.user;
      if (user) {
        const subdomain =
          user.subdomain || extractSubdomainFromHost(window.location.hostname);
        const footer = await fetchBusinessFooterData(subdomain);
        const theme = {
          websiteColor: parseWebsiteColor(
            user.website_color || DEFAULT_BUSINESS_ACCENT,
          ),
          favicon: user.favicon || null,
          logo: user.logo || null,
          name: user.name || null,
          subdomain,
          ...footer,
        };
        document.documentElement.style.setProperty(
          "--business-website-color",
          theme.websiteColor.primary,
        );
        document.documentElement.style.setProperty(
          "--business-website-css",
          theme.websiteColor.css,
        );
        return theme;
      }
    }
  } catch {
    // Fall through to the host-based theme used by public business pages.
  }

  return loadBusinessSubdomainTheme();
}

export function applyBusinessTabBranding(
  favicon?: string | null,
  name?: string | null,
) {
  if (typeof document === "undefined") return;

  if (name) {
    if (!document.title.trim()) {
      document.title = businessTabTitle(name, "Error");
    }
  }

  if (!favicon) return;

  let link = document.querySelector(
    "link[rel~='icon']",
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = favicon;
}
