import { headers } from "next/headers";
import { SkeletonPublicLandingPage } from "@/components/shared/Skeleton";
import { extractSubdomain } from "@/lib/subdomain-utils";

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost")
  .split(":")[0]
  .toLowerCase();

export default async function Loading() {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const isRoot =
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    ["localhost", "lvh.me", ROOT_DOMAIN, `www.${ROOT_DOMAIN}`].includes(
      hostname,
    );
  const subdomain = isRoot
    ? null
    : extractSubdomain(host, undefined, ROOT_DOMAIN);

  return (
    <SkeletonPublicLandingPage variant={subdomain ? "business" : "platform"} />
  );
}
