import { headers } from "next/headers";
import { HomeLanding } from "@/components/home/HomeLanding";
import { BusinessLanding } from "@/components/business/BusinessLanding";
import { extractSubdomain } from "@/lib/subdomain-utils";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";
import type { ComponentProps } from "react";
import { BusinessServiceUnavailablePage } from "@/components/error-pages/BusinessServiceUnavailablePage";
import { BusinessBadGatewayPage } from "@/components/error-pages/BusinessBadGatewayPage";
import { BusinessGatewayTimeoutPage } from "@/components/error-pages/BusinessGatewayTimeoutPage";
import { classifyUpstreamFailure } from "@/lib/api/upstream-failure";
import { businessTabTitle } from "@/lib/utils/tab-title";
import {
  INTERNAL_PROXY_KEY_HEADER,
  internalProxyKey,
} from "@/lib/security/internal-proxy-key";
import {
  BUSINESS_FAVICON_PLACEHOLDER,
  BUSINESS_LOGO_PLACEHOLDER,
  MULTITREE_LOGO_MARK,
} from "@/lib/brand/brand-assets";

export const dynamic = "force-dynamic";

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost")
  .split(":")[0]
  .toLowerCase();

const ROOT_HOSTS = new Set([
  "localhost",
  "lvh.me",
  "127.0.0.1",
  ROOT_DOMAIN,
  `www.${ROOT_DOMAIN}`,
]);

async function isRootRequest(): Promise<boolean> {
  const headerStore = await headers();
  const hostname = (headerStore.get("host") || "").split(":")[0].toLowerCase();
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || ROOT_HOSTS.has(hostname);
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default async function Home() {
  if (await isRootRequest()) return <HomeLanding />;

  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const subdomain = extractSubdomain(host, undefined, ROOT_DOMAIN);
  if (!subdomain) return <HomeLanding />;

  let landingProps: ComponentProps<typeof BusinessLanding> | null = null;
  let badGateway = false;
  let serviceUnavailable = false;
  let gatewayTimeout = false;
  try {
    const headers_ = {
      "x-subdomain": subdomain,
      [INTERNAL_PROXY_KEY_HEADER]: internalProxyKey() || "",
    };
    const signal = AbortSignal.timeout(30_000);
    const [businessRes, linktreesRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/public/business`, {
        headers: headers_,
        cache: "no-store",
        signal,
      }),
      fetch(`${BACKEND_URL}/api/public/linktrees`, {
        headers: headers_,
        cache: "no-store",
        signal,
      }),
    ]);

    badGateway = [businessRes, linktreesRes].some(
      (response) => response.status === 502,
    );
    serviceUnavailable = [businessRes, linktreesRes].some(
      (response) => response.status === 503,
    );
    gatewayTimeout = [businessRes, linktreesRes].some(
      (response) => response.status === 504,
    );

    if (
      !badGateway &&
      !serviceUnavailable &&
      !gatewayTimeout &&
      businessRes.ok
    ) {
      const businessJson = await businessRes.json();
      const business = businessJson?.data;
      if (business) {
        let linktrees: ComponentProps<typeof BusinessLanding>["linktrees"] = [];
        if (linktreesRes.ok) {
          const ltJson = await linktreesRes.json();
          linktrees = Array.isArray(ltJson?.data) ? ltJson.data : [];
        }

        landingProps = { business, linktrees };
      }
    }
  } catch (error) {
    const failure = classifyUpstreamFailure(error);
    gatewayTimeout = failure.status === 504;
    serviceUnavailable = failure.status === 503;
  }

  if (badGateway) return <BusinessBadGatewayPage />;
  if (serviceUnavailable) return <BusinessServiceUnavailablePage />;
  if (gatewayTimeout) return <BusinessGatewayTimeoutPage />;
  if (!landingProps) return <HomeLanding />;
  return <BusinessLanding {...landingProps} />;
}

export async function generateMetadata() {
  const headerStore = await headers();
  const host = (headerStore.get("host") || "").split(":")[0].toLowerCase();
  const subdomain = extractSubdomain(host, undefined, ROOT_DOMAIN);

  if (subdomain) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/public/business`, {
        headers: {
          "x-subdomain": subdomain,
          [INTERNAL_PROXY_KEY_HEADER]: internalProxyKey() || "",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) {
        const json = await res.json();
        const business = json?.data;
        if (business) {
          // The tab icon is the business's favicon, and only that. Listing the
          // logo and the default avatar alongside it as larger `sizes` handed
          // the browser a bigger candidate to prefer, so the tab showed the
          // default avatar and the favicon the business had uploaded never
          // appeared. The larger art belongs on the apple touch icon, which is
          // a separate slot rather than a competing candidate.
          const icons = {
            icon: [
              {
                url:
                  business.favicon ||
                  business.logo ||
                  BUSINESS_FAVICON_PLACEHOLDER,
              },
            ],
            apple:
              business.logo || business.default_avatar || BUSINESS_LOGO_PLACEHOLDER,
          };
          return {
            title: businessTabTitle(business.name, "Home"),
            description: `Explore ${business.name}'s official public pages and contact information.`,
            icons,
            themeColor: business.website_color || MULTITREE_ACCENT_COLOR,
          };
        }
      }
    } catch {}
  }

  // Root domain only — a business subdomain returned above with its own icons.
  // Declared explicitly rather than left to the implicit `/favicon.ico` pickup,
  // so MultiTree's own mark is stated in the same place a tenant's is.
  return {
    title: "MultiTree",
    description:
      "Create branded public link pages, manage multiple businesses, and understand every connection from one secure platform.",
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: MULTITREE_LOGO_MARK, sizes: "512x512" },
      ],
      apple: MULTITREE_LOGO_MARK,
    },
    themeColor: MULTITREE_ACCENT_COLOR,
  };
}
