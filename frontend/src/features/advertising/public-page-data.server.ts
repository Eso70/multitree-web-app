import { headers } from "next/headers";
import type { AdvertisingServiceConfig } from "@linktree/types";
import { extractSubdomain } from "@/lib/subdomain-utils";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";

/**
 * The server-side read behind both public advertising routes.
 *
 * `/advertising` and `/advertising/video-code` render different components from
 * the same data — the tutorial page needs only the video fields, but reads the
 * whole config so the two can never disagree about what is published. They had
 * a copy of this loader each; the shape of the branding and footer props they
 * build is identical, so it lives here once.
 */

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost")
  .split(":")[0]
  .toLowerCase();
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface AdvertisingPublicBusiness {
  name: string;
  logo?: string | null;
  default_avatar?: string | null;
  website_color?: string | null;
  favicon?: string | null;
  footer_text?: string | null;
  footer_phone?: string | null;
  whatsapp_enabled?: boolean | null;
}

interface PublicLinktree {
  name: string;
  uid: string;
  seo_name?: string | null;
}

interface PublicMiniWebsite {
  name: string;
  slug: string;
}

export interface AdvertisingPublicData {
  business: AdvertisingPublicBusiness;
  linktrees: PublicLinktree[];
  miniWebsites: PublicMiniWebsite[];
  config: AdvertisingServiceConfig;
}

/**
 * One public read, unwrapped to its `data` payload.
 *
 * Each request carries its own failure handling so a caller can decide per
 * endpoint whether an absent answer is fatal. Sharing one `try` across all four
 * meant a timeout on the footer's linktree list took down a published
 * advertising page.
 */
async function readPublic<T>(
  path: string,
  subdomain: string,
): Promise<T | null> {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      headers: { "x-subdomain": subdomain },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return (payload?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

/**
 * Returns null only when the page genuinely has nothing to render: no
 * subdomain, no business, or no published advertising page. An unpublished or
 * unentitled page 404s at the API rather than returning content with a flag,
 * so nothing unpublished reaches the browser.
 *
 * The linktree and mini-website lists are footer navigation. They are fetched
 * alongside but never gate the page — losing them costs a few links, not the
 * whole route.
 */
export async function loadAdvertisingPublicData(): Promise<AdvertisingPublicData | null> {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const subdomain = extractSubdomain(host, undefined, ROOT_DOMAIN);
  if (!subdomain) return null;

  const [business, config, linktrees, miniWebsites] = await Promise.all([
    readPublic<AdvertisingPublicBusiness>("/api/public/business", subdomain),
    readPublic<AdvertisingServiceConfig>("/api/public/advertising", subdomain),
    readPublic<PublicLinktree[]>("/api/public/linktrees", subdomain),
    readPublic<PublicMiniWebsite[]>("/api/public/mini-websites", subdomain),
  ]);

  if (!business || !config) return null;
  return {
    business,
    config,
    linktrees: Array.isArray(linktrees) ? linktrees : [],
    miniWebsites: Array.isArray(miniWebsites) ? miniWebsites : [],
  };
}

/** The branding and footer props both public advertising components take. */
export function advertisingPublicProps(data: AdvertisingPublicData) {
  const { business, linktrees, miniWebsites } = data;
  return {
    branding: {
      name: business.name,
      logo: business.logo || business.default_avatar,
      accentColor: parseWebsiteColor(business.website_color).primary,
    },
    footer: {
      description: business.footer_text,
      phone: business.footer_phone,
      whatsappEnabled: business.whatsapp_enabled,
      linktrees: linktrees.map((item) => ({
        name: item.name,
        href: `/linktree/${item.seo_name || item.uid}`,
      })),
      miniWebsites: miniWebsites.map((item) => ({
        name: item.name,
        href: `/bio/${item.slug}`,
      })),
    },
  };
}
