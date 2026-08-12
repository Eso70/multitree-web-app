import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { BusinessDashboard } from "@/components/business/BusinessDashboard";
import { BusinessImpersonationBanner } from "@/components/business/BusinessImpersonationBanner";
import { extractSubdomain } from "@/lib/subdomain-utils";
import type { EffectiveAccessManifest } from "@linktree/types";
import { ErrorPage } from "@/components/error-pages/ErrorPage";
import { businessErrorTheme } from "@/components/error-pages/error-theme";
import { ERROR_PAGE_COPY } from "@/components/error-pages/copy";
import { fetchAuthenticatedBusinessTheme } from "@/lib/utils/business-error-theme.server";
import { BusinessBadGatewayPage } from "@/components/error-pages/BusinessBadGatewayPage";
import { BusinessGatewayTimeoutPage } from "@/components/error-pages/BusinessGatewayTimeoutPage";
import { classifyUpstreamFailure } from "@/lib/api/upstream-failure";
import {
  INTERNAL_PROXY_KEY_HEADER,
  internalProxyKey,
} from "@/lib/security/internal-proxy-key";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InitialLinktree = NonNullable<
  ComponentProps<typeof BusinessDashboard>["initialLinktrees"]
>[number];

interface BusinessProfile {
  id: string;
  username: string;
  name: string;
  phone?: string | null;
  logo?: string | null;
  favicon?: string | null;
  default_avatar?: string | null;
  website_color: string;
  default_footer_text?: string | null;
  default_footer_phone?: string | null;
  default_template?: string | null;
  default_background_color?: string | null;
  default_footer_hidden?: boolean;
  default_whatsapp_enabled?: boolean;
  onboarding_required?: boolean;
  onboarding_step?: number;
}

interface SessionImpersonation {
  platform_admin_name: string;
  started_at: string;
}

export default async function BusinessDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("business_session")?.value;

  if (!sessionToken) {
    redirect("/business/login");
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const subdomain = extractSubdomain(
    host,
    headerStore.get("x-subdomain") || undefined,
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost",
  );
  const clientIp =
    headerStore.get("x-forwarded-for") || headerStore.get("x-real-ip") || "";
  const requestHeaders: Record<string, string> = {
    Cookie: `business_session=${sessionToken}`,
    "x-subdomain": subdomain,
    [INTERNAL_PROXY_KEY_HEADER]: internalProxyKey() || "",
  };

  if (clientIp) {
    requestHeaders["x-forwarded-for"] = clientIp;
  }

  let currentUser: BusinessProfile | null = null;
  let impersonation: SessionImpersonation | null = null;
  let effectiveAccess: EffectiveAccessManifest | null = null;
  let accessForbidden = false;
  let authenticationInvalid = false;
  let badGateway = false;
  let serviceUnavailable = false;
  let gatewayTimeout = false;
  let linktreesResponse: Response | null = null;

  try {
    const [accessResponse, sessionResponse, pagesResponse] = await Promise.all([
      fetch(`${backendUrl}/api/auth/effective-access`, {
        headers: requestHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`${backendUrl}/api/auth/session`, {
        headers: requestHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`${backendUrl}/api/linktrees`, {
        headers: requestHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null),
    ]);
    linktreesResponse = pagesResponse;

    if (accessResponse.status === 502 || sessionResponse.status === 502) {
      badGateway = true;
    } else if (
      accessResponse.status === 503 ||
      sessionResponse.status === 503
    ) {
      serviceUnavailable = true;
    } else if (
      accessResponse.status === 504 ||
      sessionResponse.status === 504
    ) {
      gatewayTimeout = true;
    } else if (
      accessResponse.status === 403 ||
      sessionResponse.status === 403
    ) {
      accessForbidden = true;
    } else {
      if (!accessResponse.ok) {
        authenticationInvalid = true;
      } else {
        const accessData = await accessResponse.json();
        effectiveAccess = accessData.data || null;
      }
      if (!sessionResponse.ok) {
        console.error(
          `[BusinessDashboardLayout] Session check failed with status ${sessionResponse.status} (subdomain: "${subdomain}")`,
        );
        authenticationInvalid = true;
      } else {
        const sessionData = await sessionResponse.json();
        currentUser = sessionData.user || null;
        impersonation = sessionData.impersonation || null;
      }
    }
  } catch (error) {
    console.error(
      `[BusinessDashboardLayout] Error fetching session (subdomain: "${subdomain}"):`,
      error,
    );
    const failure = classifyUpstreamFailure(error);
    gatewayTimeout = failure.status === 504;
    serviceUnavailable = failure.status === 503;
  }

  if (badGateway) {
    return <BusinessBadGatewayPage authenticated />;
  }

  if (serviceUnavailable) {
    const theme = await fetchAuthenticatedBusinessTheme();
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.serviceUnavailable}
        theme={businessErrorTheme(theme)}
        homeHref="/"
        showRetry
      />
    );
  }

  if (gatewayTimeout) {
    return <BusinessGatewayTimeoutPage authenticated />;
  }

  if (authenticationInvalid) {
    redirect("/business/login");
  }

  if (accessForbidden) {
    const theme = await fetchAuthenticatedBusinessTheme();
    return (
      <ErrorPage
        {...ERROR_PAGE_COPY.forbidden}
        theme={businessErrorTheme(theme)}
        homeHref="/"
      />
    );
  }

  if (!currentUser) {
    redirect("/business/login");
  }

  let initialLinktrees: InitialLinktree[] = [];

  try {
    const canReadLinktrees =
      effectiveAccess?.permissions["business:linktrees:read"]?.outcome ===
      "allow";
    if (canReadLinktrees && linktreesResponse?.ok) {
      const linktreesData = await linktreesResponse.json();
      initialLinktrees = Array.isArray(linktreesData.data)
        ? linktreesData.data
        : [];
    } else if (canReadLinktrees && linktreesResponse) {
      console.error(
        `[BusinessDashboardLayout] Fetching linktrees failed with status ${linktreesResponse.status} (subdomain: "${subdomain}")`,
      );
    }
  } catch (error) {
    console.error(
      `[BusinessDashboardLayout] Error fetching initial linktrees (subdomain: "${subdomain}"):`,
      error,
    );
  }

  return (
    <>
      {impersonation && (
        <BusinessImpersonationBanner
          businessName={currentUser.name}
          platformAdminName={impersonation.platform_admin_name}
        />
      )}
      <BusinessDashboard
        initialLinktrees={initialLinktrees}
        currentUsername={currentUser.username}
        businessName={currentUser.name}
        businessPhone={currentUser.phone}
        businessLogo={currentUser.logo}
        businessFavicon={currentUser.favicon}
        websiteColor={currentUser.website_color}
        businessDefaults={{
          default_footer_text: currentUser.default_footer_text,
          default_footer_phone: currentUser.default_footer_phone,
          default_template: currentUser.default_template,
          default_background_color: currentUser.default_background_color,
          default_footer_hidden: currentUser.default_footer_hidden,
          default_whatsapp_enabled: currentUser.default_whatsapp_enabled,
          default_avatar: currentUser.default_avatar,
        }}
        effectiveAccess={effectiveAccess}
        onboardingRequired={currentUser.onboarding_required}
        onboardingStep={currentUser.onboarding_step}
      />
      {children}
    </>
  );
}
