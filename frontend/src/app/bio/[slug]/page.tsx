import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicMiniWebsite } from "@/features/mini-website/PublicMiniWebsite";
import type { MiniWebsite } from "@/features/mini-website/types";
import { BusinessServiceUnavailablePage } from "@/components/error-pages/BusinessServiceUnavailablePage";
import { BusinessGonePage } from "@/components/error-pages/BusinessGonePage";
import { BusinessBadGatewayPage } from "@/components/error-pages/BusinessBadGatewayPage";
import { BusinessGatewayTimeoutPage } from "@/components/error-pages/BusinessGatewayTimeoutPage";
import { classifyUpstreamFailure } from "@/lib/api/upstream-failure";
import { shortTabTitle } from "@/lib/utils/tab-title";

export const dynamic = "force-dynamic";

async function load(
  slug: string,
): Promise<
  | { profile: MiniWebsite; subdomain: string }
  | "bad-gateway"
  | "gone"
  | "gateway-timeout"
  | "service-unavailable"
  | null
> {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost")
    .split(":")[0]
    .toLowerCase();
  const subdomain = hostname.endsWith(`.${root}`)
    ? hostname.slice(0, -(root.length + 1)).split(".")[0]
    : "";
  if (!subdomain) return null;
  const backend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  let response: Response;
  try {
    response = await fetch(
      `${backend}/api/public/mini-websites/${encodeURIComponent(subdomain)}/${encodeURIComponent(slug)}`,
      { cache: "no-store", signal: AbortSignal.timeout(30_000) },
    );
  } catch (error) {
    return classifyUpstreamFailure(error).status === 504
      ? "gateway-timeout"
      : "service-unavailable";
  }
  if (response.status === 410) return "gone";
  if (response.status === 502) return "bad-gateway";
  if (response.status === 503) return "service-unavailable";
  if (response.status === 504) return "gateway-timeout";
  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.data ? { profile: payload.data, subdomain } : null;
}

export default async function BusinessBioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await load(slug);
  if (result === "service-unavailable") {
    return <BusinessServiceUnavailablePage />;
  }
  if (result === "bad-gateway") {
    return <BusinessBadGatewayPage />;
  }
  if (result === "gateway-timeout") {
    return <BusinessGatewayTimeoutPage />;
  }
  if (result === "gone") {
    return <BusinessGonePage />;
  }
  if (!result) notFound();
  return (
    <PublicMiniWebsite profile={result.profile} subdomain={result.subdomain} />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await load(slug);
  if (result === "service-unavailable") {
    return { title: "Unavailable" };
  }
  if (result === "bad-gateway") return { title: "Upstream Error" };
  if (result === "gateway-timeout") return { title: "Timeout" };
  if (result === "gone") return { title: "Gone" };
  if (!result) return { title: "Not Found" };
  return {
    title: shortTabTitle(result.profile.name),
    description: result.profile.headline || result.profile.bio,
    openGraph: {
      title: result.profile.name,
      description: result.profile.headline || result.profile.bio,
      images:
        result.profile.cover || result.profile.avatar
          ? [result.profile.cover || result.profile.avatar]
          : [],
    },
  };
}
