export type LinktreeHostScope = {
  isPlatformRoot: boolean;
  subdomain: string;
};

/** Separates root-owned pages from tenant subdomains before choosing an API. */
export function resolveLinktreeHost(
  hostname: string,
  rootDomain: string,
): LinktreeHostScope {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const root = rootDomain.toLowerCase().replace(/^www\./, "");
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
  const isPlatformRoot = isIp || host === "localhost" || host === root;
  const subdomain =
    !isPlatformRoot && host.endsWith(`.${root}`)
      ? host.slice(0, -(root.length + 1)).split(".")[0]
      : "";
  return { isPlatformRoot, subdomain };
}
